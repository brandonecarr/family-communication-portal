"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Handle auth errors (invalid/expired refresh token)
    if (authError || !user) {
      console.warn("Auth error or no user:", authError?.message);
      return { agencyId: null, isSuperAdmin: false };
    }
    
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
  } catch (error: any) {
    // Handle refresh token errors gracefully
    console.warn("Error getting user agency and role:", error?.message);
    return { agencyId: null, isSuperAdmin: false };
  }
}

// Legacy helper for backward compatibility
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const { agencyId } = await getUserAgencyAndRole(supabase);
  return agencyId;
}

export async function getIntegrations() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty integrations list");
    return [];
  }
  
  let query = supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function createIntegration(integrationData: {
  name: string;
  type: string;
  config?: any;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id to associate integration with
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const { data, error } = await supabase
    .from("integrations")
    .insert({ ...integrationData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/integrations");
  
  return data;
}

export async function updateIntegrationStatus(
  integrationId: string,
  status: string,
  syncStatus?: string,
  errorLog?: string
) {
  const supabase = await createClient();
  
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  };
  
  if (syncStatus) updateData.sync_status = syncStatus;
  if (errorLog) updateData.error_log = errorLog;
  if (status === "active") updateData.last_sync = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("integrations")
    .update(updateData)
    .eq("id", integrationId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/integrations");
  
  return data;
}

export async function deleteIntegration(integrationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("id", integrationId);
  
  if (error) throw error;
  
  revalidatePath("/admin/integrations");
}

export async function getWebhooks() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createWebhook(webhookData: {
  event: string;
  url: string;
  secret?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("webhooks")
    .insert(webhookData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
  
  return data;
}

export async function updateWebhookStatus(
  webhookId: string,
  status: string
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("webhooks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", webhookId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
  
  return data;
}

export async function deleteWebhook(webhookId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", webhookId);
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
}
