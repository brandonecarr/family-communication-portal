import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");
  const token = requestUrl.searchParams.get("token");
  const facility = requestUrl.searchParams.get("facility");
  
  // Use the configured site URL, not localhost
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (user && !error) {
      const needsPasswordSetup = user.user_metadata?.needs_password_setup;
      const agencyId = user.user_metadata?.agency_id || facility;
      const userEmail = user.email;
      const userRole = user.user_metadata?.role;
      
      // Check if there's a pending facility invite for this user
      const { data: pendingInvite } = await supabase
        .from("facility_invites")
        .select("token, agency_id")
        .eq("email", userEmail)
        .eq("status", "pending")
        .single();
      
      // If user has pending invite OR needs password setup, redirect to facility-setup
      if (pendingInvite) {
        const setupUrl = new URL("/facility-setup", siteUrl);
        setupUrl.searchParams.set("facility", pendingInvite.agency_id);
        setupUrl.searchParams.set("token", pendingInvite.token);
        return NextResponse.redirect(setupUrl);
      }
      
      // Check if user is agency_admin and needs password setup
      if (needsPasswordSetup && agencyId && userRole === "agency_admin") {
        const setupUrl = new URL("/facility-setup", siteUrl);
        setupUrl.searchParams.set("facility", agencyId);
        if (token) {
          setupUrl.searchParams.set("token", token);
        }
        return NextResponse.redirect(setupUrl);
      }
      
      // Check if user is staff and needs password setup - redirect to accept-invite
      if (needsPasswordSetup && agencyId && (userRole === "agency_staff" || userRole !== "agency_admin")) {
        const acceptUrl = new URL("/accept-invite", siteUrl);
        acceptUrl.searchParams.set("facility", agencyId);
        if (token) {
          acceptUrl.searchParams.set("token", token);
        }
        return NextResponse.redirect(acceptUrl);
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectTo = redirect_to || "/dashboard";
  return NextResponse.redirect(new URL(redirectTo, siteUrl));
} 