import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
} from "lucide-react";

export default async function AdminPerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  const metrics = [
    {
      name: "API Response Time",
      value: "145ms",
      status: "healthy",
      icon: Zap,
      threshold: "< 200ms",
    },
    {
      name: "Database Performance",
      value: "98.5%",
      status: "healthy",
      icon: Database,
      threshold: "> 95%",
    },
    {
      name: "System Uptime",
      value: "99.9%",
      status: "healthy",
      icon: Activity,
      threshold: "> 99%",
    },
    {
      name: "Error Rate",
      value: "0.02%",
      status: "healthy",
      icon: AlertTriangle,
      threshold: "< 0.1%",
    },
  ];

  const statusColors = {
    healthy: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    warning: "bg-[#D4876F]/20 text-[#D4876F]",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            System Performance
          </h1>
          <p className="text-muted-foreground">
            Monitor system health and performance metrics
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const config =
            statusColors[metric.status as keyof typeof statusColors];

          return (
            <Card
              key={metric.name}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[#7A9B8E]" />
                  </div>
                  <Badge variant="outline" className={config}>
                    {metric.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="font-semibold text-lg mb-1">{metric.name}</h3>
                <p
                  className="text-3xl font-light mb-2"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {metric.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  Threshold: {metric.threshold}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Service Status */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "API Server", status: "operational" },
            { name: "Database", status: "operational" },
            { name: "Email Service", status: "operational" },
            { name: "SMS Service", status: "operational" },
            { name: "Storage Service", status: "operational" },
          ].map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <span className="font-medium text-sm">{service.name}</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#7A9B8E]" />
                <span className="text-sm text-[#7A9B8E]">
                  {service.status.charAt(0).toUpperCase() +
                    service.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                message: "High memory usage detected",
                severity: "warning",
                time: "2 hours ago",
              },
              {
                message: "Database backup completed successfully",
                severity: "info",
                time: "4 hours ago",
              },
              {
                message: "API response time normalized",
                severity: "info",
                time: "6 hours ago",
              },
            ].map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className="mt-1">
                  {alert.severity === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-[#D4876F]" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-[#7A9B8E]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {alert.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
