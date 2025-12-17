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

export async function getOnboardingProgress() {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("onboarding_progress")
    .select("*");
  
  // Filter by agency if user belongs to one
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query.single();
  
  if (error && error.code !== "PGRST116") throw error;
  
  if (!data) {
    const { data: newProgress, error: createError } = await supabase
      .from("onboarding_progress")
      .insert({
        steps_completed: [],
        current_step: 1,
        completed: false,
        agency_id: agencyId,
      })
      .select()
      .single();
    
    if (createError) throw createError;
    return newProgress;
  }
  
  return data;
}

export async function updateOnboardingProgress(
  stepNumber: number,
  completed: boolean = true
) {
  const supabase = await createClient();
  
  const progress = await getOnboardingProgress();
  
  const stepsCompleted = progress.steps_completed || [];
  if (completed && !stepsCompleted.includes(stepNumber)) {
    stepsCompleted.push(stepNumber);
  }
  
  const allStepsCompleted = stepsCompleted.length >= 6;
  
  const { data, error } = await supabase
    .from("onboarding_progress")
    .update({
      steps_completed: stepsCompleted,
      current_step: completed ? stepNumber + 1 : stepNumber,
      completed: allStepsCompleted,
      completed_at: allStepsCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", progress.id)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/onboarding");
  
  return data;
}

export async function resetOnboarding() {
  const supabase = await createClient();
  
  const progress = await getOnboardingProgress();
  
  const { data, error } = await supabase
    .from("onboarding_progress")
    .update({
      steps_completed: [],
      current_step: 1,
      completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", progress.id)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/onboarding");
  
  return data;
}
