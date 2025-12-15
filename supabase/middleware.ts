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
  
  // Allow facility-setup page to handle its own auth code verification
  // Don't interfere with the OTP verification flow
  if (request.nextUrl.pathname.startsWith("/facility-setup")) {
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

    const { error } = await supabase.auth.getUser();

    // protected routes
    if (request.nextUrl.pathname.startsWith("/dashboard") && error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return response;
  } catch (e) {
    return response;
  }
};
