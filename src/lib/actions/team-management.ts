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

    console.log("[getTeamMembers] Current user agency:", {
      userId: user.id,
      agencyId: currentUserAgency?.agency_id,
      error: agencyError?.message,
    });

    agencyId = currentUserAgency?.agency_id;
  }

  if (!agencyId) {
    console.error("[getTeamMembers] No agency ID found for user");
    return [];
  }

  console.log("[getTeamMembers] Fetching team members for agency:", agencyId);

  // Fetch all team members for this agency
  const { data: agencyUsers, error: agencyUsersError } = await serviceClient
    .from("agency_users")
    .select("user_id, role, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  console.log("[getTeamMembers] Agency users query:", {
    agencyId,
    count: agencyUsers?.length || 0,
    error: agencyUsersError?.message,
  });

  // Get user details for all team members
  const userIds = (agencyUsers || []).map((au: any) => au.user_id);
  if (userIds.length === 0) {
    console.log("[getTeamMembers] No user IDs found");
    return [];
  }

  const { data: users, error: usersError } = await serviceClient
    .from("users")
    .select("id, full_name, name, email, avatar_url, last_sign_in_at")
    .in("id", userIds);

  console.log("[getTeamMembers] Users query:", {
    userIdsCount: userIds.length,
    usersCount: users?.length || 0,
    error: usersError?.message,
  });

  if (!users) return [];

  const usersMap = new Map(users.map((u: any) => [u.id, u]));

  return (agencyUsers || []).map((au: any) => {
    const userData: any = usersMap.get(au.user_id) || {};
    return {
      id: au.user_id,
      name: userData.full_name || userData.name || userData.email?.split("@")[0] || "Unknown",
      email: userData.email || "",
      role: au.role,
      jobRole: au.job_role || null,
      status: "Active",
      lastLogin: userData.last_sign_in_at || null,
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

  // Also fetch users who have been invited but haven't completed onboarding
  const { data: pendingUsers } = await serviceClient
    .from("users")
    .select("id, email, full_name, role, created_at")
    .eq("agency_id", agencyId)
    .eq("onboarding_completed", false);

  console.log(`[DEBUG] Found ${pendingUsers?.length || 0} pending users (not completed onboarding) for agency ${agencyId}`);

  // Combine both sources of pending invitations
  const teamInvitations = (invitations || []).map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    token: inv.token,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    invited_by_name: inv.invited_by_name,
  }));

  // Add pending users as invitations
  const pendingUserInvitations = (pendingUsers || []).map((user: any) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    status: "pending",
    token: "",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: user.created_at,
    invited_by_name: "System",
  }));

  return [...teamInvitations, ...pendingUserInvitations];
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

  // Create user record if it was created
  if (linkData.user) {
    const { error: userError } = await serviceClient
      .from("users")
      .insert({
        id: linkData.user.id,
        email: data.email,
        full_name: data.name || "",
        role: data.role,
        agency_id: agencyId,
        onboarding_completed: false,
      });

    if (userError) {
      console.error("Error creating user record:", userError);
    }

    // Create agency_users relationship
    const { error: agencyUserError } = await serviceClient
      .from("agency_users")
      .insert({
        user_id: linkData.user.id,
        agency_id: agencyId,
        role: data.role,
      });

    if (agencyUserError) {
      console.error("Error creating agency_users record:", agencyUserError);
    }
  }

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

  // Create user record if it was created
  if (linkData.user) {
    const { error: userError } = await serviceClient
      .from("users")
      .insert({
        id: linkData.user.id,
        email: invitation.email,
        role: invitation.role,
        agency_id: invitation.agency_id,
        onboarding_completed: false,
      });

    if (userError) {
      console.error("Error creating user record:", userError);
    }

    // Create agency_users relationship
    const { error: agencyUserError } = await serviceClient
      .from("agency_users")
      .insert({
        user_id: linkData.user.id,
        agency_id: invitation.agency_id,
        role: invitation.role,
      });

    if (agencyUserError) {
      console.error("Error creating agency_users record:", agencyUserError);
    }
  }

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
  const roleLabel = params.role === 'agency_admin' ? 'Administrator' : 'Staff Member';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or anon key');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/supabase-functions-send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: params.email,
        subject: `${params.inviterName} invited you to join ${params.agencyName}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2D2D2D;">You're Invited!</h1>
            <p style="color: #2D2D2D; font-size: 16px;">
              <strong>${params.inviterName}</strong> has invited you to join <strong>${params.agencyName}</strong> as a <strong>${roleLabel}</strong>.
            </p>
            <p style="color: #2D2D2D; font-size: 16px;">Click the button below to accept your invitation:</p>
            <p style="margin: 24px 0;">
              <a href="${params.inviteUrl}" style="background-color: #7A9B8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #7A9B8E; font-size: 14px; word-break: break-all;">${params.inviteUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;"><strong>Important:</strong> This link is valid for 24 hours. If it expires, you can request a new invitation.</p>
          </div>
        `,
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

  const { error } = await serviceClient
    .from("team_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);

  if (error) {
    throw new Error("Failed to cancel invitation");
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
