import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Shield, 
  Bell, 
  Database,
  Globe,
  Lock,
  Mail,
  Server
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          Platform Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global platform settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="soft-shadow border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7A9B8E]/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#7A9B8E]" />
              </div>
              <div>
                <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Platform Name</Label>
              <Input 
                id="platform_name" 
                defaultValue="Family Communication Portal"
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input 
                id="support_email" 
                type="email"
                defaultValue="support@hospiceportal.com"
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Disable access for non-admins</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="soft-shadow border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4876F]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#D4876F]" />
              </div>
              <div>
                <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>Security</CardTitle>
                <CardDescription>Security and authentication settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Require 2FA for all admins</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">IP Whitelisting</p>
                <p className="text-sm text-muted-foreground">Restrict admin access by IP</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="soft-shadow border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B8A9D4]/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#B8A9D4]" />
              </div>
              <div>
                <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>Notifications</CardTitle>
                <CardDescription>Email and push notification settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send email alerts to admins</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New Facility Alerts</p>
                <p className="text-sm text-muted-foreground">Notify when facilities are created</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Error Alerts</p>
                <p className="text-sm text-muted-foreground">Notify on system errors</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Data Settings */}
        <Card className="soft-shadow border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>Data Management</CardTitle>
                <CardDescription>Backup and data retention settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automatic Backups</p>
                <p className="text-sm text-muted-foreground">Daily database backups</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Data Retention Period</Label>
              <Input 
                type="number"
                defaultValue="365"
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
              <p className="text-xs text-muted-foreground">Days to retain audit logs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API & Integrations */}
      <Card className="soft-shadow border-0 bg-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>API & Integrations</CardTitle>
              <CardDescription>Manage API access and third-party integrations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-muted-foreground">Enable external API access</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">Limit API requests per minute</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Webhook Events</p>
                  <p className="text-sm text-muted-foreground">Send events to external systems</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SSO Integration</p>
                  <p className="text-sm text-muted-foreground">Enable single sign-on</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
