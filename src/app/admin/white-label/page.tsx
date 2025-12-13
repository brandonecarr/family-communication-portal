"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Palette,
  Globe,
  Mail,
  Settings,
  Eye,
  Save,
  Copy,
} from "lucide-react";

export default function AdminWhiteLabelPage() {
  const [supportPhone, setSupportPhone] = useState("+1 (555) 123-4567");
  const supabase = createClient();
  const router = useRouter();

  // Format phone number as (xxx) xxx-xxxx
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length === 0) return "";
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSupportPhone(formatted);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            White Label Configuration
          </h1>
          <p className="text-muted-foreground">
            Customize the platform for your brand
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>

      {/* Brand Settings */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Brand Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Your Hospice Agency"
              defaultValue="Your Hospice Agency"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-tagline">Tagline</Label>
            <Input
              id="org-tagline"
              placeholder="Compassionate care, always connected"
              defaultValue="Compassionate care, always connected"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="support@youragency.com"
              defaultValue="support@youragency.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-phone">Support Phone</Label>
            <Input
              id="support-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={supportPhone}
              onChange={handlePhoneChange}
              maxLength={14}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Color Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Primary Color", value: "#7A9B8E", name: "primary" },
            { label: "Secondary Color", value: "#B8A9D4", name: "secondary" },
            { label: "Accent Color", value: "#D4876F", name: "accent" },
            { label: "Background Color", value: "#FAF8F5", name: "background" },
          ].map((color) => (
            <div key={color.name} className="space-y-2">
              <Label htmlFor={color.name}>{color.label}</Label>
              <div className="flex gap-2">
                <Input
                  id={color.name}
                  type="color"
                  defaultValue={color.value}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  defaultValue={color.value}
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Domain Configuration */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Domain Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Custom Domain</Label>
            <Input
              id="custom-domain"
              placeholder="family.youragency.com"
              defaultValue="family.youragency.com"
            />
            <p className="text-xs text-muted-foreground">
              Point your domain to: portal.familycommunication.app
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssl-status">SSL Certificate Status</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                Active
              </Badge>
              <span className="text-sm text-muted-foreground">
                Expires: 2025-01-15
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>DNS Records</Label>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span>CNAME: family → portal.familycommunication.app</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Customization */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Email Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-from">From Email Address</Label>
            <Input
              id="email-from"
              type="email"
              placeholder="noreply@youragency.com"
              defaultValue="noreply@youragency.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-from-name">From Name</Label>
            <Input
              id="email-from-name"
              placeholder="Your Hospice Agency"
              defaultValue="Your Hospice Agency"
            />
          </div>

          <div className="space-y-2">
            <Label>Email Templates</Label>
            <div className="space-y-2">
              {[
                "Welcome Email",
                "Visit Notification",
                "Message Received",
                "Password Reset",
              ].map((template) => (
                <Button
                  key={template}
                  variant="outline"
                  className="w-full justify-start rounded-lg"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {template}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo & Assets */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Logo & Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "Logo", size: "512x512px" },
            { name: "Favicon", size: "32x32px" },
            { name: "Hero Image", size: "1920x1080px" },
          ].map((asset) => (
            <div key={asset.name} className="space-y-2">
              <Label>{asset.name}</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Recommended: {asset.size}
                </p>
                <Button variant="outline" size="sm" className="rounded-full">
                  Upload
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* White Label Status */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            White Label Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { feature: "Custom Domain", status: "Configured" },
            { feature: "Custom Branding", status: "Configured" },
            { feature: "Custom Email", status: "Configured" },
            { feature: "Custom Logo", status: "Pending" },
            { feature: "Custom Colors", status: "Configured" },
          ].map((item) => (
            <div
              key={item.feature}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <span className="font-medium text-sm">{item.feature}</span>
              <Badge
                className={
                  item.status === "Configured"
                    ? "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                    : "bg-[#B8A9D4]/20 text-[#B8A9D4]"
                }
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Configuration */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Save className="h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
