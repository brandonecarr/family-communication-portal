import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  Clock,
} from "lucide-react";

export default async function AdminCompliancePage() {
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
            Compliance Management
          </h1>
          <p className="text-muted-foreground">
            Track compliance requirements and audit trails
          </p>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">ACTIVE</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Compliance Status
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
                <FileText className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">CURRENT</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Active Policies
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              12
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">SCHEDULED</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Next Audit
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              45 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Requirements */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Compliance Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              requirement: "Data Encryption at Rest",
              framework: "HIPAA",
              status: "Compliant",
              lastChecked: "2024-01-20",
            },
            {
              requirement: "Data Encryption in Transit",
              framework: "HIPAA",
              status: "Compliant",
              lastChecked: "2024-01-20",
            },
            {
              requirement: "Access Controls",
              framework: "HIPAA",
              status: "Compliant",
              lastChecked: "2024-01-19",
            },
            {
              requirement: "Audit Logging",
              framework: "HIPAA",
              status: "Compliant",
              lastChecked: "2024-01-18",
            },
            {
              requirement: "Data Retention Policy",
              framework: "GDPR",
              status: "Compliant",
              lastChecked: "2024-01-17",
            },
            {
              requirement: "Right to be Forgotten",
              framework: "GDPR",
              status: "Compliant",
              lastChecked: "2024-01-16",
            },
          ].map((req, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{req.requirement}</p>
                <p className="text-xs text-muted-foreground">
                  Framework: {req.framework} | Last checked: {req.lastChecked}
                </p>
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                {req.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Processing Agreements */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Data Processing Agreements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              vendor: "Supabase",
              type: "Cloud Infrastructure",
              status: "Signed",
              expiryDate: "2025-12-31",
            },
            {
              vendor: "Twilio",
              type: "SMS Provider",
              status: "Signed",
              expiryDate: "2025-06-30",
            },
            {
              vendor: "SendGrid",
              type: "Email Provider",
              status: "Signed",
              expiryDate: "2025-09-30",
            },
          ].map((dpa, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{dpa.vendor}</p>
                <p className="text-xs text-muted-foreground">
                  {dpa.type} | Expires: {dpa.expiryDate}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                  {dpa.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1"
                >
                  <Download className="h-3 w-3" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy Policy & Terms */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Legal Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              document: "Privacy Policy",
              lastUpdated: "2024-01-15",
              version: "2.1",
            },
            {
              document: "Terms of Service",
              lastUpdated: "2024-01-10",
              version: "2.0",
            },
            {
              document: "Data Processing Agreement",
              lastUpdated: "2024-01-05",
              version: "1.5",
            },
            {
              document: "Business Associate Agreement",
              lastUpdated: "2023-12-20",
              version: "1.0",
            },
          ].map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{doc.document}</p>
                <p className="text-xs text-muted-foreground">
                  v{doc.version} | Updated: {doc.lastUpdated}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1"
                >
                  <FileText className="h-3 w-3" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit Schedule */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Audit Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              audit: "HIPAA Compliance Audit",
              frequency: "Quarterly",
              nextDate: "2024-04-15",
              status: "Scheduled",
            },
            {
              audit: "Security Assessment",
              frequency: "Semi-Annual",
              nextDate: "2024-07-01",
              status: "Scheduled",
            },
            {
              audit: "Data Protection Review",
              frequency: "Annual",
              nextDate: "2024-12-31",
              status: "Scheduled",
            },
          ].map((audit, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{audit.audit}</p>
                <p className="text-xs text-muted-foreground">
                  {audit.frequency} | Next: {audit.nextDate}
                </p>
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                {audit.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
