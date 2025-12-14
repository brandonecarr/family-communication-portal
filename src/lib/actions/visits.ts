"use server";

import { createClient, createServiceClient } from "../../../supabase/server";
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

export async function getVisits(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
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
  
  // Filter by agency if user belongs to one
  if (agencyId) {
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
