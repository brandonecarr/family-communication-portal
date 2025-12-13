"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// Helper to get current user's agency_id
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();
  
  return agencyUser?.agency_id || null;
}

export async function getAPIKeys() {
  const supabase = await createClient();
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency if user belongs to one
  if (agencyId) {
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
