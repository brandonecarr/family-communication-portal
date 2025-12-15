import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  // Use the configured site URL for redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.url;
  
  // CRITICAL: Allow facility-setup and accept-invite pages to handle their own auth
  // These pages handle OTP verification and should NEVER be redirected to sign-in
  const isSetupPage = request.nextUrl.pathname.startsWith("/facility-setup");
  const isAcceptInvitePage = request.nextUrl.pathname.startsWith("/accept-invite");
  
  if (isSetupPage || isAcceptInvitePage) {
    return response;
  }
  
  // Check if this is an auth callback with a code parameter
  const code = request.nextUrl.searchParams.get("code");
  const isRootPath = request.nextUrl.pathname === "/";
  
  // If there's a code on the root path, redirect to auth/callback to handle it
  if (code && isRootPath) {
    const callbackUrl = new URL("/auth/callback", siteUrl);
    callbackUrl.searchParams.set("code", code);
    // Preserve any other query params
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "code") {
        callbackUrl.searchParams.set(key, value);
      }
    });
    return NextResponse.redirect(callbackUrl);
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    // If there's a JWT error, clear the session cookies to force re-auth
    if (error && (error.message.includes("JWT") || error.message.includes("token"))) {
      console.warn("Invalid JWT token detected, clearing session");
      // Clear auth cookies
      response.cookies.delete("sb-access-token");
      response.cookies.delete("sb-refresh-token");
      
      // Get all cookies that start with "sb-" and delete them
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          response.cookies.delete(cookie.name);
        }
      });
    }

    // protected routes
    if (request.nextUrl.pathname.startsWith("/dashboard") && error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return response;
  } catch (e) {
    // If there's any error during auth check, return the response without blocking
    console.warn("Auth check error in middleware:", e);
    return response;
  }
};
