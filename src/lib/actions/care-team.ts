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

export async function getCareTeamMembers(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty care team list");
    return [];
  }
  
  let query = supabase
    .from("care_team_members")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  
  if (patientId) {
    query = query.eq("patient_id", patientId);
  }
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
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
