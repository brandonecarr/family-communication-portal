"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Handle auth errors (invalid/expired refresh token)
    if (authError || !user) {
      console.warn("Auth error or no user:", authError?.message);
      return { agencyId: null, isSuperAdmin: false };
    }
    
    // Check if user is super_admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isSuperAdmin = userData?.role === 'super_admin';
    
    // Get agency_id from agency_users
    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();
    
    return { 
      agencyId: agencyUser?.agency_id || null, 
      isSuperAdmin 
    };
  } catch (error: any) {
    // Handle refresh token errors gracefully
    console.warn("Error getting user agency and role:", error?.message);
    return { agencyId: null, isSuperAdmin: false };
  }
}

// Legacy helper for backward compatibility
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const { agencyId } = await getUserAgencyAndRole(supabase);
  return agencyId;
}

export async function getAPIKeys() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty API keys list");
    return [];
  }
  
  let query = supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function generateAPIKey(keyData: {
  name: string;
  environment: string;
  created_by_name: string;
  expires_at?: string;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id
  const agencyId = await getUserAgencyId(supabase);
  
  if (!agencyId) {
    throw new Error("User is not associated with any facility");
  }
  
  const apiKey = `sk_${keyData.environment}_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const keyPrefix = apiKey.substring(0, 12);
  
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      ...keyData,
      agency_id: agencyId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
  
  return { ...data, api_key: apiKey };
}

export async function revokeAPIKey(keyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("id", keyId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
  
  return data;
}

export async function deleteAPIKey(keyId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", keyId);
  
  if (error) throw error;
  
  revalidatePath("/admin/api-management");
}

export async function updateAPIKeyLastUsed(keyHash: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("api_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("key_hash", keyHash);
  
  if (error) throw error;
}
