import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const notificationTypes = [
    {
      id: "visit_scheduled",
      name: "Visit Scheduled",
      description: "Notify families when a visit is scheduled",
      channels: ["email", "sms", "push"],
      enabled: true,
    },
    {
      id: "visit_completed",
      name: "Visit Completed",
      description: "Notify families when a visit is completed",
      channels: ["email", "sms", "push"],
      enabled: true,
    },
    {
      id: "message_received",
      name: "Message Received",
      description: "Notify families when they receive a message",
      channels: ["email", "sms", "push"],
      enabled: true,
    },
    {
      id: "delivery_update",
      name: "Delivery Update",
      description: "Notify families about delivery status changes",
      channels: ["email", "sms"],
      enabled: true,
    },
    {
      id: "supply_fulfilled",
      name: "Supply Request Fulfilled",
      description: "Notify families when supply requests are fulfilled",
      channels: ["email", "sms"],
      enabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Notification Settings
          </h1>
          <p className="text-muted-foreground">
            Configure notification preferences and templates
          </p>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Notification Types</h2>
        {notificationTypes.map((type) => (
          <Card
            key={type.id}
            className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <Badge
                      className={
                        type.enabled
                          ? "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {type.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                  <div className="flex items-center gap-2">
                    {type.channels.map((channel) => (
                      <Badge
                        key={channel}
                        variant="outline"
                        className="capitalize"
                      >
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Switch defaultChecked={type.enabled} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Email Template Settings */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-name">From Name</Label>
            <Input
              id="from-name"
              placeholder="Your Hospice Agency"
              defaultValue="Your Hospice Agency"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="from-email">From Email</Label>
            <Input
              id="from-email"
              type="email"
              placeholder="noreply@youragency.com"
              defaultValue="noreply@youragency.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply-to">Reply-To Email</Label>
            <Input
              id="reply-to"
              type="email"
              placeholder="support@youragency.com"
              defaultValue="support@youragency.com"
            />
          </div>

          <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
            Edit Email Templates
          </Button>
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            SMS Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send text message notifications to families
              </p>
            </div>
            <Switch id="sms-enabled" defaultChecked />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sms-sender">SMS Sender ID</Label>
            <Input
              id="sms-sender"
              placeholder="YourAgency"
              defaultValue="YourAgency"
            />
          </div>

          <Button variant="outline" className="rounded-full">
            Configure SMS Provider
          </Button>
        </CardContent>
      </Card>

      {/* Push Notification Settings */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-enabled">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send browser and mobile push notifications
              </p>
            </div>
            <Switch id="push-enabled" defaultChecked />
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Push notifications are configured and ready to use. Families will
              receive notifications on their devices when enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
