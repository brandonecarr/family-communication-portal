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

export async function getIntegrations() {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency if user belongs to one
  if (agencyId) {
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
