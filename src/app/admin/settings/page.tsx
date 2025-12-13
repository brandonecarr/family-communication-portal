import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Bell,
  Shield,
  Database,
  Mail,
  Save
} from "lucide-react";

export default async function AdminSettingsPage() {
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
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system settings and preferences
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Notification Settings */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <div>
                <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  Notification Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how and when notifications are sent
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for important events
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send text message notifications
                </p>
              </div>
              <Switch id="sms-notifications" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send browser push notifications
                </p>
              </div>
              <Switch id="push-notifications" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#B8A9D4]/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#B8A9D4]" />
              </div>
              <div>
                <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  Security Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage security and access controls
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for admin accounts
                </p>
              </div>
              <Switch id="two-factor" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="session-timeout">Auto Logout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out inactive users
                </p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-duration">Session Duration (minutes)</Label>
              <Input
                id="session-duration"
                type="number"
                defaultValue="30"
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#D4876F]/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-[#D4876F]" />
              </div>
              <div>
                <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  Email Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure email sending settings
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email Address</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="noreply@youragency.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                type="text"
                placeholder="Your Hospice Agency"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-To Email</Label>
              <Input
                id="reply-to"
                type="email"
                placeholder="support@youragency.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Data & Backup */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <div>
                <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  Data & Backup
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage data retention and backups
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-backup">Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Daily automated database backups
                </p>
              </div>
              <Switch id="auto-backup" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention">Data Retention Period (days)</Label>
              <Input
                id="retention"
                type="number"
                defaultValue="365"
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                How long to keep historical data
              </p>
            </div>

            <Button variant="outline" className="rounded-full">
              Export All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
