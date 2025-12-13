import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  Calendar,
} from "lucide-react";

export default async function AdminAdvancedAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Deep insights into platform usage and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-full">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" className="gap-2 rounded-full">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Engagement", value: "8,234", change: "+12.5%" },
          { label: "Avg Session Duration", value: "12m 34s", change: "+3.2%" },
          { label: "Conversion Rate", value: "3.8%", change: "+0.5%" },
          { label: "User Retention", value: "87%", change: "+2.1%" },
        ].map((metric) => (
          <Card
            key={metric.label}
            className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {metric.label}
              </p>
              <p
                className="text-2xl font-light mb-2"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {metric.value}
              </p>
              <p className="text-xs text-[#7A9B8E]">{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              User Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Chart visualization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Feature Usage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Chart visualization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { cohort: "Week 1", retention: "92%", engagement: "8.5" },
              { cohort: "Week 2", retention: "87%", engagement: "7.2" },
              { cohort: "Week 3", retention: "82%", engagement: "6.8" },
              { cohort: "Week 4", retention: "78%", engagement: "6.1" },
            ].map((item) => (
              <div
                key={item.cohort}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <span className="font-medium text-sm">{item.cohort}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Retention: {item.retention}
                  </span>
                  <span className="text-muted-foreground">
                    Engagement: {item.engagement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Analysis */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { stage: "Portal Access", users: "10,000", conversion: "100%" },
              { stage: "View Dashboard", users: "9,200", conversion: "92%" },
              { stage: "Send Message", users: "7,360", conversion: "80%" },
              { stage: "Complete Action", users: "5,880", conversion: "80%" },
            ].map((item, idx) => (
              <div key={item.stage} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.stage}</span>
                  <span className="text-muted-foreground">
                    {item.users} users ({item.conversion})
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7A9B8E] rounded-full"
                    style={{ width: item.conversion }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
