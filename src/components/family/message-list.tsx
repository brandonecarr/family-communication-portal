"use client";

import { MessageSquare, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const messages = [
  {
    id: 1,
    subject: "Medication Question",
    preview: "I have a question about the new prescription...",
    sender: "Care Team",
    time: "2 hours ago",
    unread: true,
    priority: "high",
  },
  {
    id: 2,
    subject: "Visit Confirmation",
    preview: "Your visit has been confirmed for tomorrow...",
    sender: "Scheduling",
    time: "5 hours ago",
    unread: true,
  },
  {
    id: 3,
    subject: "Supply Delivery Update",
    preview: "Your supplies have been shipped and will arrive...",
    sender: "Supply Team",
    time: "Yesterday",
    unread: false,
  },
];

export default function MessageList() {
  return (
    <Card className="soft-shadow-lg border-0 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
          </span>
          <Button size="sm">New</Button>
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {messages.map((message) => (
          <button
            key={message.id}
            className={`w-full text-left p-4 rounded-lg border transition-all hover:bg-muted/50 ${
              message.unread
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-sm">{message.subject}</h4>
              {message.priority === "high" && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {message.preview}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{message.sender}</span>
              <span>{message.time}</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
