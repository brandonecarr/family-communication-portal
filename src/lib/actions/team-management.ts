"use server";

import { createClient } from "../../../supabase/server";
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
  const supabase = await createClient();
  
  // Get the base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : '');
  
  const { data, error } = await supabase.functions.invoke('supabase-functions-send-team-invitation', {
    body: {
      email: params.email,
      token: params.token,
      inviterName: params.inviterName,
      agencyName: params.agencyName,
      role: params.role,
      baseUrl,
    },
  });

  if (error) {
    console.error('Error sending invitation email:', error);
    // Don't throw - invitation is still created, just email failed
    return { success: false, error };
  }

  return { success: true, data };
}

// Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
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
export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get user's agency_id
  const { data: currentUserAgency } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) return [];

  // Fetch all team members for this agency
  const { data: agencyUsers } = await supabase
    .from("agency_users")
    .select("user_id, role, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  // Get user details for all team members
  const userIds = (agencyUsers || []).map((au: any) => au.user_id);
  if (userIds.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, last_sign_in_at")
    .in("id", userIds);

  if (!users) return [];

  const usersMap = new Map(users.map((u: any) => [u.id, u]));

  return (agencyUsers || []).map((au: any) => {
    const userData: any = usersMap.get(au.user_id) || {};
    return {
      id: au.user_id,
      name: userData.full_name || "Unknown",
      email: userData.email || "",
      role: au.role,
      status: "Active",
      lastLogin: userData.last_sign_in_at || null,
      joinDate: au.created_at,
      avatar_url: userData.avatar_url,
    };
  });
}

// Get pending invitations for the current user's agency
export async function getPendingInvitations(): Promise<TeamInvitation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get user's agency_id
  const { data: currentUserAgency } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) return [];

  console.log(`[DEBUG] Fetching pending invitations for agency ${agencyId}`);

  // Fetch pending invitations
  const { data: invitations, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    return [];
  }

  console.log(`[DEBUG] Found ${invitations?.length || 0} pending invitations for agency ${agencyId}`);

  // Also fetch users who have been invited but haven't completed onboarding
  const { data: pendingUsers } = await supabase
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

  // Get user's agency_id and name
  const { data: currentUserAgency } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;
  if (!agencyId) throw new Error("User not associated with an agency");

  // Get inviter's name
  const { data: inviterData } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Check if email is already invited
  const { data: existingInvite } = await supabase
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
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existingUser) {
    const { data: existingAgencyUser } = await supabase
      .from("agency_users")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("agency_id", agencyId)
      .single();

    if (existingAgencyUser) {
      throw new Error("This user is already a member of your team");
    }
  }

  // Generate invitation token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  // Create invitation
  const { error } = await supabase.from("team_invitations").insert({
    email: data.email,
    role: data.role,
    agency_id: agencyId,
    invited_by_name: inviterData?.full_name || "Unknown",
    token,
    status: "pending",
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Error creating invitation:", error);
    throw new Error("Failed to create invitation");
  }

  console.log(`[DEBUG] Created invitation for ${data.email} with agency_id ${agencyId}`);

  // Get agency name for the email
  const { data: agencyData } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .single();

  // Send invitation email
  const emailResult = await sendInvitationEmail({
    email: data.email,
    token,
    inviterName: inviterData?.full_name || "A team member",
    agencyName: agencyData?.name || "the organization",
    role: data.role,
  });

  if (!emailResult.success) {
    console.warn(`[EMAIL] Failed to send invitation email to ${data.email}:`, emailResult.error);
  } else {
    console.log(`[EMAIL] Invitation sent to ${data.email}`);
  }

  revalidatePath("/admin/team-management");
  return { success: true, token, emailSent: emailResult.success };
}

// Resend invitation
export async function resendInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get the invitation
  const { data: invitation, error: fetchError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation) {
    throw new Error("Invitation not found");
  }

  // Generate new token and extend expiration
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase
    .from("team_invitations")
    .update({
      token,
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", invitationId);

  if (error) {
    throw new Error("Failed to resend invitation");
  }

  // Get agency name for the email
  const { data: agencyData } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", invitation.agency_id)
    .single();

  // Send invitation email
  const emailResult = await sendInvitationEmail({
    email: invitation.email,
    token,
    inviterName: invitation.invited_by_name || "A team member",
    agencyName: agencyData?.name || "the organization",
    role: invitation.role,
  });

  if (!emailResult.success) {
    console.warn(`[EMAIL] Failed to resend invitation email to ${invitation.email}:`, emailResult.error);
  } else {
    console.log(`[EMAIL] Invitation resent to ${invitation.email}`);
  }

  revalidatePath("/admin/team-management");
  return { success: true, emailSent: emailResult.success };
}

// Cancel invitation
export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
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

  // Get user's agency_id
  const { data: currentUserAgency } = await supabase
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

  const { error } = await supabase
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

// Remove team member
export async function removeTeamMember(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get user's agency_id
  const { data: currentUserAgency } = await supabase
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

  const { error } = await supabase
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
