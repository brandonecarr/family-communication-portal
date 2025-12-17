"use client";

import { useState, useEffect } from "react";
import { Users, Calendar, MessageSquare, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "../../../supabase/client";
import { getClientAgencyId } from "@/lib/client-auth";

interface Stat {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down";
  icon: any;
  color: string;
}

export default function AdminDashboardStats() {
  const [stats, setStats] = useState<Stat[]>([
    { label: "Active Patients", value: 0, change: 0, trend: "up", icon: Users, color: "text-[#7A9B8E]" },
    { label: "Visits Today", value: 0, change: 0, trend: "up", icon: Calendar, color: "text-[#B8A9D4]" },
    { label: "Pending Messages", value: 0, change: 0, trend: "down", icon: MessageSquare, color: "text-[#D4876F]" },
    { label: "Active Deliveries", value: 0, change: 0, trend: "up", icon: Package, color: "text-[#7A9B8E]" },
  ]);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get agency ID first, then fetch stats
    const init = async () => {
      const id = await getClientAgencyId();
      setAgencyId(id);
      if (id) {
        fetchStats(id);
      } else {
        // No agency - show empty stats
        setLoading(false);
      }
    };
    init();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("admin-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => agencyId && fetchStats(agencyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => agencyId && fetchStats(agencyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => agencyId && fetchStats(agencyId))
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => agencyId && fetchStats(agencyId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async (filterAgencyId: string) => {
    try {
      // CRITICAL: Filter all queries by agency_id to ensure data isolation
      
      // Active patients - filter by agency
      const { data: patientsData } = await supabase
        .from("patients")
        .select("id")
        .eq("status", "active")
        .eq("agency_id", filterAgencyId);
      const activePatients = patientsData?.length || 0;

      // Get patient IDs for this agency to filter related data
      const { data: agencyPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("agency_id", filterAgencyId);
      const patientIds = agencyPatients?.map(p => p.id) || [];

      // Visits today - filter by agency's patients
      const today = new Date().toISOString().split("T")[0];
      let visitsToday = 0;
      if (patientIds.length > 0) {
        const { data: visitsData } = await supabase
          .from("visits")
          .select("id")
          .in("patient_id", patientIds)
          .gte("date", today)
          .lt("date", new Date(Date.now() + 86400000).toISOString().split("T")[0]);
        visitsToday = visitsData?.length || 0;
      }

      // Pending messages - filter by agency's patients
      let pendingMessages = 0;
      if (patientIds.length > 0) {
        const { data: messagesData } = await supabase
          .from("messages")
          .select("id")
          .in("patient_id", patientIds)
          .in("status", ["sent", "delivered"]);
        pendingMessages = messagesData?.length || 0;
      }

      // Active deliveries - filter by agency's patients
      let activeDeliveries = 0;
      if (patientIds.length > 0) {
        const { data: deliveriesData } = await supabase
          .from("deliveries")
          .select("id")
          .in("patient_id", patientIds)
          .in("status", ["shipped", "in_transit", "out_for_delivery"]);
        activeDeliveries = deliveriesData?.length || 0;
      }

      // Calculate changes (mock for now - would need historical data)
      setStats([
        { label: "Active Patients", value: activePatients, change: 5, trend: "up", icon: Users, color: "text-[#7A9B8E]" },
        { label: "Visits Today", value: visitsToday, change: 12, trend: "up", icon: Calendar, color: "text-[#B8A9D4]" },
        { label: "Pending Messages", value: pendingMessages, change: -3, trend: "down", icon: MessageSquare, color: "text-[#D4876F]" },
        { label: "Active Deliveries", value: activeDeliveries, change: 7, trend: "up", icon: Package, color: "text-[#7A9B8E]" },
      ]);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;

        return (
          <Card key={stat.label} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendIcon
                      className={`h-4 w-4 ${
                        stat.trend === "up" ? "text-[#7A9B8E]" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={
                        stat.trend === "up" ? "text-[#7A9B8E]" : "text-muted-foreground"
                      }
                    >
                      {stat.change > 0 ? "+" : ""}{stat.change}
                    </span>
                    <span className="text-muted-foreground">this week</span>
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
