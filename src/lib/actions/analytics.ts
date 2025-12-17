"use server";

import { createClient } from "../../../supabase/server";

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

export async function trackEvent(eventData: {
  event_type: string;
  patient_id?: string;
  metadata?: any;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id
  const agencyId = await getUserAgencyId(supabase);
  
  const { data, error } = await supabase
    .from("analytics_events")
    .insert({ ...eventData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAnalyticsEvents(
  startDate?: string,
  endDate?: string,
  eventType?: string
) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty analytics list");
    return [];
  }
  
  let query = supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  
  if (endDate) {
    query = query.lte("created_at", endDate);
  }
  
  if (eventType) {
    query = query.eq("event_type", eventType);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getAnalyticsSummary() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty summary
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty analytics summary");
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByDay: {},
    };
  }
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let query = supabase
    .from("analytics_events")
    .select("event_type, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data: events, error } = await query;
  
  if (error) throw error;
  
  const summary = {
    totalEvents: events?.length || 0,
    eventsByType: {} as Record<string, number>,
    eventsByDay: {} as Record<string, number>,
  };
  
  events?.forEach((event: any) => {
    summary.eventsByType[event.event_type] = 
      (summary.eventsByType[event.event_type] || 0) + 1;
    
    const day = new Date(event.created_at).toISOString().split("T")[0];
    summary.eventsByDay[day] = (summary.eventsByDay[day] || 0) + 1;
  });
  
  return summary;
}

export async function getAIInsights() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty AI insights");
    return [];
  }
  
  let query = supabase
    .from("ai_insights")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function createAIInsight(insightData: {
  insight_type: string;
  title: string;
  description: string;
  impact?: string;
  data?: any;
  expires_at?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("ai_insights")
    .insert(insightData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
