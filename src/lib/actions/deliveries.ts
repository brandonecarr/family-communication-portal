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

export async function getDeliveries(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("deliveries")
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

export async function createDelivery(deliveryData: {
  patient_id: string;
  item_name: string;
  carrier?: string;
  tracking_number?: string;
  status?: string;
  estimated_delivery?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("deliveries")
    .insert(deliveryData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/deliveries");
  revalidatePath("/family/deliveries");
  
  return data;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  notes?: string
) {
  const supabase = await createClient();
  
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString() 
  };
  
  if (notes) updateData.notes = notes;
  if (status === "delivered") updateData.delivered_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("deliveries")
    .update(updateData)
    .eq("id", deliveryId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/deliveries");
  revalidatePath("/family/deliveries");
  
  return data;
}

export async function deleteDelivery(deliveryId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", deliveryId);
  
  if (error) throw error;
  
  revalidatePath("/admin/deliveries");
  revalidatePath("/family/deliveries");
}

// Get pending/in-transit deliveries count for family member's patient
export async function getFamilyPendingDeliveriesCount(): Promise<number> {
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

    // Count pending/in-transit deliveries
    const { count, error } = await supabase
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .eq("patient_id", familyMember.patient_id)
      .in("status", ["ordered", "in_transit", "shipped", "out_for_delivery"]);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
