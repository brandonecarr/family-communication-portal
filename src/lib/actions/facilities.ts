"use server";

import { createClient, createServiceClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/utils";

// Ensure agency_users record exists for a user (used during onboarding)
export async function ensureAgencyUserRecord(
  userId: string,
  agencyId: string,
  role: "agency_admin" | "agency_staff" = "agency_admin"
) {
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { success: false, error: "Service client not available" };
  }

  // Check if record already exists
  const { data: existing } = await serviceClient
    .from("agency_users")
    .select("id")
    .eq("user_id", userId)
    .eq("agency_id", agencyId)
    .single();

  if (existing) {
    return { success: true, existing: true };
  }

  // Create the record
  const { error } = await serviceClient
    .from("agency_users")
    .insert({
      user_id: userId,
      agency_id: agencyId,
      role,
    });

  if (error) {
    console.error("Error creating agency_users record:", error);
    return { success: false, error: error.message };
  }

  return { success: true, existing: false };
}

export async function getFacilities() {
  const supabase = await createClient();
  
  const { data: facilities, error } = await supabase
    .from("agencies")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching facilities:", error);
    return { data: null, error: error.message };
  }

  return { data: facilities, error: null };
}

export async function getFacilityById(id: string) {
  const supabase = await createClient();
  
  const { data: facility, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching facility:", error);
    return { data: null, error: error.message };
  }

  return { data: facility, error: null };
}

export async function createFacility(formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const adminEmail = formData.get("admin_email") as string;
  const adminName = formData.get("admin_name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const zip_code = formData.get("zip_code") as string;
  const subscription_tier = formData.get("subscription_tier") as string || "1-25";
  const max_patients = parseInt(formData.get("max_patients") as string) || 25;

  // Create the facility first
  const { data: facility, error: facilityError } = await supabase
    .from("agencies")
    .insert({
      name,
      email: email || adminEmail,
      phone,
      address,
      city,
      state,
      zip_code,
      subscription_tier,
      max_patients,
      status: "active",
      onboarding_completed: false,
    })
    .select()
    .single();

  if (facilityError) {
    console.error("Error creating facility:", facilityError);
    return { data: null, error: facilityError.message };
  }

  // If admin email is provided, create an invite and send magic link
  if (adminEmail) {
    // Generate a unique token for the invite
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Get current user for created_by
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Create the facility invite record
    const { error: inviteError } = await supabase
      .from("facility_invites")
      .insert({
        agency_id: facility.id,
        email: adminEmail,
        role: "agency_admin",
        token,
        expires_at: expiresAt.toISOString(),
        created_by: currentUser?.id,
      });

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
    }

    // Use generateLink to get the OTP token, then construct our own URL
    const origin = getSiteUrl();
    
    const serviceClient = createServiceClient();
    if (serviceClient) {
      // First create the user with admin API
      const { error: createError } = await serviceClient.auth.admin.createUser({
        email: adminEmail,
        email_confirm: false, // Don't confirm yet - they need to click the link
        user_metadata: {
          full_name: adminName || name + " Admin",
          role: "agency_admin",
          agency_id: facility.id,
          needs_password_setup: true,
        },
      });

      if (createError && !createError.message.includes("already been registered")) {
        console.error("Error creating user:", createError);
      }
      
      // Generate an invite link to get the OTP token
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: "invite",
        email: adminEmail,
        options: {
          data: {
            full_name: adminName || name + " Admin",
            role: "agency_admin",
            agency_id: facility.id,
            needs_password_setup: true,
          },
        },
      });

      if (linkError) {
        console.error("Error generating link:", linkError);
      } else if (linkData?.properties?.hashed_token) {
        // Build our custom URL with the hashed_token as the code
        const setupUrl = `${origin}/facility-setup?code=${linkData.properties.hashed_token}&facility=${facility.id}&token=${token}`;
        
        console.log("=== FACILITY INVITE ===");
        console.log("Setup URL:", setupUrl);
        console.log("=======================");
        
        // Store the setup URL in the facility_invites table
        await supabase
          .from("facility_invites")
          .update({ 
            setup_url: setupUrl,
          })
          .eq("agency_id", facility.id)
          .eq("email", adminEmail);
          
        // Send email automatically via Supabase edge function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/supabase-functions-send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                to: adminEmail,
                subject: `Welcome to ${name} - Complete Your Setup`,
                htmlContent: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2D2D2D;">Welcome to ${name}!</h1>
                    <p style="color: #2D2D2D; font-size: 16px;">You have been invited as the administrator for <strong>${name}</strong>.</p>
                    <p style="color: #2D2D2D; font-size: 16px;">Click the link below to set up your account:</p>
                    <p style="margin: 24px 0;">
                      <a href="${setupUrl}" style="background-color: #7A9B8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Setup</a>
                    </p>
                    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                    <p style="color: #7A9B8E; font-size: 14px; word-break: break-all;">${setupUrl}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 32px;"><strong>Important:</strong> This link is valid for 1 hour. If it expires, you can request a new invitation from your administrator.</p>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error("Error sending email:", emailErr);
          }
        }
      }
    } else {
      console.error("Service client not available for sending invite");
    }

    // Update facility with pending admin info
    await supabase
      .from("agencies")
      .update({ 
        admin_email_pending: adminEmail,
      })
      .eq("id", facility.id);
  }

  revalidatePath("/super-admin");
  return { data: facility, error: null };
}

