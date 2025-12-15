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

export async function getPatients() {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency if user belongs to one (non-super-admin)
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getPatient(patientId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createPatient(patientData: {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  status?: string;
  admission_date?: string;
  primary_diagnosis?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id to associate patient with
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...patientData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  
  return data;
}

export async function updatePatient(
  patientId: string,
  patientData: Partial<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
    status: string;
    admission_date: string;
    primary_diagnosis: string;
    address: string;
    phone: string;
    email: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    notes: string;
  }>
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("patients")
    .update({ ...patientData, updated_at: new Date().toISOString() })
    .eq("id", patientId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
  
  return data;
}

export async function deletePatient(patientId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId);
  
  if (error) throw error;
  
  revalidatePath("/admin/patients");
}

// Wrapper function that returns result object (for dialog component)
export async function inviteFamilyMember(formData: FormData) {
  try {
    await inviteFamilyMemberAction(formData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to invite family member" };
  }
}

// Form action that redirects with error/success messages (for form action usage)
export async function inviteFamilyMemberAction(formData: FormData) {
  const supabase = createServiceClient();
  
  const patient_id = formData.get("patient_id") as string;
  const redirectTo = formData.get("redirectTo") as string || "/admin/family-access";
  
  // Helper to build redirect URL with error
  const redirectWithError = (errorMessage: string) => {
    const url = new URL(redirectTo, "http://localhost");
    url.searchParams.set("invite", "open");
    url.searchParams.set("error", errorMessage);
    if (patient_id) url.searchParams.set("patient", patient_id);
    redirect(url.pathname + url.search);
  };
  
  if (!supabase) {
    redirectWithError("Service client not available");
    return;
  }
  
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string | null;
  const role = formData.get("role") as string;
  const relationship = formData.get("relationship") as string;
  
  // Check for duplicate email
  const { data: emailExists } = await supabase
    .from("family_members")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("email", email)
    .maybeSingle();
  
  if (emailExists) {
    redirectWithError("A family member with this email already exists for this patient");
    return;
  }
  
  // Check for duplicate name
  const { data: nameExists } = await supabase
    .from("family_members")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("name", name)
    .maybeSingle();
  
  if (nameExists) {
    redirectWithError("A family member with this name already exists for this patient");
    return;
  }
  
  // Check for duplicate phone (if provided)
  if (phone) {
    const { data: phoneExists } = await supabase
      .from("family_members")
      .select("id")
      .eq("patient_id", patient_id)
      .eq("phone", phone)
      .maybeSingle();
    
    if (phoneExists) {
      redirectWithError("A family member with this phone number already exists for this patient");
      return;
    }
  }
  
  const { data, error } = await supabase
    .from("family_members")
    .insert({
      patient_id,
      name,
      email,
      phone: phone || null,
      role,
      relationship,
      status: "invited",
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error inviting family member:", error);
    redirectWithError(error.message || "Failed to invite family member");
    return;
  }
  
  revalidatePath(`/admin/patients/${patient_id}`);
  revalidatePath("/admin/family-access");
  
  // Redirect with success message
  const successUrl = new URL(redirectTo, "http://localhost");
  successUrl.searchParams.set("success", "Family member invited successfully");
  redirect(successUrl.pathname + successUrl.search);
}

export async function updateFamilyMember(formData: FormData) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const id = formData.get("id") as string;
  const patient_id = formData.get("patient_id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string | null;
  const relationship = formData.get("relationship") as string;
  
  // Check for duplicate email (excluding current record)
  const { data: emailExists } = await supabase
    .from("family_members")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("email", email)
    .neq("id", id)
    .maybeSingle();
  
  if (emailExists) {
    throw new Error("A family member with this email already exists for this patient");
  }
  
  // Check for duplicate name (excluding current record)
  const { data: nameExists } = await supabase
    .from("family_members")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("name", name)
    .neq("id", id)
    .maybeSingle();
  
  if (nameExists) {
    throw new Error("A family member with this name already exists for this patient");
  }
  
  // Check for duplicate phone (if provided, excluding current record)
  if (phone) {
    const { data: phoneExists } = await supabase
      .from("family_members")
      .select("id")
      .eq("patient_id", patient_id)
      .eq("phone", phone)
      .neq("id", id)
      .maybeSingle();
    
    if (phoneExists) {
      throw new Error("A family member with this phone number already exists for this patient");
    }
  }
  
  const { data, error } = await supabase
    .from("family_members")
    .update({
      name,
      email,
      phone: phone || null,
      relationship,
    })
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating family member:", error);
    throw new Error(error.message || "Failed to update family member");
  }
  
  revalidatePath(`/admin/patients/${patient_id}`);
  
  return { success: true, data };
}

export async function deleteFamilyMember(id: string, patient_id: string) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Service client not available");
  }
  
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting family member:", error);
    throw new Error(error.message || "Failed to delete family member");
  }
  
  revalidatePath(`/admin/patients/${patient_id}`);
  
  return { success: true };
}
