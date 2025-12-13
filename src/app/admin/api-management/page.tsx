import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Code,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Lock,
} from "lucide-react";

export default async function AdminAPIManagementPage() {
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
            API Management
          </h1>
          <p className="text-muted-foreground">
            Manage API keys and integrations
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Generate API Key
        </Button>
      </div>

      {/* API Documentation */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              endpoint: "GET /api/patients",
              description: "Retrieve list of patients",
              rateLimit: "1000 req/hour",
            },
            {
              endpoint: "POST /api/messages",
              description: "Send a new message",
              rateLimit: "500 req/hour",
            },
            {
              endpoint: "GET /api/visits",
              description: "Retrieve visit schedule",
              rateLimit: "1000 req/hour",
            },
            {
              endpoint: "PUT /api/visits/:id",
              description: "Update visit status",
              rateLimit: "500 req/hour",
            },
          ].map((api, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/30 flex items-start justify-between"
            >
              <div>
                <p className="font-mono text-sm font-medium">{api.endpoint}</p>
                <p className="text-xs text-muted-foreground">
                  {api.description}
                </p>
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                {api.rateLimit}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Active API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              name: "Production API Key",
              key: "sk_live_••••••••••••••••••••••••",
              created: "2024-01-15",
              lastUsed: "2024-01-20 10:30 AM",
              status: "Active",
            },
            {
              name: "Development API Key",
              key: "sk_test_••••••••••••••••••••••••",
              created: "2024-01-10",
              lastUsed: "2024-01-20 02:15 AM",
              status: "Active",
            },
            {
              name: "Staging API Key",
              key: "sk_stage_•••••••••••••••••••••••",
              created: "2024-01-05",
              lastUsed: "2024-01-18 04:45 PM",
              status: "Active",
            },
          ].map((apiKey, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{apiKey.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {apiKey.key}
                  </p>
                </div>
                <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                  {apiKey.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created: {apiKey.created}</span>
                <span>Last used: {apiKey.lastUsed}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1 text-xs"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Rotate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Rate Limiting Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Requests per Hour</label>
            <Input
              type="number"
              defaultValue="1000"
              className="max-w-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Burst Limit</label>
            <Input
              type="number"
              defaultValue="100"
              className="max-w-xs"
            />
          </div>

          <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Management */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Webhooks
            </CardTitle>
            <Button
              size="sm"
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              event: "visit.completed",
              url: "https://yourdomain.com/webhooks/visits",
              status: "Active",
              lastTriggered: "2024-01-20 10:15 AM",
            },
            {
              event: "message.received",
              url: "https://yourdomain.com/webhooks/messages",
              status: "Active",
              lastTriggered: "2024-01-20 09:45 AM",
            },
            {
              event: "delivery.updated",
              url: "https://yourdomain.com/webhooks/deliveries",
              status: "Inactive",
              lastTriggered: "2024-01-18 03:20 PM",
            },
          ].map((webhook, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/30 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm font-medium">{webhook.event}</p>
                  <p className="text-xs text-muted-foreground">{webhook.url}</p>
                </div>
                <Badge
                  className={
                    webhook.status === "Active"
                      ? "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {webhook.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Last triggered: {webhook.lastTriggered}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Usage */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            API Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { endpoint: "GET /api/patients", requests: "45,230", percentage: 35 },
            { endpoint: "POST /api/messages", requests: "32,150", percentage: 25 },
            { endpoint: "GET /api/visits", requests: "28,900", percentage: 22 },
            { endpoint: "PUT /api/visits/:id", requests: "23,720", percentage: 18 },
          ].map((usage) => (
            <div key={usage.endpoint} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{usage.endpoint}</span>
                <span className="text-muted-foreground">{usage.requests}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7A9B8E] rounded-full"
                  style={{ width: `${usage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
