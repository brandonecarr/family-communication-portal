import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Activity,
  Database,
  Zap,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminHealthCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            System Health Check
          </h1>
          <p className="text-muted-foreground">
            Real-time system status and diagnostics
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-full"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                System Status
              </p>
              <p
                className="text-3xl font-light"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                All Systems Operational
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[#7A9B8E]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            name: "API Server",
            status: "operational",
            uptime: "99.98%",
            responseTime: "145ms",
            icon: Zap,
          },
          {
            name: "Database",
            status: "operational",
            uptime: "99.99%",
            responseTime: "12ms",
            icon: Database,
          },
          {
            name: "Authentication",
            status: "operational",
            uptime: "99.97%",
            responseTime: "89ms",
            icon: Activity,
          },
          {
            name: "Email Service",
            status: "operational",
            uptime: "99.95%",
            responseTime: "234ms",
            icon: Activity,
          },
        ].map((service) => {
          const Icon = service.icon;
          return (
            <Card
              key={service.name}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#7A9B8E]" />
                  </div>
                  <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                    {service.status.charAt(0).toUpperCase() +
                      service.status.slice(1)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-3">{service.name}</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="font-medium">{service.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span className="font-medium">{service.responseTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Diagnostics */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Detailed Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              check: "Database Connection",
              status: "healthy",
              details: "Connected to primary database",
            },
            {
              check: "Cache Layer",
              status: "healthy",
              details: "Redis cache operational",
            },
            {
              check: "File Storage",
              status: "healthy",
              details: "S3 storage accessible",
            },
            {
              check: "SSL Certificate",
              status: "healthy",
              details: "Valid until 2025-01-15",
            },
            {
              check: "DNS Resolution",
              status: "healthy",
              details: "All DNS records resolving",
            },
            {
              check: "Backup System",
              status: "healthy",
              details: "Last backup: 2 hours ago",
            },
          ].map((diagnostic, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{diagnostic.check}</p>
                <p className="text-xs text-muted-foreground">
                  {diagnostic.details}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-[#7A9B8E] flex-shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { metric: "CPU Usage", value: "23%", threshold: "80%" },
            { metric: "Memory Usage", value: "45%", threshold: "85%" },
            { metric: "Disk Usage", value: "62%", threshold: "90%" },
            { metric: "Network I/O", value: "234 Mbps", threshold: "1000 Mbps" },
          ].map((perf) => (
            <div key={perf.metric} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{perf.metric}</span>
                <span className="text-muted-foreground">{perf.value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7A9B8E] rounded-full"
                  style={{
                    width: `${parseInt(perf.value) / parseInt(perf.threshold) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Threshold: {perf.threshold}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-[#7A9B8E] mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No incidents in the last 30 days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Maintenance */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Scheduled Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              date: "2024-02-15",
              time: "02:00 - 04:00 UTC",
              description: "Database optimization",
              impact: "Low",
            },
            {
              date: "2024-02-22",
              time: "03:00 - 05:00 UTC",
              description: "Security patches",
              impact: "Low",
            },
          ].map((maintenance, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{maintenance.description}</p>
                <p className="text-xs text-muted-foreground">
                  {maintenance.date} • {maintenance.time}
                </p>
              </div>
              <Badge className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                {maintenance.impact} Impact
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
