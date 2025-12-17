"use server";

import { createClient } from "../../../supabase/server";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { agencyId: null, isSuperAdmin: false };
  
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
}

export async function recordHealthMetric(metricData: {
  metric_name: string;
  metric_value: number;
  unit?: string;
  status?: string;
  metadata?: any;
}) {
  const supabase = await createClient();
  
  // Get user's agency_id
  const { agencyId } = await getUserAgencyAndRole(supabase);
  
  const { data, error } = await supabase
    .from("health_metrics")
    .insert({ ...metricData, agency_id: agencyId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getHealthMetrics(metricName?: string, limit: number = 100) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty health metrics");
    return [];
  }
  
  let query = supabase
    .from("health_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  if (metricName) {
    query = query.eq("metric_name", metricName);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getLatestHealthMetrics() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty metrics
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty health metrics");
    return {};
  }
  
  const metricNames = [
    "cpu_usage",
    "memory_usage",
    "disk_usage",
    "network_io",
    "api_response_time",
    "database_performance",
    "error_rate",
  ];
  
  const metrics: Record<string, any> = {};
  
  for (const name of metricNames) {
    let query = supabase
      .from("health_metrics")
      .select("*")
      .eq("metric_name", name)
      .order("created_at", { ascending: false })
      .limit(1);
    
    // Filter by agency unless user is super_admin
    if (agencyId && !isSuperAdmin) {
      query = query.eq("agency_id", agencyId);
    }
    
    const { data } = await query.single();
    
    if (data) {
      metrics[name] = data;
    }
  }
  
  return metrics;
}

export async function getSystemStatus() {
  const metrics = await getLatestHealthMetrics();
  
  const status = {
    overall: "operational",
    services: {
      api: "operational",
      database: "operational",
      authentication: "operational",
      email: "operational",
    },
    metrics: metrics,
  };
  
  if (metrics.error_rate && metrics.error_rate.metric_value > 1) {
    status.overall = "degraded";
  }
  
  if (metrics.cpu_usage && metrics.cpu_usage.metric_value > 80) {
    status.services.api = "degraded";
  }
  
  return status;
}
