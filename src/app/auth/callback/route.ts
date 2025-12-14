import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");
  const token = requestUrl.searchParams.get("token");
  const facility = requestUrl.searchParams.get("facility");

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (user && !error) {
      const needsPasswordSetup = user.user_metadata?.needs_password_setup;
      const agencyId = user.user_metadata?.agency_id || facility;
      const userEmail = user.email;
      
      // Check if there's a pending facility invite for this user
      const { data: pendingInvite } = await supabase
        .from("facility_invites")
        .select("token, agency_id")
        .eq("email", userEmail)
        .eq("status", "pending")
        .single();
      
      // If user has pending invite OR needs password setup, redirect to facility-setup
      if (pendingInvite) {
        const setupUrl = new URL("/facility-setup", requestUrl.origin);
        setupUrl.searchParams.set("facility", pendingInvite.agency_id);
        setupUrl.searchParams.set("token", pendingInvite.token);
        return NextResponse.redirect(setupUrl);
      }
      
      // Fallback: check metadata
      if (needsPasswordSetup && agencyId) {
        const setupUrl = new URL("/facility-setup", requestUrl.origin);
        setupUrl.searchParams.set("facility", agencyId);
        if (token) {
          setupUrl.searchParams.set("token", token);
        }
        return NextResponse.redirect(setupUrl);
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectTo = redirect_to || "/dashboard";
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
} 