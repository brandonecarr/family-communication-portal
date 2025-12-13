import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check user role from user metadata or users table
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = userData?.role || user.user_metadata?.role;

  // Route based on role
  if (role === "super_admin") {
    return redirect("/super-admin");
  } else if (role === "agency_admin" || role === "agency_staff" || role === "admin") {
    return redirect("/admin");
  } else if (role === "family_admin" || role === "family_member") {
    return redirect("/family");
  }

  // If no role is set, redirect to onboarding
  return redirect("/onboarding");
}
