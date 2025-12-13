"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

// Helper to get current user's agency_id
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();
  
  return agencyUser?.agency_id || null;
}

export async function getBrandingConfig() {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("branding_config")
    .select("*");
  
  // Filter by agency if user belongs to one
  if (agencyId) {
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
