import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient, createServiceClient } from "../../../../supabase/server";
import TeamManagementClient from "./team-management-client";
import { TeamMember, TeamInvitation } from "@/lib/actions/team-management";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTeamManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Use service client to bypass RLS - same approach as super admin facility page
  const serviceClient = createServiceClient();
  
  if (!serviceClient) {
    console.error("[TeamManagement] Service client not available - SUPABASE_SERVICE_KEY may not be set");
  } else {
    console.log("[TeamManagement] Using service client (RLS bypassed)");
  }
  
  const dbClient = serviceClient || supabase;
  
  // Get user's agency_id and role using service client
  const { data: currentUserAgency, error: agencyError } = await dbClient
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  console.log("[TeamManagement] Current user agency lookup:", {
    userId: user.id,
    agencyId: currentUserAgency?.agency_id,
    role: currentUserAgency?.role,
    error: agencyError?.message,
  });

  let agencyId = currentUserAgency?.agency_id;
  let userRole = currentUserAgency?.role || "agency_staff";

  // If no agency_users record, check if user is an admin of an agency and create the record
  if (!agencyId && serviceClient) {
    const { data: adminAgency } = await serviceClient
      .from("agencies")
      .select("id")
      .eq("admin_user_id", user.id)
      .single();

    if (adminAgency) {
      // Create the missing agency_users record
      await serviceClient
        .from("agency_users")
        .insert({
          user_id: user.id,
          agency_id: adminAgency.id,
          role: "agency_admin",
        });
      
      agencyId = adminAgency.id;
      userRole = "agency_admin";
    }
  }

  if (!agencyId) {
    return redirect("/sign-in");
  }

  console.log("[TeamManagement] Starting data fetch for user:", user.id, "agency:", agencyId);

  // Fetch staff members directly - same approach as super admin facility page
  const { data: staffMembers, error: staffError } = await dbClient
    .from("agency_users")
    .select("user_id, role, created_at")
    .eq("agency_id", agencyId);

  console.log("[TeamManagement] Staff query result:", {
    agencyId,
    staffCount: staffMembers?.length || 0,
    error: staffError?.message,
    usingServiceClient: !!serviceClient,
  });

  // Fetch staff details from users table
  const userIds = (staffMembers || []).map((s: any) => s.user_id);
  
  let teamMembers: TeamMember[] = [];
  
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await dbClient
      .from("users")
      .select("id, full_name, email, avatar_url, last_sign_in_at")
      .in("id", userIds);

    console.log("[TeamManagement] Users query result:", {
      userIdsCount: userIds.length,
      usersCount: users?.length || 0,
      error: usersError?.message,
    });

    const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

    teamMembers = (staffMembers || []).map((staff: any) => {
      const userData: any = usersMap.get(staff.user_id) || {};
      return {
        id: staff.user_id,
        name: userData.full_name || "Unknown",
        email: userData.email || "",
        role: staff.role,
        status: "Active",
        lastLogin: userData.last_sign_in_at || null,
        joinDate: staff.created_at,
        avatar_url: userData.avatar_url,
      };
    });
  }

  // Fetch pending invitations
  const { data: invitations, error: invitationsError } = await dbClient
    .from("team_invitations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log("[TeamManagement] Invitations query result:", {
    agencyId,
    invitationsCount: invitations?.length || 0,
    error: invitationsError?.message,
  });

  // Get inviter names
  const inviterIds = Array.from(new Set((invitations || []).map((i: any) => i.invited_by).filter(Boolean))) as string[];
  let inviterMap = new Map();
  
  if (inviterIds.length > 0) {
    const { data: inviters } = await dbClient
      .from("users")
      .select("id, full_name")
      .in("id", inviterIds);
    
    inviterMap = new Map((inviters || []).map((u: any) => [u.id, u.full_name]));
  }

  const pendingInvitations: TeamInvitation[] = (invitations || []).map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    token: inv.token,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    invited_by_name: inviterMap.get(inv.invited_by) || null,
  }));

  console.log("[TeamManagement] Final data:", {
    teamMembersCount: teamMembers.length,
    pendingInvitationsCount: pendingInvitations.length,
    agencyId,
  });

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-180px)]">
          Loading...
        </div>
      }
    >
      <TeamManagementClient
        teamMembers={teamMembers}
        pendingInvitations={pendingInvitations}
        currentUserId={user.id}
        currentUserRole={currentUserAgency?.role || "agency_staff"}
      />
    </Suspense>
  );
}
