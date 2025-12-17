import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Trash2,
  Clock,
} from "lucide-react";

export default async function AdminIntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Mock integrations data
  const integrations = [
    {
      id: "1",
      name: "Axxess",
      description: "EHR and patient management system",
      status: "connected",
      last_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      records_synced: 45,
      sync_frequency: "Hourly",
      error_message: null,
    },
    {
      id: "2",
      name: "Twilio",
      description: "SMS and voice communications",
      status: "connected",
      last_sync: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      records_synced: 128,
      sync_frequency: "Real-time",
      error_message: null,
    },
  ];

  const statusColors = {
    connected: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    disconnected: "bg-muted text-muted-foreground",
    error: "bg-red-100 text-red-800",
    syncing: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Integrations
          </h1>
          <p className="text-muted-foreground">
            Connect and manage third-party integrations
          </p>
        </div>
      </div>

      {/* Available Integrations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: "Axxess",
              description: "EHR and patient management system",
              icon: "🏥",
            },
            {
              name: "Twilio",
              description: "SMS and voice communications",
              icon: "📱",
            },
            {
              name: "SendGrid",
              description: "Email delivery service",
              icon: "📧",
            },
            {
              name: "Google Calendar",
              description: "Calendar synchronization",
              icon: "📅",
            },
          ].map((integration) => (
            <Card
              key={integration.name}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full"
                  >
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Connected Integrations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Connected Integrations</h2>
        <div className="grid gap-4">
          {integrations?.map((integration: any) => {
            const config =
              statusColors[
                integration.status as keyof typeof statusColors
              ] || statusColors.disconnected;
            const StatusIcon =
              integration.status === "connected"
                ? CheckCircle2
                : integration.status === "error"
                  ? AlertCircle
                  : integration.status === "syncing"
                    ? RefreshCw
                    : AlertCircle;

            return (
              <Card
                key={integration.id}
                className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {integration.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>
                        <Badge variant="outline" className={config}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {integration.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-muted-foreground">
                          <span className="font-medium">Last Sync:</span>
                          <p>
                            {integration.last_sync
                              ? new Date(
                                  integration.last_sync
                                ).toLocaleString()
                              : "Never"}
                          </p>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="font-medium">Records Synced:</span>
                          <p>{integration.records_synced || 0}</p>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="font-medium">Sync Frequency:</span>
                          <p>{integration.sync_frequency || "Manual"}</p>
                        </div>
                      </div>

                      {integration.status === "error" && (
                        <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800">
                          {integration.error_message ||
                            "Connection error occurred"}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Sync Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1"
                        >
                          <Settings className="h-4 w-4" />
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {integrations?.length === 0 && (
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No integrations connected
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Connect your first integration to sync data automatically
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sync Logs */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Recent Sync Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                integration: "Axxess",
                action: "Synced 45 patient records",
                time: "2 hours ago",
                status: "success",
              },
              {
                integration: "Twilio",
                action: "Sent 128 SMS notifications",
                time: "1 hour ago",
                status: "success",
              },
              {
                integration: "SendGrid",
                action: "Failed to send 3 emails",
                time: "30 minutes ago",
                status: "error",
              },
            ].map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {log.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-[#7A9B8E]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[#D4876F]" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{log.integration}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.action}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
