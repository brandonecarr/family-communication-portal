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

export async function getSupplyRequests(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty supply requests list");
    return [];
  }
  
  let query = supabase
    .from("supply_requests")
    .select(`
      *,
      patient:patient_id (
        id,
        first_name,
        last_name,
        agency_id
      ),
      deliveries:deliveries!supply_request_id (
        id
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

export async function archiveSupplyRequest(requestId: string) {
  console.log("archiveSupplyRequest called with:", requestId, "type:", typeof requestId);
  
  // Validate that requestId is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!requestId || typeof requestId !== 'string' || requestId.trim() === '' || !uuidRegex.test(requestId)) {
    console.error("archiveSupplyRequest: Invalid requestId:", requestId, "type:", typeof requestId);
    return { error: "Invalid supply request ID format", data: null };
  }
  
  const supabase = await createClient();
  
  console.log("archiveSupplyRequest: Executing update for requestId:", requestId);
  
  const { data, error } = await supabase
    .from("supply_requests")
    .update({ 
      status: "archived",
      updated_at: new Date().toISOString() 
    })
    .eq("id", requestId)
    .select()
    .single();
  
  if (error) {
    console.error("archiveSupplyRequest: Database error:", error);
    return { error: error.message, code: error.code, data: null };
  }
  
  console.log("archiveSupplyRequest: Success, data:", data);
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  revalidatePath("/family/deliveries");
  
  return { data, error: null };
}

export interface FamilySupplyRequest {
  id: string;
  patient_id: string;
  items: Record<string, number>;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export async function getFamilySupplyRequests(): Promise<FamilySupplyRequest[]> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Return empty array instead of throwing for better UX
      return [];
    }

    // Get family member's patient_id
    const { data: familyMember, error: familyError } = await supabase
      .from("family_members")
      .select("patient_id")
      .eq("user_id", user.id)
      .single();

    if (familyError || !familyMember) {
      // User is not a family member, return empty array
      return [];
    }

    // Get supply requests for this patient
    const { data, error } = await supabase
      .from("supply_requests")
      .select("*")
      .eq("patient_id", familyMember.patient_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching supply requests:", error);
      return [];
    }

    return (data || []) as FamilySupplyRequest[];
  } catch (error) {
    console.error("Unexpected error in getFamilySupplyRequests:", error);
    return [];
  }
}

export async function dismissSupplyRequest(requestId: string) {
  const supabase = await createClient();
  
  // We'll use a "dismissed" status or just delete it
  // For now, let's delete it since it's been acknowledged
  const { error } = await supabase
    .from("supply_requests")
    .delete()
    .eq("id", requestId);
  
  if (error) throw error;
  
  revalidatePath("/family/supplies");
}

export async function approveSupplyRequest(requestId: string, approvedByName: string) {
  const supabase = await createClient();
  
  // First get the supply request details
  const { data: request, error: fetchError } = await supabase
    .from("supply_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  
  if (fetchError || !request) {
    throw new Error("Supply request not found");
  }
  
  // Update the supply request status to approved
  const { error: updateError } = await supabase
    .from("supply_requests")
    .update({ 
      status: "approved", 
      updated_at: new Date().toISOString(),
      notes: request.notes ? `${request.notes}\n\nApproved by ${approvedByName}` : `Approved by ${approvedByName}`
    })
    .eq("id", requestId);
  
  if (updateError) throw updateError;
  
  // Note: Delivery is created manually via the dialog after approval
  
  revalidatePath("/admin/supplies");
  revalidatePath("/admin/deliveries");
  revalidatePath("/family/supplies");
  revalidatePath("/family/deliveries");
  
  return request;
}

export async function rejectSupplyRequest(requestId: string, rejectedByName: string, rejectionReason: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("supply_requests")
    .update({ 
      status: "rejected", 
      updated_at: new Date().toISOString(),
      notes: `Rejected by ${rejectedByName}: ${rejectionReason}`
    })
    .eq("id", requestId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  
  return data;
}

// Inventory Management Functions

export async function getInventoryItems(agencyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("supply_catalog_items")
    .select(`
      *,
      supply_categories (name)
    `)
    .eq("agency_id", agencyId)
    .eq("track_inventory", true)
    .eq("is_active", true)
    .order("name");
  
  if (error) throw error;
  return data;
}

export async function deductInventory(
  agencyId: string,
  items: Array<{ itemName: string; quantity: number; size?: string }>,
  supplyRequestId: string,
  performedByName: string
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  for (const item of items) {
    // Find the catalog item by name
    const { data: catalogItem, error: findError } = await supabase
      .from("supply_catalog_items")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("track_inventory", true)
      .ilike("name", `%${item.itemName.replace(/_/g, " ")}%`)
      .single();
    
    if (findError || !catalogItem) {
      console.warn(`Catalog item not found for: ${item.itemName}`);
      continue;
    }
    
    let previousQuantity: number;
    let newQuantity: number;
    
    if (catalogItem.requires_size && item.size) {
      // Handle size-based inventory
      const sizeQuantities = catalogItem.size_quantities || {};
      previousQuantity = sizeQuantities[item.size] || 0;
      newQuantity = Math.max(0, previousQuantity - item.quantity);
      sizeQuantities[item.size] = newQuantity;
      
      const { error: updateError } = await supabase
        .from("supply_catalog_items")
        .update({ size_quantities: sizeQuantities })
        .eq("id", catalogItem.id);
      
      if (updateError) {
        console.error(`Error updating inventory for ${item.itemName}:`, updateError);
        continue;
      }
    } else {
      // Handle non-size inventory
      previousQuantity = catalogItem.quantity_on_hand || 0;
      newQuantity = Math.max(0, previousQuantity - item.quantity);
      
      const { error: updateError } = await supabase
        .from("supply_catalog_items")
        .update({ quantity_on_hand: newQuantity })
        .eq("id", catalogItem.id);
      
      if (updateError) {
        console.error(`Error updating inventory for ${item.itemName}:`, updateError);
        continue;
      }
    }
    
    // Record the transaction
    await supabase
      .from("inventory_transactions")
      .insert({
        agency_id: agencyId,
        catalog_item_id: catalogItem.id,
        supply_request_id: supplyRequestId,
        transaction_type: "deduct",
        quantity: -item.quantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        size: item.size || null,
        notes: `Deducted for supply request`,
        performed_by: user?.id,
        performed_by_name: performedByName,
      });
  }
  
  revalidatePath("/admin/supplies");
  return { success: true };
}

export async function addInventory(
  agencyId: string,
  catalogItemId: string,
  quantity: number,
  size: string | null,
  performedByName: string,
  notes?: string
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get current item
  const { data: catalogItem, error: findError } = await supabase
    .from("supply_catalog_items")
    .select("*")
    .eq("id", catalogItemId)
    .single();
  
  if (findError || !catalogItem) {
    throw new Error("Catalog item not found");
  }
  
  let previousQuantity: number;
  let newQuantity: number;
  
  if (catalogItem.requires_size && size) {
    const sizeQuantities = catalogItem.size_quantities || {};
    previousQuantity = sizeQuantities[size] || 0;
    newQuantity = previousQuantity + quantity;
    sizeQuantities[size] = newQuantity;
    
    const { error: updateError } = await supabase
      .from("supply_catalog_items")
      .update({ size_quantities: sizeQuantities })
      .eq("id", catalogItemId);
    
    if (updateError) throw updateError;
  } else {
    previousQuantity = catalogItem.quantity_on_hand || 0;
    newQuantity = previousQuantity + quantity;
    
    const { error: updateError } = await supabase
      .from("supply_catalog_items")
      .update({ quantity_on_hand: newQuantity })
      .eq("id", catalogItemId);
    
    if (updateError) throw updateError;
  }
  
  // Record the transaction
  await supabase
    .from("inventory_transactions")
    .insert({
      agency_id: agencyId,
      catalog_item_id: catalogItemId,
      transaction_type: "add",
      quantity: quantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      size: size,
      notes: notes || "Inventory added",
      performed_by: user?.id,
      performed_by_name: performedByName,
    });
  
  revalidatePath("/admin/supplies");
  return { success: true, newQuantity };
}
