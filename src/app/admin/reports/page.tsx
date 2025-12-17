import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Package,
} from "lucide-react";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  const reports = [
    {
      id: "1",
      name: "Monthly Performance Report",
      description: "Comprehensive overview of agency performance metrics",
      type: "performance",
      frequency: "Monthly",
      lastGenerated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      icon: TrendingUp,
    },
    {
      id: "2",
      name: "Family Engagement Report",
      description: "Family portal usage and engagement analytics",
      type: "engagement",
      frequency: "Weekly",
      lastGenerated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      icon: Users,
    },
    {
      id: "3",
      name: "Message Queue Report",
      description: "Message handling and response time analytics",
      type: "messages",
      frequency: "Daily",
      lastGenerated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      icon: MessageSquare,
    },
    {
      id: "4",
      name: "Supply & Delivery Report",
      description: "Supply request fulfillment and delivery tracking",
      type: "supply",
      frequency: "Weekly",
      lastGenerated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive reports
          </p>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-[#7A9B8E]" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {report.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.description}
                          </p>
                        </div>
                        <Badge className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                          {report.frequency}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Last generated:{" "}
                          {new Date(report.lastGenerated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Report Builder */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Create Custom Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Build custom reports with your selected metrics and date ranges
            </p>
            <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
              Create Custom Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
