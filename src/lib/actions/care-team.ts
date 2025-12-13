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

export async function getCareTeamMembers(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("care_team_members")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  
  if (patientId) {
    query = query.eq("patient_id", patientId);
  }
  
  // Filter by agency if user belongs to one
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function createCareTeamMember(memberData: {
  patient_id: string;
  name: string;
  role: string;
  specialty?: string;
  phone?: string;
  email?: string;
  description?: string;
  photo_url?: string;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id to associate care team member with
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const { data, error } = await supabase
    .from("care_team_members")
    .insert({ ...memberData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  revalidatePath("/family/care-team");
  
  return data;
}

export async function updateCareTeamMember(
  memberId: string,
  memberData: Partial<{
    name: string;
    role: string;
    specialty: string;
    phone: string;
    email: string;
    description: string;
    photo_url: string;
    active: boolean;
  }>
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("care_team_members")
    .update({ ...memberData, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  revalidatePath("/family/care-team");
  
  return data;
}

export async function deleteCareTeamMember(memberId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("care_team_members")
    .delete()
    .eq("id", memberId);
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  revalidatePath("/family/care-team");
}
