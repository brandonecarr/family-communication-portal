"use client";

import { createClient } from "../../supabase/client";

// Cache for agency_id to avoid repeated lookups
let cachedAgencyId: string | null = null;
let cachedUserId: string | null = null;

/**
 * Gets the current user's agency_id for client-side filtering
 * CRITICAL: This must be called before any data queries to ensure data isolation
 */
export async function getClientAgencyId(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      cachedAgencyId = null;
      cachedUserId = null;
      return null;
    }
    
    // Return cached value if still same user
    if (cachedUserId === user.id && cachedAgencyId) {
      return cachedAgencyId;
    }
    
    cachedUserId = user.id;
    
    // First try agency_users table (primary source)
    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();
    
    if (agencyUser?.agency_id) {
      cachedAgencyId = agencyUser.agency_id;
      return cachedAgencyId;
    }
    
    // Fallback: Check family_members table (for family portal users)
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("patient:patient_id(agency_id)")
      .eq("user_id", user.id)
      .single();
    
    if (familyMember?.patient && typeof familyMember.patient === 'object' && 'agency_id' in familyMember.patient) {
      cachedAgencyId = familyMember.patient.agency_id as string;
      return cachedAgencyId;
    }
    
    // No agency found - user should not see any data
    cachedAgencyId = null;
    return null;
  } catch (error) {
    console.warn("Error getting client agency id:", error);
    cachedAgencyId = null;
    return null;
  }
}

/**
 * Clears the cached agency_id (call this on sign out)
 */
export function clearAgencyCache() {
  cachedAgencyId = null;
  cachedUserId = null;
}

/**
 * Checks if user is a super admin
 */
export async function isClientSuperAdmin(): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }
    
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    return userData?.role === 'super_admin';
  } catch {
    return false;
  }
}
