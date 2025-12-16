import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    redirect("/sign-in");
  }

  // Check if user needs to complete onboarding (facility setup)
  const needsPasswordSetup = user.user_metadata?.needs_password_setup;
  const agencyId = user.user_metadata?.agency_id;
  const userRole = user.user_metadata?.role;

  // Check for pending facility invite
  const { data: pendingInvite } = await supabase
    .from("facility_invites")
    .select("token, agency_id")
    .eq("email", user.email!)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingInvite) {
    redirect(`/facility-setup?facility=${pendingInvite.agency_id}&token=${pendingInvite.token}`);
  }

  // Check if agency admin needs to complete facility setup
  if (needsPasswordSetup && agencyId && userRole === "agency_admin") {
    redirect(`/facility-setup?facility=${agencyId}`);
  }

  // Check if staff needs to complete onboarding
  if (needsPasswordSetup && agencyId) {
    redirect(`/accept-invite?facility=${agencyId}`);
  }

  // Check user role from user metadata or users table
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = userData?.role || user.user_metadata?.role;

  // Route based on role
  if (role === "super_admin") {
    redirect("/super-admin");
  } else if (role === "agency_admin" || role === "agency_staff" || role === "admin") {
    redirect("/admin");
  } else if (role === "family_admin" || role === "family_member") {
    redirect("/family");
  } else {
    // If no role is set, redirect to onboarding
    redirect("/onboarding");
  }
}
