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

export async function getSupplyRequests(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("supply_requests")
    .select(`
      *,
      patient:patient_id (
        id,
        first_name,
        last_name,
        agency_id
      )
    `)
    .order("created_at", { ascending: false });
  
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

export async function createSupplyRequest(requestData: {
  patient_id: string;
  requested_by_name: string;
  items: any[];
  priority?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("supply_requests")
    .insert(requestData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  
  return data;
}

export async function updateSupplyRequestStatus(
  requestId: string,
  status: string,
  fulfilledByName?: string,
  notes?: string
) {
  const supabase = await createClient();
  
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  };
  
  if (fulfilledByName) updateData.fulfilled_by_name = fulfilledByName;
  if (notes) updateData.notes = notes;
  if (status === "fulfilled") updateData.fulfilled_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("supply_requests")
    .update(updateData)
    .eq("id", requestId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  
  return data;
}

export async function deleteSupplyRequest(requestId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("supply_requests")
    .delete()
    .eq("id", requestId);
  
  if (error) throw error;
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
}