export async function updateFacility(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const zip_code = formData.get("zip_code") as string;
  const status = formData.get("status") as string;
  const subscription_tier = formData.get("subscription_tier") as string;
  const max_patients = parseInt(formData.get("max_patients") as string) || 25;
  const admin_email_pending = formData.get("admin_email_pending") as string;

  const updateData: any = {
    name,
    email,
    phone,
    address,
    city,
    state,
    zip_code,
    status,
    subscription_tier,
    max_patients,
    updated_at: new Date().toISOString(),
  };

  // Only update admin_email_pending if it was provided
  if (admin_email_pending !== undefined && admin_email_pending !== null) {
    updateData.admin_email_pending = admin_email_pending;
  }

  const { data, error } = await supabase
    .from("agencies")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating facility:", error);
    return { data: null, error: error.message };
  }

  // If admin_email_pending was changed, update the facility_invites table
  if (admin_email_pending && admin_email_pending.trim() !== "") {
    const serviceClient = createServiceClient();
    if (serviceClient) {
      // Update the email in facility_invites table
      await serviceClient
        .from("facility_invites")
        .update({ email: admin_email_pending })
        .eq("agency_id", id)
        .is("accepted_at", null); // Only update pending invites
    }
  }

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/facilities/${id}`);
  return { data, error: null };
}

export async function deleteFacility(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("agencies")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting facility:", error);
    return { error: error.message };
  }

  revalidatePath("/super-admin");
  return { error: null };
}

export async function getFacilityStats(facilityId: string) {
  const supabase = await createClient();
  
  const [patientsResult, staffResult, familyResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact" })
      .eq("agency_id", facilityId),
    supabase
      .from("agency_users")
      .select("id", { count: "exact" })
      .eq("agency_id", facilityId),
    supabase
      .from("family_members")
      .select("id, patient:patient_id!inner(agency_id)", { count: "exact" })
      .eq("patient.agency_id", facilityId),
  ]);

  return {
    patients: patientsResult.count || 0,
    staff: staffResult.count || 0,
    familyMembers: familyResult.count || 0,
  };
}

export async function getFacilityStaff(facilityId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("agency_users")
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .eq("agency_id", facilityId);

  if (error) {
    console.error("Error fetching facility staff:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getFacilityPatients(facilityId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("agency_id", facilityId)
    .order("name");

  if (error) {
    console.error("Error fetching facility patients:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getFacilityFamilyMembers(facilityId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("family_members")
    .select(`
      *,
      patient:patient_id!inner (
        id,
        name,
        agency_id
      )
    `)
    .eq("patient.agency_id", facilityId);

  if (error) {
    console.error("Error fetching facility family members:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function addStaffToFacility(facilityId: string, formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get("email") as string;
  const role = formData.get("role") as string || "agency_staff";

  // First check if user exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!existingUser) {
    return { data: null, error: "User with this email does not exist. They must sign up first." };
  }

  // Check if already assigned to this facility
  const { data: existingAssignment } = await supabase
    .from("agency_users")
    .select("id")
    .eq("agency_id", facilityId)
    .eq("user_id", existingUser.id)
    .single();

  if (existingAssignment) {
    return { data: null, error: "User is already assigned to this facility." };
  }

  const { data, error } = await supabase
    .from("agency_users")
    .insert({
      agency_id: facilityId,
      user_id: existingUser.id,
      role: role as "agency_admin" | "agency_staff",
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding staff to facility:", error);
    return { data: null, error: error.message };
  }

  revalidatePath(`/super-admin/facilities/${facilityId}`);
  return { data, error: null };
}

export async function removeStaffFromFacility(facilityId: string, userId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("agency_users")
    .delete()
    .eq("agency_id", facilityId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing staff from facility:", error);
    return { error: error.message };
  }

  revalidatePath(`/super-admin/facilities/${facilityId}`);
  return { error: null };
}

export async function resendFacilityInvite(facilityId: string) {
  const supabase = await createClient();
  
  // Get facility with pending admin email
  const { data: facility, error: facilityError } = await supabase
    .from("agencies")
    .select("name, admin_email_pending, email")
    .eq("id", facilityId)
    .single();

  if (facilityError) {
    return { error: "Facility not found" };
  }

  // Use admin_email_pending if available, otherwise use facility email
  const adminEmail = facility.admin_email_pending || facility.email;
  
  if (!adminEmail) {
    return { error: "No admin email found for this facility. Please edit the facility and add an admin email." };
  }

  // Generate a new token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Get current user
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Check if invite already exists
  const { data: existingInvite } = await supabase
    .from("facility_invites")
    .select("id")
    .eq("agency_id", facilityId)
    .eq("email", adminEmail)
    .single();

  if (existingInvite) {
    // Update existing invite - reset status to pending and clear accepted_at
    const { error: updateError } = await supabase
      .from("facility_invites")
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        created_by: currentUser?.id,
        accepted_at: null,
        status: "pending", // Reset status to pending when resending
      })
      .eq("id", existingInvite.id);

    if (updateError) {
      console.error("Error updating invite:", updateError);
    }
  } else {
    // Create new invite
    const { error: insertError } = await supabase
      .from("facility_invites")
      .insert({
        agency_id: facilityId,
        email: adminEmail,
        role: "agency_admin",
        token,
        expires_at: expiresAt.toISOString(),
        created_by: currentUser?.id,
      });

    if (insertError) {
      console.error("Error creating invite:", insertError);
    }
  }

  // Use generateLink to get the OTP token, then construct our own URL
  const origin = getSiteUrl();
  
  const serviceClient = createServiceClient();
  if (serviceClient) {
    // First, check if user exists in auth
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
    
    let linkData;
    let linkError;
    
    if (existingUser) {
      // User exists - delete and recreate to get a fresh invite token
      // This ensures the new invite link will work even if the old one expired
      console.log(`[RESEND] User ${adminEmail} exists (id: ${existingUser.id}), deleting and recreating for fresh invite`);
      
      // Delete the existing user from auth
      const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(existingUser.id);
      if (deleteAuthError) {
        console.error(`[RESEND] Error deleting auth user:`, deleteAuthError);
      }
      
      // Also delete from users table if exists
      const { error: deleteUserError } = await supabase
        .from("users")
        .delete()
        .eq("id", existingUser.id);
      if (deleteUserError) {
        console.error(`[RESEND] Error deleting from users table:`, deleteUserError);
      }
      
      // Wait a moment for deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a fresh invite
      console.log(`[RESEND] Creating fresh invite for ${adminEmail}`);
      const result = await serviceClient.auth.admin.generateLink({
        type: "invite",
        email: adminEmail,
        options: {
          data: {
            role: "agency_admin",
            agency_id: facilityId,
            needs_password_setup: true,
          },
        },
      });
      linkData = result.data;
      linkError = result.error;
      
      if (linkError) {
        console.error(`[RESEND] Error generating invite link:`, linkError);
      } else {
        console.log(`[RESEND] Successfully generated new invite link for ${adminEmail}`);
      }
    } else {
      // User doesn't exist - use invite type to create them
      console.log(`[RESEND] User ${adminEmail} does not exist, creating fresh invite`);
      const result = await serviceClient.auth.admin.generateLink({
        type: "invite",
        email: adminEmail,
        options: {
          data: {
            role: "agency_admin",
            agency_id: facilityId,
            needs_password_setup: true,
          },
        },
      });
      linkData = result.data;
      linkError = result.error;
      
      if (linkError) {
        console.error(`[RESEND] Error generating invite link:`, linkError);
      } else {
        console.log(`[RESEND] Successfully generated invite link for ${adminEmail}`);
      }
    }

    if (linkError) {
      console.error("Error generating link:", linkError);
      return { error: linkError.message };
    } else if (linkData?.properties?.hashed_token) {
      // Build our custom URL with the hashed_token as the code
      const setupUrl = `${origin}/facility-setup?code=${linkData.properties.hashed_token}&facility=${facilityId}&token=${token}`;
      
      console.log("=== RESEND FACILITY INVITE ===");
      console.log("Setup URL:", setupUrl);
      console.log("==============================");
      
      // Store the setup URL in the facility_invites table
      await supabase
        .from("facility_invites")
        .update({ 
          setup_url: setupUrl,
        })
        .eq("agency_id", facilityId)
        .eq("email", adminEmail);
        
      // Send email automatically via Supabase edge function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/supabase-functions-send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              to: adminEmail,
              subject: `Welcome to ${facility.name} - Complete Your Setup`,
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2D2D2D;">Welcome to ${facility.name}!</h1>
                  <p style="color: #2D2D2D; font-size: 16px;">You have been invited as the administrator for <strong>${facility.name}</strong>.</p>
                  <p style="color: #2D2D2D; font-size: 16px;">Click the link below to set up your account:</p>
                  <p style="margin: 24px 0;">
                    <a href="${setupUrl}" style="background-color: #7A9B8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Setup</a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                  <p style="color: #7A9B8E; font-size: 14px; word-break: break-all;">${setupUrl}</p>
                  <p style="color: #999; font-size: 12px; margin-top: 32px;"><strong>Important:</strong> This link is valid for 1 hour. If it expires, you can request a new invitation from your administrator.</p>
                </div>
              `,
            }),
          });
          
          if (!emailResponse.ok) {
            console.error("Email send failed:", await emailResponse.text());
          } else {
            console.log("Email sent successfully to:", adminEmail);
          }
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
        }
      }
    }
  } else {
    return { error: "Service client not available" };
  }

  // Update facility with pending admin email if not already set
  if (!facility.admin_email_pending) {
    await supabase
      .from("agencies")
      .update({ admin_email_pending: adminEmail })
      .eq("id", facilityId);
  }

  revalidatePath(`/super-admin/facilities/${facilityId}`);
  return { error: null, success: true };
}

