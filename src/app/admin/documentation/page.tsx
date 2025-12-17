import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Download,
  ExternalLink,
  Search,
  FileText,
  Video,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function AdminDocumentationPage() {
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
            Documentation & Help
          </h1>
          <p className="text-muted-foreground">
            Comprehensive guides and resources
          </p>
        </div>
      </div>

      {/* Search Documentation */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              title: "Platform Overview",
              description: "Introduction to the Family Communication Portal",
              type: "Guide",
              duration: "5 min",
            },
            {
              title: "Admin Dashboard Walkthrough",
              description: "Learn how to navigate and use the admin dashboard",
              type: "Video",
              duration: "12 min",
            },
            {
              title: "Family Portal Setup",
              description: "Configure the family portal for your agency",
              type: "Guide",
              duration: "8 min",
            },
            {
              title: "User Management",
              description: "Add and manage team members and permissions",
              type: "Guide",
              duration: "6 min",
            },
          ].map((doc, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{doc.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {doc.description}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="text-xs">
                  {doc.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {doc.duration}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Guides */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Feature Guides
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              category: "Messaging",
              guides: [
                "Send Secure Messages",
                "Message Templates",
                "Bulk Messaging",
              ],
            },
            {
              category: "Visits",
              guides: [
                "Schedule Visits",
                "Update Visit Status",
                "Visit Notifications",
              ],
            },
            {
              category: "Reporting",
              guides: [
                "Generate Reports",
                "Export Data",
                "Analytics Dashboard",
              ],
            },
            {
              category: "Integration",
              guides: [
                "Connect EHR Systems",
                "API Integration",
                "Webhook Setup",
              ],
            },
          ].map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-semibold text-sm">{section.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {section.guides.map((guide) => (
                  <Button
                    key={guide}
                    variant="outline"
                    className="justify-start rounded-lg text-xs h-auto py-2"
                  >
                    <FileText className="h-3 w-3 mr-2" />
                    {guide}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
              title: "REST API Reference",
              description: "Complete API endpoint documentation",
            },
            {
              title: "Webhook Events",
              description: "Available webhook events and payloads",
            },
            {
              title: "Authentication",
              description: "API authentication and security",
            },
            {
              title: "Rate Limiting",
              description: "API rate limits and best practices",
            },
          ].map((doc, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full justify-start rounded-lg h-auto py-3"
            >
              <div className="text-left">
                <p className="font-medium text-sm">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.description}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              q: "How do I reset a user password?",
              a: "Navigate to Team Management, select the user, and click 'Reset Password'.",
            },
            {
              q: "Can I customize the email templates?",
              a: "Yes, go to Notifications settings to customize all email templates.",
            },
            {
              q: "How often are backups performed?",
              a: "Automatic daily backups are performed at 2 AM UTC.",
            },
            {
              q: "What is the maximum file upload size?",
              a: "Maximum file size is 50MB for documents and 100MB for videos.",
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/30 space-y-2"
            >
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-[#7A9B8E] mt-0.5 flex-shrink-0" />
                <p className="font-medium text-sm">{faq.q}</p>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Download Resources */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Download Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              name: "Admin User Guide",
              format: "PDF",
              size: "2.4 MB",
            },
            {
              name: "Family Portal Guide",
              format: "PDF",
              size: "1.8 MB",
            },
            {
              name: "API Integration Guide",
              format: "PDF",
              size: "3.2 MB",
            },
            {
              name: "Security Best Practices",
              format: "PDF",
              size: "1.5 MB",
            },
          ].map((resource, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{resource.name}</p>
                <p className="text-xs text-muted-foreground">
                  {resource.format} • {resource.size}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex gap-2">
            <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
              Contact Support
            </Button>
            <Button variant="outline" className="rounded-full">
              Schedule Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
