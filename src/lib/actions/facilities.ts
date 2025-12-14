"use server";

import { createClient, createServiceClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/utils";

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

    // Generate magic link using Admin API and send via Brevo
    const origin = getSiteUrl();
    const redirectUrl = `${origin}/facility-setup?token=${token}&facility=${facility.id}`;
    
    const serviceClient = createServiceClient();
    if (serviceClient) {
      // Use generateLink to create a magic link
      const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email: adminEmail,
        options: {
          redirectTo: redirectUrl,
          data: {
            full_name: adminName || name + " Admin",
            role: "agency_admin",
            agency_id: facility.id,
            needs_password_setup: true,
          },
        },
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
      } else if (linkData?.properties?.action_link) {
        // Send the magic link via Brevo
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
                subject: `Welcome to ${name} - Complete Your Setup`,
                template: {
                  title: `Welcome to ${name}!`,
                  preheader: "Click the link below to complete your facility administrator setup",
                  bodyContent: `<p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">You have been invited as the administrator for <strong>${name}</strong>.</p><p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0;">Click the button below to set up your account and complete the facility onboarding process.</p>`,
                  ctaButton: {
                    text: "Complete Setup",
                    url: linkData.properties.action_link,
                  },
                  footerText: "This link will expire in 24 hours. If you didn't request this, please ignore this email.",
                },
              }),
            });
            
            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error("Error sending email via Brevo:", errorText);
            }
          } catch (emailErr) {
            console.error("Error calling email function:", emailErr);
          }
        }
      }
    } else {
      // Fallback to signInWithOtp if service client not available
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: adminEmail,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: adminName || name + " Admin",
            role: "agency_admin",
            agency_id: facility.id,
            needs_password_setup: true,
          },
        },
      });

      if (otpError) {
        console.error("Error sending magic link:", otpError);
      }
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

  const { data, error } = await supabase
    .from("agencies")
    .update({
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
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating facility:", error);
    return { data: null, error: error.message };
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
    // Update existing invite
    const { error: updateError } = await supabase
      .from("facility_invites")
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        created_by: currentUser?.id,
        accepted_at: null,
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

  // Generate magic link using Admin API and send via Brevo
  const origin = getSiteUrl();
  const redirectUrl = `${origin}/facility-setup?token=${token}&facility=${facilityId}`;
  
  const serviceClient = createServiceClient();
  if (serviceClient) {
    // Use generateLink to create a magic link
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail,
      options: {
        redirectTo: redirectUrl,
        data: {
          full_name: facility.name + " Admin",
          role: "agency_admin",
          agency_id: facilityId,
          needs_password_setup: true,
        },
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      return { error: linkError.message };
    } else if (linkData?.properties?.action_link) {
      // Send the magic link via Brevo
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
              template: {
                title: `Welcome to ${facility.name}!`,
                preheader: "Click the link below to complete your facility administrator setup",
                bodyContent: `<p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">You have been invited as the administrator for <strong>${facility.name}</strong>.</p><p style="color: #2D2D2D; font-size: 16px; line-height: 1.6; margin: 0;">Click the button below to set up your account and complete the facility onboarding process.</p>`,
                ctaButton: {
                  text: "Complete Setup",
                  url: linkData.properties.action_link,
                },
                footerText: "This link will expire in 24 hours. If you didn't request this, please ignore this email.",
              },
            }),
          });
          
          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Error sending email via Brevo:", errorText);
            return { error: "Failed to send invite email" };
          }
        } catch (emailErr) {
          console.error("Error calling email function:", emailErr);
          return { error: "Failed to send invite email" };
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
  
  for (const staff of staffMembers) {
    try {
      // Create user with Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
        staff.email,
        {
          data: {
            full_name: staff.name,
            role: staff.role,
            agency_id: facilityId,
            needs_password_setup: true,
          },
          redirectTo: `${origin}/facility-setup?facility=${facilityId}`,
        }
      );

      if (authError) {
        console.error(`Error inviting ${staff.email}:`, authError);
        results.push({ email: staff.email, success: false, error: authError.message });
        continue;
      }

      // Create user record in users table
      if (authData.user) {
        const { error: userError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
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
            user_id: authData.user.id,
            agency_id: facilityId,
            role: staff.role,
          });

        if (agencyUserError) {
          console.error(`Error creating agency_users record for ${staff.email}:`, agencyUserError);
        }
      }

      results.push({ email: staff.email, success: true });
    } catch (err: any) {
      console.error(`Error inviting ${staff.email}:`, err);
      results.push({ email: staff.email, success: false, error: err.message });
    }
  }

  return { results };
}
