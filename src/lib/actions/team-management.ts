"use server";

import { createClient, createServiceClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Helper function to send invitation email via edge function
async function sendInvitationEmail(params: {
  email: string;
  token: string;
  inviterName: string;
  agencyName: string;
  role: string;
}) {
  // Get the base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or anon key');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/supabase-functions-send-team-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: params.email,
        token: params.token,
        inviterName: params.inviterName,
        agencyName: params.agencyName,
        role: params.role,
        baseUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending invitation email:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log(`[EMAIL] Successfully sent invitation email to ${params.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error };
  }
}

// Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  jobRole: string | null;
  status: string;
  lastLogin: string | null;
  joinDate: string;
  avatar_url: string | null;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

// Get all team members for the current user's agency
export async function getTeamMembers(passedAgencyId?: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    console.error("[getTeamMembers] Service client not available");
    return [];
  }

  let agencyId = passedAgencyId;

  // If no agency ID passed, get it from agency_users
  if (!agencyId) {
    // Get user's agency_id using service client
    const { data: currentUserAgency, error: agencyError } = await serviceClient
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    agencyId = currentUserAgency?.agency_id;
  }

  if (!agencyId) {
    return [];
  }

  // Fetch all team members for this agency (include job_role)
  const { data: agencyUsers, error: agencyUsersError } = await serviceClient
    .from("agency_users")
    .select("user_id, role, job_role, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  // Get user details for all team members
  const userIds = (agencyUsers || []).map((au: any) => au.user_id);
  if (userIds.length === 0) {
    return [];
  }

  // Query users - only include those who have completed onboarding
  const { data: users, error: usersError } = await serviceClient
    .from("users")
    .select("id, full_name, name, email, avatar_url, onboarding_completed")
    .in("id", userIds)
    .eq("onboarding_completed", true);

  if (!users) return [];

  const usersMap = new Map(users.map((u: any) => [u.id, u]));

  // Only return team members who have completed onboarding
  return (agencyUsers || [])
    .filter((au: any) => usersMap.has(au.user_id))
    .map((au: any) => {
      const userData: any = usersMap.get(au.user_id) || {};
      return {
        id: au.user_id,
        name: userData.full_name || userData.name || userData.email?.split("@")[0] || "Unknown",
        email: userData.email || "",
        role: au.role,
        jobRole: au.job_role || null,
        status: "Active",
        lastLogin: null, // last_sign_in_at is not available in public.users
        joinDate: au.created_at,
        avatar_url: userData.avatar_url,
      };
    });
}

// Get pending invitations for the current user's agency
export async function getPendingInvitations(passedAgencyId?: string): Promise<TeamInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    console.error("Service client not available");
    return [];
  }

  let agencyId = passedAgencyId;

  // If no agency ID passed, get it from agency_users
  if (!agencyId) {
    // Get user's agency_id using service client
    const { data: currentUserAgency } = await serviceClient
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    agencyId = currentUserAgency?.agency_id;
  }

  if (!agencyId) return [];

  // Fetch pending invitations using service client
  const { data: invitations, error } = await serviceClient
    .from("team_invitations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  // Return only actual pending invitations from team_invitations table
  // Users will only appear in Team Members after they accept and complete onboarding
  return (invitations || []).map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    token: inv.token,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    invited_by_name: inv.invited_by_name,
  }));
}

// Invite a new team member
export async function inviteTeamMember(data: {
  email: string;
  role: string;
  name?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client for operations that need to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get user's agency_id and name using service client
  const { data: currentUserAgency } = await serviceClient
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) throw new Error("User not associated with an agency");

  // Get inviter's name
  const { data: inviterData } = await serviceClient
    .from("users")
    .select("full_name, name")
    .eq("id", user.id)
    .single();

  // Check if email is already invited
  const { data: existingInvite } = await serviceClient
    .from("team_invitations")
    .select("id")
    .eq("email", data.email)
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    throw new Error("This email has already been invited");
  }

  // Check if user already exists in the agency
  const { data: existingUser } = await serviceClient
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existingUser) {
    const { data: existingAgencyUser } = await serviceClient
      .from("agency_users")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("agency_id", agencyId)
      .single();

    if (existingAgencyUser) {
      throw new Error("This user is already a member of your team");
    }
  }

  // Check if user exists in auth and delete them to get a fresh invite
  const { data: existingAuthUsers } = await serviceClient.auth.admin.listUsers();
  const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === data.email);
  
  if (existingAuthUser) {
    console.log(`[INVITE] Deleting existing auth user for ${data.email}`);
    await serviceClient.auth.admin.deleteUser(existingAuthUser.id);
    
    // Also delete from users table
    await serviceClient
      .from("users")
      .delete()
      .eq("id", existingAuthUser.id);
    
    // Wait for deletion to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate a fresh invite link using Supabase auth
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: "invite",
    email: data.email,
    options: {
      data: {
        full_name: data.name || "",
        role: data.role,
        agency_id: agencyId,
        needs_password_setup: true,
      },
    },
  });

  if (linkError) {
    console.error("Error generating invite link:", linkError);
    throw new Error("Failed to generate invitation link");
  }

  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("Failed to generate invitation token");
  }

  // NOTE: We do NOT create user or agency_users records here.
  // These will be created when the user accepts the invitation and completes onboarding.
  // This ensures users only appear in the Team Members section after they've accepted.
  console.log(`[INVITE] User record will be created when invitation is accepted`);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  // Create invitation record with the auth token
  const { error } = await serviceClient.from("team_invitations").insert({
    email: data.email,
    role: data.role,
    agency_id: agencyId,
    invited_by_name: inviterData?.full_name || inviterData?.name || "Unknown",
    token: hashedToken,
    status: "pending",
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Error creating invitation:", error);
    throw new Error("Failed to create invitation");
  }

  console.log(`[DEBUG] Created invitation for ${data.email} with agency_id ${agencyId}`);

  // Get agency name for the email
  const { data: agencyData } = await serviceClient
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  // Build the invite URL with the auth code
  const inviteUrl = `${origin}/accept-invite?code=${hashedToken}&facility=${agencyId}&email=${encodeURIComponent(data.email)}`;

  // Send invitation email with the auth link
  const emailResult = await sendInvitationEmailWithUrl({
    email: data.email,
    inviterName: inviterData?.full_name || inviterData?.name || "A team member",
    agencyName: agencyData?.name || "the organization",
    role: data.role,
    inviteUrl,
  });

  if (!emailResult.success) {
    console.warn(`[EMAIL] Failed to send invitation email to ${data.email}:`, emailResult.error);
  } else {
    console.log(`[EMAIL] Invitation sent to ${data.email}`);
  }

  revalidatePath("/admin/team-management");
  return { success: true, token: hashedToken, emailSent: emailResult.success };
}

// Resend invitation
export async function resendInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get the invitation
  const { data: invitation, error: fetchError } = await serviceClient
    .from("team_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation) {
    throw new Error("Invitation not found");
  }

  // Check if user exists in auth and delete them to get a fresh invite
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);
  
  if (existingUser) {
    console.log(`[RESEND] Deleting existing auth user for ${invitation.email}`);
    await serviceClient.auth.admin.deleteUser(existingUser.id);
    
    // Also delete from users table
    await serviceClient
      .from("users")
      .delete()
      .eq("id", existingUser.id);
    
    // Wait for deletion to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate a fresh invite link
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: "invite",
    email: invitation.email,
    options: {
      data: {
        role: invitation.role,
        agency_id: invitation.agency_id,
        needs_password_setup: true,
      },
    },
  });

  if (linkError) {
    console.error("Error generating invite link:", linkError);
    throw new Error("Failed to generate new invitation link");
  }

  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("Failed to generate invitation token");
  }

  // NOTE: We do NOT create user or agency_users records here.
  // These will be created when the user accepts the invitation and completes onboarding.
  console.log(`[RESEND] User record will be created when invitation is accepted`);

  // Update the invitation with the new token and expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await serviceClient
    .from("team_invitations")
    .update({
      token: hashedToken,
      expires_at: expiresAt.toISOString(),
      status: "pending",
    })
    .eq("id", invitationId);

  if (error) {
    throw new Error("Failed to update invitation");
  }

  // Get agency name for the email
  const { data: agencyData } = await serviceClient
    .from("agencies")
    .select("name")
    .eq("id", invitation.agency_id)
    .single();

  // Build the invite URL with the new auth code
  const inviteUrl = `${origin}/accept-invite?code=${hashedToken}&facility=${invitation.agency_id}&email=${encodeURIComponent(invitation.email)}`;

  // Send invitation email with the new link
  const emailResult = await sendInvitationEmailWithUrl({
    email: invitation.email,
    inviterName: invitation.invited_by_name || "A team member",
    agencyName: agencyData?.name || "the organization",
    role: invitation.role,
    inviteUrl,
  });

  if (!emailResult.success) {
    console.warn(`[EMAIL] Failed to resend invitation email to ${invitation.email}:`, emailResult.error);
  } else {
    console.log(`[EMAIL] Invitation resent to ${invitation.email}`);
  }

  revalidatePath("/admin/team-management");
  return { success: true, emailSent: emailResult.success };
}

// Helper function to send invitation email with a specific URL
async function sendInvitationEmailWithUrl(params: {
  email: string;
  inviterName: string;
  agencyName: string;
  role: string;
  inviteUrl: string;
}) {
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    console.error('Service client not available');
    return { success: false, error: 'Service client not available' };
  }

  try {
    const { error: emailError } = await serviceClient.functions.invoke('supabase-functions-send-email', {
      body: {
        to: params.email,
        subject: `You're invited to join ${params.agencyName}`,
        htmlContent: generateTeamInviteEmail({
          staffName: params.inviterName !== 'A team member' ? '' : '',
          agencyName: params.agencyName,
          role: params.role,
          inviteUrl: params.inviteUrl,
          inviterName: params.inviterName,
        }),
      },
    });

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      return { success: false, error: emailError.message };
    }

    console.log(`[EMAIL] Successfully sent invitation email to ${params.email}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    return { success: false, error: error.message };
  }
}

// Generate a nicely formatted team invitation email (same as facility onboarding)
function generateTeamInviteEmail({ staffName, agencyName, role, inviteUrl, inviterName }: { 
  staffName?: string; 
  agencyName: string; 
  role: string; 
  inviteUrl: string;
  inviterName?: string;
}) {
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
                ${inviterName && inviterName !== 'A team member' ? `<strong>${inviterName}</strong> has invited you` : "You've been invited"} to join <strong>${agencyName}</strong> as a <strong>${roleLabel}</strong> on our Family Communication Portal.
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

// Cancel invitation
export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get the invitation to find the email
  const { data: invitation } = await serviceClient
    .from("team_invitations")
    .select("email")
    .eq("id", invitationId)
    .single();

  // Update invitation status
  const { error } = await serviceClient
    .from("team_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);

  if (error) {
    throw new Error("Failed to cancel invitation");
  }

  // Clean up any orphaned auth user that was created by generateLink
  if (invitation?.email) {
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);
    
    if (existingUser) {
      // Check if user has completed onboarding
      const { data: userData } = await serviceClient
        .from("users")
        .select("onboarding_completed")
        .eq("id", existingUser.id)
        .single();
      
      // Only delete if user hasn't completed onboarding (i.e., never accepted the invite)
      if (!userData?.onboarding_completed) {
        console.log(`[CANCEL] Cleaning up orphaned auth user for ${invitation.email}`);
        await serviceClient.auth.admin.deleteUser(existingUser.id);
        
        // Also delete from users table if exists
        await serviceClient
          .from("users")
          .delete()
          .eq("id", existingUser.id);
      }
    }
  }

  revalidatePath("/admin/team-management");
  return { success: true };
}

// Update team member role
export async function updateTeamMemberRole(userId: string, newRole: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get user's agency_id
  const { data: currentUserAgency } = await serviceClient
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) throw new Error("User not associated with an agency");

  // Only admins can change roles
  if (currentUserAgency.role !== "agency_admin" && currentUserAgency.role !== "super_admin") {
    throw new Error("Only administrators can change roles");
  }

  // Cannot change own role
  if (userId === user.id) {
    throw new Error("You cannot change your own role");
  }

  const { error } = await serviceClient
    .from("agency_users")
    .update({ role: newRole })
    .eq("user_id", userId)
    .eq("agency_id", agencyId);

  if (error) {
    throw new Error("Failed to update role");
  }

  revalidatePath("/admin/team-management");
  return { success: true };
}

// Update team member job role
export async function updateTeamMemberJobRole(userId: string, jobRole: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get user's agency_id
  const { data: currentUserAgency } = await serviceClient
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) throw new Error("User not associated with an agency");

  // Only admins can change job roles
  if (currentUserAgency.role !== "agency_admin" && currentUserAgency.role !== "super_admin") {
    throw new Error("Only administrators can change job roles");
  }

  const { error } = await serviceClient
    .from("agency_users")
    .update({ job_role: jobRole })
    .eq("user_id", userId)
    .eq("agency_id", agencyId);

  if (error) {
    throw new Error("Failed to update job role");
  }

  revalidatePath("/admin/team-management");
  return { success: true };
}

// Remove team member
export async function removeTeamMember(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Get user's agency_id
  const { data: currentUserAgency } = await serviceClient
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) throw new Error("User not associated with an agency");

  // Only admins can remove members
  if (currentUserAgency.role !== "agency_admin" && currentUserAgency.role !== "super_admin") {
    throw new Error("Only administrators can remove team members");
  }

  // Cannot remove self
  if (userId === user.id) {
    throw new Error("You cannot remove yourself from the team");
  }

  const { error } = await serviceClient
    .from("agency_users")
    .delete()
    .eq("user_id", userId)
    .eq("agency_id", agencyId);

  if (error) {
    throw new Error("Failed to remove team member");
  }

  revalidatePath("/admin/team-management");
  return { success: true };
}

// Default permissions configuration
const DEFAULT_PERMISSIONS = [
  { name: "View Dashboard", admin: true, staff: true },
  { name: "Manage Patients", admin: true, staff: true },
  { name: "Manage Visits", admin: true, staff: true },
  { name: "Manage Messages", admin: true, staff: true },
  { name: "View Reports", admin: true, staff: true },
  { name: "Manage Team", admin: true, staff: false },
  { name: "Manage Settings", admin: true, staff: false },
  { name: "View Audit Logs", admin: true, staff: false },
];

// Get role permissions for an agency
export async function getRolePermissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get user's agency
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  if (!agencyUser) throw new Error("No agency found");

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Fetch existing permissions
  const { data: permissions, error } = await serviceClient
    .from("role_permissions")
    .select("*")
    .eq("agency_id", agencyUser.agency_id);

  if (error) {
    console.error("Error fetching role permissions:", error);
    throw new Error("Failed to fetch role permissions");
  }

  // If no permissions exist, return defaults
  if (!permissions || permissions.length === 0) {
    return DEFAULT_PERMISSIONS;
  }

  // Map database permissions to the expected format
  return DEFAULT_PERMISSIONS.map((defaultPerm) => {
    const dbPerm = permissions.find((p: any) => p.permission_name === defaultPerm.name);
    if (dbPerm) {
      return {
        name: dbPerm.permission_name,
        admin: dbPerm.admin_enabled,
        staff: dbPerm.staff_enabled,
      };
    }
    return defaultPerm;
  });
}

// Save role permissions for an agency
export async function saveRolePermissions(
  permissions: Array<{ name: string; admin: boolean; staff: boolean }>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get user's agency and verify admin role
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  if (!agencyUser) throw new Error("No agency found");
  if (agencyUser.role !== "agency_admin" && agencyUser.role !== "super_admin") {
    throw new Error("Only administrators can modify role permissions");
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    throw new Error("Service client not available");
  }

  // Upsert each permission
  for (const perm of permissions) {
    const { error } = await serviceClient
      .from("role_permissions")
      .upsert(
        {
          agency_id: agencyUser.agency_id,
          permission_name: perm.name,
          admin_enabled: perm.admin,
          staff_enabled: perm.staff,
        },
        {
          onConflict: "agency_id,permission_name",
        }
      );

    if (error) {
      console.error("Error saving permission:", perm.name, error);
      throw new Error(`Failed to save permission: ${perm.name}`);
    }
  }

  revalidatePath("/admin/team-management");
  return { success: true };
}
