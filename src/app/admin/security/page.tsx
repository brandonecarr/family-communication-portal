import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";

export default async function AdminSecurityPage() {
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
            Security & Compliance
          </h1>
          <p className="text-muted-foreground">
            Manage security settings and compliance requirements
          </p>
        </div>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">SECURE</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Security Score
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              95/100
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                COMPLIANT
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              HIPAA Compliance
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              100%
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">ACTIVE</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Encryption Status
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              TLS 1.3
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Factor Authentication */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="2fa-enabled">Require 2FA for Admin Accounts</Label>
              <p className="text-sm text-muted-foreground">
                Enforce two-factor authentication for all administrators
              </p>
            </div>
            <Switch id="2fa-enabled" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="2fa-staff">Require 2FA for Staff Accounts</Label>
              <p className="text-sm text-muted-foreground">
                Enforce two-factor authentication for staff members
              </p>
            </div>
            <Switch id="2fa-staff" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="2fa-methods">Allowed 2FA Methods</Label>
            <div className="space-y-2">
              {["Authenticator App", "SMS", "Email"].map((method) => (
                <div key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={method}
                    defaultChecked
                    className="rounded"
                  />
                  <label htmlFor={method} className="text-sm">
                    {method}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Password Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min-length">Minimum Password Length</Label>
            <Input
              id="min-length"
              type="number"
              defaultValue="12"
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Password Requirements</Label>
            <div className="space-y-2">
              {[
                "Uppercase letters",
                "Lowercase letters",
                "Numbers",
                "Special characters",
              ].map((req) => (
                <div key={req} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={req}
                    defaultChecked
                    className="rounded"
                  />
                  <label htmlFor={req} className="text-sm">
                    {req}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Password Expiry (days)</Label>
            <Input
              id="expiry"
              type="number"
              defaultValue="90"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Session Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              defaultValue="30"
              className="max-w-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="concurrent-sessions">
                Limit Concurrent Sessions
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow only one active session per user
              </p>
            </div>
            <Switch id="concurrent-sessions" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ip-whitelist">IP Whitelist</Label>
              <p className="text-sm text-muted-foreground">
                Restrict access to specific IP addresses
              </p>
            </div>
            <Switch id="ip-whitelist" />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Certifications */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Compliance Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "HIPAA", status: "Compliant", lastAudit: "2024-01-15" },
            { name: "SOC 2 Type II", status: "Compliant", lastAudit: "2023-12-20" },
            { name: "GDPR", status: "Compliant", lastAudit: "2024-01-10" },
            { name: "CCPA", status: "Compliant", lastAudit: "2024-01-05" },
          ].map((cert) => (
            <div
              key={cert.name}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{cert.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last audit: {cert.lastAudit}
                </p>
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                {cert.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Audit Log */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Security Audit Log
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              event: "Failed login attempt",
              user: "unknown",
              ip: "203.0.113.45",
              time: "2 hours ago",
              severity: "warning",
            },
            {
              event: "Password changed",
              user: "admin@agency.com",
              ip: "192.168.1.1",
              time: "4 hours ago",
              severity: "info",
            },
            {
              event: "2FA enabled",
              user: "staff@agency.com",
              ip: "192.168.1.2",
              time: "1 day ago",
              severity: "info",
            },
          ].map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
            >
              <div className="mt-1">
                {log.severity === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-[#D4876F]" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-[#7A9B8E]" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{log.event}</p>
                <p className="text-xs text-muted-foreground">
                  User: {log.user} | IP: {log.ip}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {log.time}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
