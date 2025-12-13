import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Bug,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";

export default async function AdminReleaseNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-light mb-2"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Release Notes
        </h1>
        <p className="text-muted-foreground">
          Latest updates and improvements
        </p>
      </div>

      {/* Version Timeline */}
      <div className="space-y-6">
        {[
          {
            version: "2.0.0",
            date: "2024-01-20",
            status: "Current",
            features: [
              "Advanced analytics dashboard",
              "AI-powered insights",
              "White label configuration",
              "API management console",
              "Enhanced security features",
            ],
            improvements: [
              "Performance optimization",
              "Mobile responsiveness",
              "Offline support",
              "Real-time notifications",
            ],
            bugFixes: [
              "Fixed message delivery delay",
              "Resolved visit scheduling conflict",
              "Improved error handling",
            ],
          },
          {
            version: "1.9.0",
            date: "2024-01-10",
            status: "Previous",
            features: [
              "Bereavement support automation",
              "Integration console",
              "Audit logging system",
            ],
            improvements: [
              "UI/UX improvements",
              "Database optimization",
            ],
            bugFixes: [
              "Fixed authentication issue",
              "Resolved notification timing",
            ],
          },
          {
            version: "1.8.0",
            date: "2023-12-25",
            status: "Previous",
            features: [
              "Compliance management",
              "Data management tools",
              "Team management system",
            ],
            improvements: [
              "Security enhancements",
              "API improvements",
            ],
            bugFixes: [
              "Fixed export functionality",
              "Resolved permission issues",
            ],
          },
        ].map((release) => (
          <Card
            key={release.version}
            className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2
                      className="text-2xl font-light"
                      style={{ fontFamily: "Fraunces, serif" }}
                    >
                      v{release.version}
                    </h2>
                    <Badge
                      className={
                        release.status === "Current"
                          ? "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {release.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Released {release.date}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Features */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[#7A9B8E]" />
                  <h3 className="font-semibold text-sm">New Features</h3>
                </div>
                <ul className="space-y-1 ml-6">
                  {release.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-[#7A9B8E]" />
                  <h3 className="font-semibold text-sm">Improvements</h3>
                </div>
                <ul className="space-y-1 ml-6">
                  {release.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {improvement}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bug Fixes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4 text-[#D4876F]" />
                  <h3 className="font-semibold text-sm">Bug Fixes</h3>
                </div>
                <ul className="space-y-1 ml-6">
                  {release.bugFixes.map((fix, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {fix}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roadmap */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Upcoming Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              feature: "Mobile App (iOS/Android)",
              eta: "Q2 2024",
              status: "In Development",
            },
            {
              feature: "Advanced Scheduling",
              eta: "Q2 2024",
              status: "In Development",
            },
            {
              feature: "Video Consultations",
              eta: "Q3 2024",
              status: "Planned",
            },
            {
              feature: "Multilingual Support",
              eta: "Q3 2024",
              status: "Planned",
            },
            {
              feature: "Advanced Reporting",
              eta: "Q4 2024",
              status: "Planned",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{item.feature}</p>
                <p className="text-xs text-muted-foreground">ETA: {item.eta}</p>
              </div>
              <Badge
                className={
                  item.status === "In Development"
                    ? "bg-[#B8A9D4]/20 text-[#B8A9D4]"
                    : "bg-muted text-muted-foreground"
                }
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
