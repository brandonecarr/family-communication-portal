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

export async function getFeedback(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("feedback")
    .select(`
      *, 
      visits(*),
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

export async function submitFeedback(feedbackData: {
  patient_id: string;
  visit_id?: string;
  submitted_by_name: string;
  rating: number;
  comment?: string;
  category?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("feedback")
    .insert(feedbackData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/feedback");
  revalidatePath("/family");
  
  return data;
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: string,
  assignedToName?: string
) {
  const supabase = await createClient();
  
  const updateData: any = { status };
  
  if (assignedToName) updateData.assigned_to_name = assignedToName;
  if (status === "resolved") updateData.resolved_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("feedback")
    .update(updateData)
    .eq("id", feedbackId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/feedback");
  
  return data;
}

export async function deleteFeedback(feedbackId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("feedback")
    .delete()
    .eq("id", feedbackId);
  
  if (error) throw error;
  
  revalidatePath("/admin/feedback");
}
