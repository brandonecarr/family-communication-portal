import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Download,
  Trash2,
  Archive,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default async function AdminDataManagementPage() {
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
            Data Management
          </h1>
          <p className="text-muted-foreground">
            Manage data retention, backups, and exports
          </p>
        </div>
      </div>

      {/* Data Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">ACTIVE</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Total Data Used
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              2.4 GB
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              of 100 GB allocated
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Archive className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">CURRENT</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Backup Status
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Daily
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last backup: 2 hours ago
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">HEALTHY</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Data Integrity
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              100%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Retention Policy */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Data Retention Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              dataType: "Patient Records",
              retention: "7 years",
              autoDelete: "Yes",
              lastReview: "2024-01-15",
            },
            {
              dataType: "Visit Records",
              retention: "5 years",
              autoDelete: "Yes",
              lastReview: "2024-01-15",
            },
            {
              dataType: "Messages",
              retention: "3 years",
              autoDelete: "Yes",
              lastReview: "2024-01-15",
            },
            {
              dataType: "Audit Logs",
              retention: "2 years",
              autoDelete: "Yes",
              lastReview: "2024-01-15",
            },
            {
              dataType: "Backup Files",
              retention: "1 year",
              autoDelete: "Yes",
              lastReview: "2024-01-15",
            },
          ].map((policy, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{policy.dataType}</p>
                <p className="text-xs text-muted-foreground">
                  Retention: {policy.retention} | Auto-delete: {policy.autoDelete}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
              >
                Edit
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Backup Management */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Backup Management
            </CardTitle>
            <Button
              size="sm"
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1"
            >
              <Archive className="h-4 w-4" />
              Create Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              name: "Daily Backup - 2024-01-20",
              size: "2.3 GB",
              date: "2024-01-20 02:00 AM",
              status: "Completed",
            },
            {
              name: "Daily Backup - 2024-01-19",
              size: "2.2 GB",
              date: "2024-01-19 02:00 AM",
              status: "Completed",
            },
            {
              name: "Weekly Backup - 2024-01-15",
              size: "2.1 GB",
              date: "2024-01-15 03:00 AM",
              status: "Completed",
            },
            {
              name: "Monthly Backup - 2024-01-01",
              size: "1.9 GB",
              date: "2024-01-01 04:00 AM",
              status: "Completed",
            },
          ].map((backup, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{backup.name}</p>
                <p className="text-xs text-muted-foreground">
                  {backup.size} | {backup.date}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                  {backup.status}
                </Badge>
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

      {/* Data Export */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export your data in various formats for analysis or migration
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { format: "CSV", description: "Spreadsheet format" },
              { format: "JSON", description: "JSON format" },
              { format: "PDF", description: "PDF report" },
              { format: "SQL", description: "Database dump" },
            ].map((format) => (
              <Button
                key={format.format}
                variant="outline"
                className="h-auto flex flex-col items-start gap-2 p-4 rounded-lg"
              >
                <span className="font-medium">{format.format}</span>
                <span className="text-xs text-muted-foreground">
                  {format.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Data Deletion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-red-900">
                  Permanent Data Deletion
                </p>
                <p className="text-sm text-red-800 mt-1">
                  This action cannot be undone. All data will be permanently
                  deleted from our systems.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                action: "Delete Archived Records",
                description: "Remove records older than retention period",
              },
              {
                action: "Delete Specific Patient Data",
                description: "Remove all data for a specific patient",
              },
              {
                action: "Delete All Data",
                description: "Permanently delete all agency data",
              },
            ].map((action, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="font-medium text-sm">{action.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
