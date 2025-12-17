import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Filter,
  Download,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Mock audit logs data
  const logs = [
    {
      id: "1",
      user_email: "admin@agency.com",
      action: "create",
      resource_type: "Patient",
      description: "Created new patient record",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      ip_address: "192.168.1.1",
      changes: { name: "John Doe", status: "active" },
    },
    {
      id: "2",
      user_email: "staff@agency.com",
      action: "update",
      resource_type: "Visit",
      description: "Updated visit status to completed",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ip_address: "192.168.1.2",
      changes: { status: "completed" },
    },
    {
      id: "3",
      user_email: "admin@agency.com",
      action: "delete",
      resource_type: "Message",
      description: "Deleted message from queue",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      ip_address: "192.168.1.1",
      changes: null,
    },
  ];

  const actionColors: Record<string, string> = {
    create: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    update: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    delete: "bg-red-100 text-red-800",
    view: "bg-muted text-muted-foreground",
    export: "bg-[#D4876F]/20 text-[#D4876F]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-full"
        >
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2 rounded-full">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="grid gap-3">
        {logs?.map((log: any) => {
          const config =
            actionColors[log.action as keyof typeof actionColors] ||
            actionColors.view;
          const ActionIcon =
            log.action === "delete"
              ? AlertCircle
              : log.action === "create"
                ? CheckCircle2
                : Clock;

          return (
            <Card
              key={log.id}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <ActionIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={config}>
                          {log.action.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.resource_type}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {log.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_email || "System"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.ip_address && (
                          <span className="text-xs">IP: {log.ip_address}</span>
                        )}
                      </div>

                      {log.changes && (
                        <div className="mt-2 text-xs bg-muted/30 rounded p-2">
                          <p className="font-medium mb-1">Changes:</p>
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {logs?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No logs found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Audit logs will appear here as system activities occur
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
