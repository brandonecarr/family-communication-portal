"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, AlertCircle, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Message {
  id: string;
  patient_id: string;
  body: string;
  priority: string;
  created_at: string;
  assigned_to?: string;
  status: string;
  patient: {
    name: string;
  };
  assigned_staff?: {
    name: string;
  };
}

export default function MessageQueue() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("message-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        patient:patients!patient_id (
          name
        )
      `)
      .in("status", ["sent", "delivered"])
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (error) {
      console.error("Error fetching messages:", error);
    }

    if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleAssign = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("messages")
        .update({
          assigned_to: user.id,
          status: "delivered",
        })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Message assigned",
        description: "You have been assigned to this message",
      });

      fetchMessages();
    } catch (error) {
      console.error("Error assigning message:", error);
      toast({
        title: "Error",
        description: "Failed to assign message",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            <MessageSquare className="h-5 w-5 text-[#7A9B8E]" />
            Message Queue
          </span>
          <Link href="/admin/messages">
            <Button size="sm" variant="outline" className="rounded-full">View All</Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No unread messages
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="p-4 rounded-xl border bg-card hover:bg-[#7A9B8E]/5 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{message.patient?.name || "Unknown Patient"}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{message.body}</p>
                </div>
                {message.priority === "high" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Urgent
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
                {message.status === "sent" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-full"
                    onClick={() => handleAssign(message.id)}
                  >
                    Assign to Me
                  </Button>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {message.assigned_staff?.name || "Assigned"}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
