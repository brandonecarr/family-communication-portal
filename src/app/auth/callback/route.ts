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
    
    // Check if user needs to complete facility setup
    if (user && !error) {
      const needsPasswordSetup = user.user_metadata?.needs_password_setup;
      const agencyId = user.user_metadata?.agency_id || facility;
      
      // If user came from a facility invite, redirect to facility-setup
      if (needsPasswordSetup && agencyId) {
        // Check if there's a pending invite token
        const { data: invite } = await supabase
          .from("facility_invites")
          .select("token")
          .eq("email", user.email)
          .eq("agency_id", agencyId)
          .eq("status", "pending")
          .single();
        
        const setupUrl = new URL("/facility-setup", requestUrl.origin);
        setupUrl.searchParams.set("facility", agencyId);
        if (invite?.token) {
          setupUrl.searchParams.set("token", invite.token);
        } else if (token) {
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