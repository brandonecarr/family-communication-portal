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
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("supply_requests")
    .update({ 
      status: "archived",
      updated_at: new Date().toISOString() 
    })
    .eq("id", requestId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/supplies");
  revalidatePath("/family/supplies");
  revalidatePath("/family/deliveries");
  
  return data;
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
