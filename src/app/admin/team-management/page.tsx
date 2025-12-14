import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../../../supabase/server";
import TeamManagementClient from "./team-management-client";
import {
  getTeamMembers,
  getPendingInvitations,
} from "@/lib/actions/team-management";

export default async function AdminTeamManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's agency_id and role
  const { data: currentUserAgency } = await supabase
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  const agencyId = currentUserAgency?.agency_id;

  if (!agencyId) {
    return redirect("/sign-in");
  }

  // Fetch team members and pending invitations
  const [teamMembers, pendingInvitations] = await Promise.all([
    getTeamMembers(),
    getPendingInvitations(),
  ]);

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
