"use server";

import { encodedRedirect } from "@/utils/utils";
import { getSiteUrl } from "@/lib/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || '';
  const adminCode = formData.get("admin_code")?.toString();
  const supabase = await createClient();
  const origin = getSiteUrl() || headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // Determine role based on admin code
  const trimmedAdminCode = adminCode?.trim();
  const isSuperAdmin = trimmedAdminCode === "SUPER_ADMIN_MASTER_2024";
  const isAdmin = trimmedAdminCode === "HOSPICE_ADMIN_2024";
  const role = isSuperAdmin ? "super_admin" : (isAdmin ? "agency_admin" : "family_member");
  
  console.log("Admin code received:", JSON.stringify(trimmedAdminCode));
  console.log("Is admin:", isAdmin);
  console.log("Role assigned:", role);

  const { data: { user }, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        email: email,
        role: role,
      }
    },
  });

  console.log("After signUp", error);


  if (error) {
    console.error(error.code + " " + error.message);
    // Check if this is a configuration error
    if (error.message === "No Supabase credentials") {
      return encodedRedirect("error", "/sign-up", "Server configuration error. Please contact support.");
    }
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      console.log("Creating user profile with role:", role);
      
      // First try to update if exists, then insert
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: role })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating user role:', updateError);
        } else {
          console.log('Updated existing user role to:', role);
        }
      } else {
        // Insert new user
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: fullName,
            full_name: fullName,
            email: email,
            user_id: user.id,
            token_identifier: user.id,
            role: role,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting user profile:', insertError);
        } else {
          console.log('Inserted new user with role:', role);
        }
      }
    } catch (err) {
      console.error('Error in user profile creation:', err);
    }
  }

  // Redirect to dashboard - no email confirmation required
  return redirect("/dashboard");
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Check if this is a configuration error
    if (error.message === "No Supabase credentials") {
      return encodedRedirect("error", "/sign-in", "Server configuration error. Please contact support.");
    }
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Check if user needs to complete onboarding
  const user = data.user;
  if (user) {
    const needsPasswordSetup = user.user_metadata?.needs_password_setup;
    const agencyId = user.user_metadata?.agency_id;
    const userRole = user.user_metadata?.role;

    // Check for pending facility invite
    const { data: pendingInvite } = await supabase
      .from("facility_invites")
      .select("token, agency_id")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (pendingInvite) {
      return redirect(`/facility-setup?facility=${pendingInvite.agency_id}&token=${pendingInvite.token}`);
    }

    // Check if agency admin needs password setup
    if (needsPasswordSetup && agencyId && userRole === "agency_admin") {
      return redirect(`/facility-setup?facility=${agencyId}`);
    }

    // Check if staff needs to complete onboarding
    if (needsPasswordSetup && agencyId) {
      return redirect(`/accept-invite?facility=${agencyId}`);
    }
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/dashboard/reset-password`,
  });

  if (error) {
    console.error(error.message);
    // Check if this is a configuration error
    if (error.message === "No Supabase credentials") {
      return encodedRedirect("error", "/forgot-password", "Server configuration error. Please contact support.");
    }
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/dashboard/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};