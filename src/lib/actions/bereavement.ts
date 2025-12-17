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

export async function getBereavementCampaigns() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty bereavement campaigns list");
    return [];
  }
  
  let query = supabase
    .from("bereavement_campaigns")
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

export async function createBereavementCampaign(campaignData: {
  name: string;
  description?: string;
  sequence: any[];
}) {
  const supabase = await createClient();
  
  // Get user's agency_id to associate campaign with
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const { data, error } = await supabase
    .from("bereavement_campaigns")
    .insert({ ...campaignData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/bereavement");
  
  return data;
}

export async function updateBereavementCampaign(
  campaignId: string,
  campaignData: {
    name?: string;
    description?: string;
    sequence?: any[];
    active?: boolean;
  }
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bereavement_campaigns")
    .update({ ...campaignData, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/bereavement");
  
  return data;
}

export async function deleteBereavementCampaign(campaignId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("bereavement_campaigns")
    .delete()
    .eq("id", campaignId);
  
  if (error) throw error;
  
  revalidatePath("/admin/bereavement");
}

export async function getBereavementEnrollments(campaignId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from("bereavement_enrollments")
    .select("*, bereavement_campaigns(*), patients(*)")
    .order("enrolled_at", { ascending: false });
  
  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function enrollInBereavementCampaign(enrollmentData: {
  campaign_id: string;
  patient_id: string;
  family_contact_name?: string;
  family_contact_email?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bereavement_enrollments")
    .insert(enrollmentData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/bereavement");
  
  return data;
}

export async function updateBereavementEnrollmentStatus(
  enrollmentId: string,
  status: string,
  currentStep?: number
) {
  const supabase = await createClient();
  
  const updateData: any = { status };
  
  if (currentStep !== undefined) updateData.current_step = currentStep;
  if (status === "completed") updateData.completed_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("bereavement_enrollments")
    .update(updateData)
    .eq("id", enrollmentId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/bereavement");
  
  return data;
}