export async function inviteStaffMembers(staffMembers: Array<{ name: string; email: string; role: string }>, facilityId: string) {
  const { createServiceClient } = await import("../../../supabase/server");
  const supabase = createServiceClient();
  
  if (!supabase) {
    return { success: false, error: "Service client not available" };
  }
  
  const origin = getSiteUrl();
  const results = [];
  
  // Get facility name for the email
  const { data: facility } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", facilityId)
    .single();
  
  const agencyName = facility?.name || "the agency";
  
  for (const staff of staffMembers) {
    try {
      // Use generateLink instead of inviteUserByEmail to get the token
      // This allows us to send the email ourselves with the correct URL
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "invite",
        email: staff.email,
        options: {
          data: {
            full_name: staff.name,
            role: staff.role,
            agency_id: facilityId,
            needs_password_setup: true,
          },
          redirectTo: `${origin}/accept-invite?facility=${facilityId}`,
        },
      });

      if (linkError) {
        console.error(`Error generating invite link for ${staff.email}:`, linkError);
        results.push({ email: staff.email, success: false, error: linkError.message });
        continue;
      }

      // Create user record in users table
      if (linkData.user) {
        const { error: userError } = await supabase
          .from("users")
          .insert({
            id: linkData.user.id,
            email: staff.email,
            full_name: staff.name,
            role: staff.role,
            agency_id: facilityId,
            onboarding_completed: false,
          });

        if (userError) {
          console.error(`Error creating user record for ${staff.email}:`, userError);
        }

        // Create agency_users relationship
        const { error: agencyUserError } = await supabase
          .from("agency_users")
          .insert({
            user_id: linkData.user.id,
            agency_id: facilityId,
            role: staff.role,
          });

        if (agencyUserError) {
          console.error(`Error creating agency_users record for ${staff.email}:`, agencyUserError);
        }
      }

      // Extract the hashed_token from the generated link
      const hashedToken = linkData.properties?.hashed_token;
      
      if (!hashedToken) {
        console.error(`No hashed_token in link data for ${staff.email}`);
        results.push({ email: staff.email, success: false, error: "Failed to generate invite token" });
        continue;
      }

      // Create a record in team_invitations table for tracking
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
      
      const { error: invitationError } = await supabase
        .from("team_invitations")
        .insert({
          email: staff.email,
          role: staff.role,
          agency_id: facilityId,
          token: hashedToken,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          invited_by_name: agencyName, // Using agency name as inviter
        });

      if (invitationError) {
        console.error(`Error creating team_invitations record for ${staff.email}:`, invitationError);
        // Continue anyway - the user record is created
      }

      // Build the invite URL with our custom domain
      const inviteUrl = `${origin}/accept-invite?code=${hashedToken}&facility=${facilityId}&email=${encodeURIComponent(staff.email)}`;
      
      // Send the email using our edge function
      const { error: emailError } = await supabase.functions.invoke('supabase-functions-send-email', {
        body: {
          to: staff.email,
          subject: `You're invited to join ${agencyName}`,
          htmlContent: generateStaffInviteEmail({
            staffName: staff.name,
            agencyName,
            role: staff.role,
            inviteUrl,
          }),
        },
      });

      if (emailError) {
        console.error(`Error sending invite email to ${staff.email}:`, emailError);
        results.push({ email: staff.email, success: false, error: "Failed to send invite email" });
        continue;
      }

      results.push({ email: staff.email, success: true });
    } catch (err: any) {
      console.error(`Error inviting ${staff.email}:`, err);
      results.push({ email: staff.email, success: false, error: err.message });
    }
  }

  return { results };
}

function generateStaffInviteEmail({ staffName, agencyName, role, inviteUrl }: { staffName: string; agencyName: string; role: string; inviteUrl: string }) {
  const roleLabel = role === 'agency_admin' ? 'Administrator' : 'Staff Member';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FAF8F5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 48px 40px;">
              <h1 style="color: #2D2D2D; font-family: 'Fraunces', Georgia, serif; font-size: 28px; font-weight: 600; margin: 0 0 24px; text-align: center;">
                You're Invited!
              </h1>
              <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hello${staffName ? ` ${staffName}` : ''},
              </p>
              <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                You've been invited to join <strong>${agencyName}</strong> as a <strong>${roleLabel}</strong> on our Family Communication Portal.
              </p>
              <p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Click the button below to accept your invitation and set up your account:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #7A9B8E; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="color: #6B6B6B; font-size: 12px; line-height: 1.6; margin: 24px 0 0; text-align: center; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #7A9B8E;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
