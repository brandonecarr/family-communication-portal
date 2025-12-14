"use server";

import { createClient } from "../../../supabase/server";

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
  
  // Get user's agency_id for filtering
  const agencyId = await getUserAgencyId(supabase);
  
  let query = supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false });
  
  // Filter by agency if user belongs to one
  if (agencyId) {
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
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("event_type, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());
  
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
  
  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  
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
