"use server";

import { createClient } from "../../../supabase/server";
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

export async function getEducationModules() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty education modules list");
    return [];
  }
  
  let query = supabase
    .from("education_modules")
    .select("*")
    .eq("published", true)
    .order("order_index", { ascending: true });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getModuleProgress(patientId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("module_progress")
    .select("*, education_modules(*)")
    .eq("patient_id", patientId);
  
  if (error) throw error;
  return data;
}

export async function createEducationModule(moduleData: {
  title: string;
  description?: string;
  content: string;
  category?: string;
  duration_minutes?: number;
  language?: string;
  order_index?: number;
  thumbnail_url?: string;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id to associate module with
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const { data, error } = await supabase
    .from("education_modules")
    .insert({ ...moduleData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/content");
  revalidatePath("/family/education");
  
  return data;
}

export async function updateModuleProgress(
  patientId: string,
  moduleId: string,
  progressPercentage: number,
  completed: boolean = false
) {
  const supabase = await createClient();
  
  const updateData: any = {
    progress_percentage: progressPercentage,
    completed,
    updated_at: new Date().toISOString(),
  };
  
  if (completed) {
    updateData.completed_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from("module_progress")
    .upsert({
      patient_id: patientId,
      module_id: moduleId,
      ...updateData,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/family/education");
  
  return data;
}

export async function deleteEducationModule(moduleId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("education_modules")
    .delete()
    .eq("id", moduleId);
  
  if (error) throw error;
  
  revalidatePath("/admin/content");
  revalidatePath("/family/education");
}
