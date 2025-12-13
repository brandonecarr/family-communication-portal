"use client";

import { Activity, CheckCircle2, Package, MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activities = [
  {
    id: 1,
    type: "visit",
    message: "Visit completed for John Smith",
    time: "5 min ago",
    icon: CheckCircle2,
    color: "text-primary",
  },
  {
    id: 2,
    type: "delivery",
    message: "Medication delivered to Mary Johnson",
    time: "20 min ago",
    icon: Package,
    color: "text-secondary",
  },
  {
    id: 3,
    type: "message",
    message: "New message from Robert Davis family",
    time: "1 hour ago",
    icon: MessageSquare,
    color: "text-accent",
  },
  {
    id: 4,
    type: "visit",
    message: "Visit scheduled for Sarah Williams",
    time: "2 hours ago",
    icon: Calendar,
    color: "text-primary",
  },
];

export default function RecentActivity() {
  return (
    <Card className="soft-shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
