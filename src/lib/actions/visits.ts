"use server";

import { createClient, createServiceClient } from "../../../supabase/server";
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

export async function getVisits(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty visits list");
    return [];
  }
  
  let query = supabase
    .from("visits")
    .select(`
      *,
      patient:patient_id (
        id,
        first_name,
        last_name,
        agency_id
      )
    `)
    .order("scheduled_date", { ascending: true });
  
  if (patientId) {
    query = query.eq("patient_id", patientId);
  }
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("patient.agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function createVisit(visitData: {
  patient_id: string;
  staff_name: string;
  discipline: string;
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
}) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const { data, error } = await supabase
    .from("visits")
    .insert({
      patient_id: visitData.patient_id,
      staff_name: visitData.staff_name,
      discipline: visitData.discipline,
      scheduled_date: visitData.scheduled_date,
      scheduled_time: visitData.scheduled_time || null,
      notes: visitData.notes || null,
      status: "scheduled",
    })
    .select()
    .single();
  
  if (error) {
    console.error("Create visit error:", error);
    throw new Error(error.message || "Failed to create visit");
  }
  
  revalidatePath(`/admin/patients/${visitData.patient_id}`);
  revalidatePath("/family");
  
  return data;
}

export async function updateVisitStatus(
  visitId: string,
  status: string,
  notes?: string
) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (notes) updateData.notes = notes;
  
  const { data, error } = await supabase
    .from("visits")
    .update(updateData)
    .eq("id", visitId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  revalidatePath("/family");
  
  return data;
}

export async function updateVisit(visitId: string, visitData: {
  staff_name?: string;
  discipline?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  notes?: string;
  status?: string;
}) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const { data, error } = await supabase
    .from("visits")
    .update({
      ...visitData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId)
    .select()
    .single();
  
  if (error) {
    console.error("Update visit error:", error);
    throw new Error(error.message || "Failed to update visit");
  }
  
  revalidatePath("/admin/patients");
  revalidatePath("/family");
  
  return data;
}

export async function deleteVisit(visitId: string) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId);
  
  if (error) {
    console.error("Delete visit error:", error);
    throw new Error(error.message || "Failed to delete visit");
  }
  
  revalidatePath("/admin/patients");
  revalidatePath("/family");
}

// Get upcoming visits count for family member's patient
export async function getFamilyUpcomingVisitsCount(): Promise<number> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get family member's patient_id
    const { data: familyMember, error: familyError } = await supabase
      .from("family_members")
      .select("patient_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // User might not be a family member (could be admin), return 0 silently
    if (familyError || !familyMember?.patient_id) return 0;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Count upcoming visits (scheduled for today or future)
    const { count, error } = await supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", familyMember.patient_id)
      .gte("scheduled_date", today)
      .in("status", ["scheduled", "en_route"]);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
