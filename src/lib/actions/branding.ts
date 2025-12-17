"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { agencyId: null, isSuperAdmin: false };
  
  // Check if user is super_admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  
  const isSuperAdmin = userData?.role === 'super_admin';
  
  // Get agency_id from agency_users
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();
  
  return { 
    agencyId: agencyUser?.agency_id || null, 
    isSuperAdmin 
  };
}

// Legacy helper for backward compatibility
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const { agencyId } = await getUserAgencyAndRole(supabase);
  return agencyId;
}

export async function getBrandingConfig() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return null
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning null branding config");
    return null;
  }
  
  let query = supabase
    .from("branding_config")
    .select("*");
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query.single();
  
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function updateBrandingConfig(brandingData: {
  organization_name?: string;
  tagline?: string;
  support_email?: string;
  support_phone?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  logo_url?: string;
  favicon_url?: string;
  custom_domain?: string;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const existing = await getBrandingConfig();
  
  if (existing) {
    const { data, error } = await supabase
      .from("branding_config")
      .update({ ...brandingData, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath("/admin/branding");
    revalidatePath("/admin/white-label");
    
    return data;
  } else {
    const { data, error } = await supabase
      .from("branding_config")
      .insert({ ...brandingData, agency_id: agencyId })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath("/admin/branding");
    revalidatePath("/admin/white-label");
    
    return data;
  }
}
