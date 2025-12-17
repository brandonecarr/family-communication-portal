"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users, MessageSquare, Calendar, Star, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "../../../supabase/client";
import { getClientAgencyId } from "@/lib/client-auth";

interface Metric {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down";
  icon: any;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [timePeriod, setTimePeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get agency ID first
    const init = async () => {
      const id = await getClientAgencyId();
      setAgencyId(id);
    };
    init();
  }, []);

  useEffect(() => {
    if (agencyId) {
      fetchAnalytics();
    } else if (agencyId === null) {
      setLoading(false);
    }
  }, [timePeriod, agencyId]);

  const fetchAnalytics = async () => {
    // CRITICAL: Filter by agency for data isolation
    if (!agencyId) {
      setMetrics([]);
      setLoading(false);
      return;
    }

    try {
      // First get all patient IDs for this agency
      const { data: agencyPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("agency_id", agencyId);
      
      const patientIds = agencyPatients?.map(p => p.id) || [];

      // Fetch active patients for THIS agency
      const { data: activePatientsData } = await supabase
        .from("patients")
        .select("id")
        .eq("status", "active")
        .eq("agency_id", agencyId);
      const activePatients = activePatientsData?.length || 0;

      // Fetch visit counts for THIS agency's patients
      let totalVisits = 0;
      let completedVisits = 0;
      if (patientIds.length > 0) {
        const { data: visitsData } = await supabase
          .from("visits")
          .select("id, status")
          .in("patient_id", patientIds);
        
        totalVisits = visitsData?.length || 0;
        completedVisits = visitsData?.filter(v => v.status === "completed").length || 0;
      }

      const completionRate = totalVisits
        ? ((completedVisits / totalVisits) * 100).toFixed(1)
        : "0";

      // Fetch average satisfaction for THIS agency's visits
      let avgSatisfaction: string = "N/A";
      if (patientIds.length > 0) {
        // Get visits for these patients
        const { data: agencyVisits } = await supabase
          .from("visits")
          .select("id")
          .in("patient_id", patientIds);
        
        const visitIds = agencyVisits?.map(v => v.id) || [];
        
        if (visitIds.length > 0) {
          const { data: feedbackData } = await supabase
            .from("visit_feedback")
            .select("rating")
            .in("visit_id", visitIds);
          
          avgSatisfaction = feedbackData?.length
            ? (feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length).toFixed(1)
            : "N/A";
        }
      }

      setMetrics([
        {
          label: "Active Patients",
          value: activePatients || 0,
          change: "+8.2%",
          trend: "up",
          icon: Users,
        },
        {
          label: "Avg Response Time",
          value: "2.4h",
          change: "-12%",
          trend: "up",
          icon: MessageSquare,
        },
        {
          label: "Visit Completion Rate",
          value: `${completionRate}%`,
          change: "+2.1%",
          trend: "up",
          icon: Calendar,
        },
        {
          label: "Family Satisfaction",
          value: avgSatisfaction !== "N/A" ? `${avgSatisfaction}/5` : "N/A",
          change: "+0.3",
          trend: "up",
          icon: Star,
        },
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2 rounded-full">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;

          return (
            <Card key={metric.label} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#7A9B8E]" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#7A9B8E]">
                    <TrendIcon className="h-4 w-4" />
                    <span>{metric.change}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Visit Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Message Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            Family Engagement Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">Chart visualization coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
