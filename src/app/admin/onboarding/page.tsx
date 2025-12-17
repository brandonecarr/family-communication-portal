import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Users,
  Settings,
  FileText,
  Zap,
} from "lucide-react";

export default async function AdminOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  const steps = [
    {
      number: 1,
      title: "Complete Agency Profile",
      description: "Set up your agency information and branding",
      completed: true,
      icon: Settings,
    },
    {
      number: 2,
      title: "Add Team Members",
      description: "Invite staff and assign roles",
      completed: true,
      icon: Users,
    },
    {
      number: 3,
      title: "Configure Settings",
      description: "Set up notifications, security, and compliance",
      completed: false,
      icon: Settings,
    },
    {
      number: 4,
      title: "Add Patients",
      description: "Create patient records and family contacts",
      completed: false,
      icon: FileText,
    },
    {
      number: 5,
      title: "Set Up Integrations",
      description: "Connect EHR and other systems",
      completed: false,
      icon: Zap,
    },
    {
      number: 6,
      title: "Launch Portal",
      description: "Go live with the family portal",
      completed: false,
      icon: CheckCircle2,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-light mb-2"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Setup Wizard
        </h1>
        <p className="text-muted-foreground">
          Complete these steps to get your platform ready
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Setup Progress
                </p>
                <p
                  className="text-3xl font-light"
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {completedSteps} of {steps.length} Complete
                </p>
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                {Math.round(progressPercentage)}%
              </Badge>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7A9B8E] rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isNext = !step.completed && idx === steps.findIndex((s) => !s.completed);

          return (
            <Card
              key={step.number}
              className={`border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                isNext ? "ring-2 ring-[#7A9B8E]" : ""
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-[#7A9B8E]" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {step.number}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                      {step.completed && (
                        <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                          Completed
                        </Badge>
                      )}
                      {isNext && (
                        <Badge className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                          Next
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {step.description}
                    </p>

                    {!step.completed && (
                      <Button
                        size="sm"
                        className={
                          isNext
                            ? "bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1"
                            : "rounded-full gap-1"
                        }
                        variant={isNext ? "default" : "outline"}
                      >
                        {isNext ? "Start" : "Pending"}
                        {isNext && <ArrowRight className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Start with your agency profile to establish branding",
            "Add at least one admin user before inviting other staff",
            "Configure security settings before going live",
            "Test the family portal with a sample patient first",
            "Review all integrations before launching",
            "Schedule a training session for your team",
          ].map((tip, idx) => (
            <div key={idx} className="flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#7A9B8E] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Need help with setup? Our team is ready to assist.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                className="rounded-full"
              >
                View Documentation
              </Button>
              <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
