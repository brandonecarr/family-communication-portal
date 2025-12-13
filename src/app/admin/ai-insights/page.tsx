import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Brain,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Zap,
} from "lucide-react";

export default async function AdminAIInsightsPage() {
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
            AI-Powered Insights
          </h1>
          <p className="text-muted-foreground">
            Machine learning insights and recommendations
          </p>
        </div>
      </div>

      {/* AI Recommendations */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7A9B8E]" />
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              AI Recommendations
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              title: "Optimize Visit Scheduling",
              description:
                "AI detected that scheduling visits between 2-4 PM increases completion rates by 15%",
              impact: "High",
              action: "View Details",
            },
            {
              title: "Improve Message Response Time",
              description:
                "Messages with quick responses (< 1 hour) have 23% higher satisfaction scores",
              impact: "High",
              action: "View Details",
            },
            {
              title: "Personalize Family Communications",
              description:
                "Families who receive personalized messages show 18% higher engagement",
              impact: "Medium",
              action: "View Details",
            },
            {
              title: "Reduce Supply Request Delays",
              description:
                "Proactive supply notifications reduce request fulfillment time by 12%",
              impact: "Medium",
              action: "View Details",
            },
          ].map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-muted/30 border border-[#7A9B8E]/20"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{rec.title}</h3>
                <Badge
                  className={
                    rec.impact === "High"
                      ? "bg-[#D4876F]/20 text-[#D4876F]"
                      : "bg-[#B8A9D4]/20 text-[#B8A9D4]"
                  }
                >
                  {rec.impact} Impact
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {rec.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
              >
                {rec.action}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#7A9B8E]" />
              <CardTitle
                className="text-xl font-light"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Churn Prediction
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                family: "Smith Family",
                riskScore: "78%",
                reason: "Low engagement last 7 days",
              },
              {
                family: "Johnson Family",
                riskScore: "62%",
                reason: "Missed last 2 visits",
              },
              {
                family: "Davis Family",
                riskScore: "45%",
                reason: "Declining message frequency",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-muted/30 flex items-start justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{item.family}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <Badge className="bg-[#D4876F]/20 text-[#D4876F]">
                  {item.riskScore}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#7A9B8E]" />
              <CardTitle
                className="text-xl font-light"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Growth Opportunities
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                opportunity: "Expand Education Content",
                potential: "+23% engagement",
              },
              {
                opportunity: "Increase Visit Frequency",
                potential: "+18% satisfaction",
              },
              {
                opportunity: "Add Peer Support Groups",
                potential: "+31% retention",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-muted/30 flex items-start justify-between"
              >
                <p className="font-medium text-sm">{item.opportunity}</p>
                <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                  {item.potential}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#D4876F]" />
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Anomaly Detection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              anomaly: "Unusual Message Volume Spike",
              severity: "Medium",
              details: "50% increase in messages from Family A",
            },
            {
              anomaly: "Visit Cancellation Pattern",
              severity: "High",
              details: "3 consecutive visit cancellations detected",
            },
            {
              anomaly: "Response Time Degradation",
              severity: "Low",
              details: "Average response time increased by 15%",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/30 flex items-start justify-between"
            >
              <div>
                <p className="font-medium text-sm">{item.anomaly}</p>
                <p className="text-xs text-muted-foreground">{item.details}</p>
              </div>
              <Badge
                className={
                  item.severity === "High"
                    ? "bg-red-100 text-red-800"
                    : item.severity === "Medium"
                      ? "bg-[#D4876F]/20 text-[#D4876F]"
                      : "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                }
              >
                {item.severity}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Natural Language Processing */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#7A9B8E]" />
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Message Sentiment Analysis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { sentiment: "Positive", percentage: 68, color: "bg-[#7A9B8E]" },
              { sentiment: "Neutral", percentage: 24, color: "bg-[#B8A9D4]" },
              { sentiment: "Negative", percentage: 8, color: "bg-[#D4876F]" },
            ].map((item) => (
              <div key={item.sentiment} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.sentiment}</span>
                  <span className="text-muted-foreground">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${item.percentage}%` }}
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
