"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

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

export async function getReports() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty reports list");
    return [];
  }
  
  let query = supabase
    .from("reports")
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

export async function createReport(reportData: {
  name: string;
  type: string;
  description?: string;
  frequency?: string;
  config?: any;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("reports")
    .insert(reportData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/reports");
  
  return data;
}

export async function generateReport(reportId: string) {
  const supabase = await createClient();
  
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();
  
  if (reportError) throw reportError;
  
  let reportData: any = {};
  
  switch (report.type) {
    case "performance":
      reportData = await generatePerformanceReport();
      break;
    case "engagement":
      reportData = await generateEngagementReport();
      break;
    case "messages":
      reportData = await generateMessagesReport();
      break;
    case "supply":
      reportData = await generateSupplyReport();
      break;
    default:
      reportData = { message: "Report type not implemented" };
  }
  
  const { data, error } = await supabase
    .from("reports")
    .update({ last_generated: new Date().toISOString() })
    .eq("id", reportId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/reports");
  
  return { report: data, data: reportData };
}

async function generatePerformanceReport() {
  const supabase = await createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: visits } = await supabase
    .from("visits")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  return {
    totalVisits: visits?.length || 0,
    totalMessages: messages?.length || 0,
    period: "Last 30 days",
  };
}

async function generateEngagementReport() {
  const supabase = await createClient();
  
  const { data: events } = await supabase
    .from("analytics_events")
    .select("*");
  
  return {
    totalEvents: events?.length || 0,
    uniqueUsers: new Set(events?.map((e: any) => e.patient_id)).size,
  };
}

async function generateMessagesReport() {
  const supabase = await createClient();
  
  const { data: messages } = await supabase
    .from("messages")
    .select("*");
  
  const readMessages = messages?.filter((m: any) => m.read).length || 0;
  const totalMessages = messages?.length || 0;
  
  return {
    totalMessages,
    readMessages,
    readRate: totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0,
  };
}

async function generateSupplyReport() {
  const supabase = await createClient();
  
  const { data: requests } = await supabase
    .from("supply_requests")
    .select("*");
  
  const fulfilled = requests?.filter((r: any) => r.status === "fulfilled").length || 0;
  const total = requests?.length || 0;
  
  return {
    totalRequests: total,
    fulfilledRequests: fulfilled,
    fulfillmentRate: total > 0 ? (fulfilled / total) * 100 : 0,
  };
}

export async function deleteReport(reportId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);
  
  if (error) throw error;
  
  revalidatePath("/admin/reports");
}
