import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const createClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client that will fail gracefully during build time
    // This allows pages with dynamic = "force-dynamic" to build without errors
    console.warn("Supabase environment variables not available - returning mock client");
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("No Supabase credentials") }),
        getSession: async () => ({ data: { session: null }, error: new Error("No Supabase credentials") }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error("No Supabase credentials"), single: () => ({ data: null, error: new Error("No Supabase credentials") }) }),
        insert: () => ({ data: null, error: new Error("No Supabase credentials") }),
        update: () => ({ data: null, error: new Error("No Supabase credentials") }),
        delete: () => ({ data: null, error: new Error("No Supabase credentials") }),
      }),
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
};

export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    console.warn("Supabase service credentials not available");
    return null;
  }
  
  return createSupabaseClient(url, key);
};
