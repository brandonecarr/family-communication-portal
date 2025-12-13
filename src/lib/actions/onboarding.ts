"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

export async function getOnboardingProgress() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("*")
    .single();
  
  if (error && error.code !== "PGRST116") throw error;
  
  if (!data) {
    const { data: newProgress, error: createError } = await supabase
      .from("onboarding_progress")
      .insert({
        steps_completed: [],
        current_step: 1,
        completed: false,
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
