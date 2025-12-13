"use client";

import { MessageSquare, Package, FileText, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const actions = [
  {
    icon: MessageSquare,
    label: "Send Message",
    href: "/family/messages/new",
    color: "text-primary",
  },
  {
    icon: Package,
    label: "Request Supplies",
    href: "/family/supplies",
    color: "text-secondary",
  },
  {
    icon: FileText,
    label: "View Care Plan",
    href: "/family/care-plan",
    color: "text-accent",
  },
  {
    icon: Star,
    label: "Rate Last Visit",
    href: "/family/feedback",
    color: "text-terracotta",
  },
];

export default function QuickActions() {
  return (
    <Card className="soft-shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="w-full h-auto flex-col gap-2 py-4 hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-105"
              >
                <Icon className={`h-6 w-6 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
