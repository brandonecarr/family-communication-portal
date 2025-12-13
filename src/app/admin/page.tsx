import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import AdminDashboardStats from "@/components/admin/admin-dashboard-stats";
import RecentActivity from "@/components/admin/recent-activity";
import MessageQueue from "@/components/admin/message-queue";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if user needs to complete onboarding
  const needsPasswordSetup = user.user_metadata?.needs_password_setup;
  const agencyId = user.user_metadata?.agency_id;

  if (needsPasswordSetup && agencyId) {
    return redirect(`/admin/setup?facility=${agencyId}`);
  }

  // Check if user has completed onboarding
  const { data: userData } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  // Check if user is assigned to an agency
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  // If user has agency_id in metadata but not in agency_users, redirect to setup
  if (agencyId && !agencyUser && !userData?.onboarding_completed) {
    return redirect(`/admin/setup?facility=${agencyId}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light mb-2">Agency Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your hospice agency operations
        </p>
      </div>

      <AdminDashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MessageQueue />
        <RecentActivity />
      </div>
    </div>
  );
}
