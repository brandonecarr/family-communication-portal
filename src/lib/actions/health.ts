"use server";

import { createClient } from "../../../supabase/server";

export async function recordHealthMetric(metricData: {
  metric_name: string;
  metric_value: number;
  unit?: string;
  status?: string;
  metadata?: any;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("health_metrics")
    .insert(metricData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getHealthMetrics(metricName?: string, limit: number = 100) {
  const supabase = await createClient();
  
  let query = supabase
    .from("health_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (metricName) {
    query = query.eq("metric_name", metricName);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getLatestHealthMetrics() {
  const supabase = await createClient();
  
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
    const { data } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("metric_name", name)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
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
