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

export async function getDeliveries(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty deliveries list");
    return [];
  }
  
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
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
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
  tracking_url?: string;
  status?: string;
  estimated_delivery?: string;
  notes?: string;
  supply_request_id?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("deliveries")
    .insert(deliveryData)
    .select()
    .single();
  
  if (error) throw error;
  
  // Register tracking number with 17track for push notifications
  if (data && (deliveryData.tracking_url || deliveryData.tracking_number)) {
    try {
      const { registerTrackingNumber } = await import("./tracking");
      await registerTrackingNumber(
        deliveryData.tracking_number || "",
        deliveryData.tracking_url || "",
        data.id
      );
    } catch (trackingError) {
      console.error("Failed to register tracking number:", trackingError);
      // Don't fail the delivery creation if tracking registration fails
    }
  }
  
  // Archive the supply request if delivery is shipped and has a supply_request_id
  if (deliveryData.supply_request_id && deliveryData.status === "shipped") {
    await supabase
      .from("supply_requests")
      .update({ 
        status: "archived",
        updated_at: new Date().toISOString() 
      })
      .eq("id", deliveryData.supply_request_id);
  }
  
  revalidatePath("/admin/deliveries");
  revalidatePath("/family/deliveries");
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  
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
  
  // Archive the supply request if delivery status changes to shipped
  if (status === "shipped" && data?.supply_request_id) {
    await supabase
      .from("supply_requests")
      .update({ 
        status: "archived",
        updated_at: new Date().toISOString() 
      })
      .eq("id", data.supply_request_id);
    
    revalidatePath("/admin/supplies");
    revalidatePath("/family/supplies");
  }
  
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return 0;

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
