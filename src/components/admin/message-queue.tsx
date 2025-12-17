"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Clock, AlertCircle, User, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { getClientAgencyId } from "@/lib/client-auth";

interface ThreadMessage {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  sender: {
    full_name: string | null;
    name: string | null;
    email: string;
  };
}

interface Participant {
  id: string;
  full_name: string | null;
  name: string | null;
  email: string;
}

interface MessageThread {
  id: string;
  subject: string | null;
  category: string;
  last_message_at: string;
  created_at: string;
  is_group: boolean;
  unread_count: number;
  last_message: ThreadMessage | null;
  participants?: Participant[];
}

export default function MessageQueue() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchThreads = useCallback(async () => {
    try {
      setError(null);
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        // Silently handle auth errors - user might not be logged in yet
        setLoading(false);
        return;
      }
      if (!user) {
        setLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);

      // CRITICAL: Get agency ID for filtering
      const currentAgencyId = await getClientAgencyId();
      if (!currentAgencyId) {
        // No agency - show no threads
        setThreads([]);
        setLoading(false);
        return;
      }
      setAgencyId(currentAgencyId);

      // Get threads where user is a participant
      const { data: participantThreads, error: threadsError } = await supabase
        .from("thread_participants")
        .select("thread_id, last_read_at")
        .eq("user_id", user.id);

      if (threadsError) {
        console.error("Error fetching participant threads:", threadsError);
        setLoading(false);
        return;
      }

      if (!participantThreads || participantThreads.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const threadIds = participantThreads.map(pt => pt.thread_id);

      // Get thread details with last message - CRITICAL: Filter by agency
      const { data: threadsData, error: detailsError } = await supabase
        .from("message_threads")
        .select(`
          id,
          subject,
          category,
          last_message_at,
          created_at,
          is_group,
          archived_at,
          agency_id
        `)
        .in("id", threadIds)
        .eq("agency_id", currentAgencyId) // CRITICAL: Filter by agency
        .is("archived_at", null)
        .order("last_message_at", { ascending: false })
        .limit(5);

      if (detailsError) {
        console.error("Error fetching thread details:", detailsError);
        setLoading(false);
        return;
      }

      if (!threadsData) {
        setThreads([]);
        setLoading(false);
        return;
      }

      // Get last message for each thread
      const threadsWithMessages = await Promise.all(
        threadsData.map(async (thread) => {
          const participant = participantThreads.find(pt => pt.thread_id === thread.id);
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from("thread_messages")
            .select(`
              id,
              thread_id,
              body,
              created_at,
              sender_id
            `)
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get sender details separately if we have a message
          let senderData = null;
          if (lastMessage?.sender_id) {
            const { data: sender } = await supabase
              .from("users")
              .select("full_name, name, email")
              .eq("id", lastMessage.sender_id)
              .single();
            senderData = sender;
          }

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from("thread_messages")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", thread.id)
            .gt("created_at", participant?.last_read_at || "1970-01-01");

          // Transform the message with sender data
          const transformedMessage = lastMessage ? {
            ...lastMessage,
            sender: senderData || { full_name: null, name: null, email: '' }
          } : null;

          // Get participants for this thread
          const { data: participants } = await supabase
            .from("thread_participants")
            .select("user_id")
            .eq("thread_id", thread.id);

          // Get user details for participants
          let participantUsers: any[] = [];
          if (participants && participants.length > 0) {
            const participantIds = participants.map(p => p.user_id);
            const { data: users } = await supabase
              .from("users")
              .select("id, full_name, name, email")
              .in("id", participantIds);
            participantUsers = users || [];
          }

          return {
            ...thread,
            last_message: transformedMessage,
            unread_count: unreadCount || 0,
            participants: participantUsers,
          };
        })
      );

      setThreads(threadsWithMessages);
      retryCount.current = 0; // Reset retry count on success
    } catch (error: any) {
      // Handle network errors silently with retry
      if (error?.message?.includes("Load failed") || error?.message?.includes("fetch")) {
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          // Retry after a short delay
          setTimeout(fetchThreads, 1000 * retryCount.current);
          return;
        }
        setError("Unable to load messages. Please check your connection.");
      } else {
        console.error("Error in fetchThreads:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchThreads();

    // Subscribe to real-time updates for new messages
    const messagesChannel = supabase
      .channel("message-queue-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "thread_messages",
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for new threads
    const threadsChannel = supabase
      .channel("message-queue-threads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_threads",
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(threadsChannel);
    };
  }, [fetchThreads]);


  if (loading) {
    return (
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            <MessageSquare className="h-5 w-5 text-[#7A9B8E]" />
            Message Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              <MessageSquare className="h-5 w-5 text-[#7A9B8E]" />
              Message Queue
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                retryCount.current = 0;
                setLoading(true);
                fetchThreads();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
        {threads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent messages
          </div>
        ) : (
          threads.map((thread) => {
            // Get the other participant's name (not the current user)
            const otherParticipants = thread.participants?.filter(p => p.id !== currentUserId) || [];
            const displayName = otherParticipants.length > 0
              ? otherParticipants[0].full_name || otherParticipants[0].name || otherParticipants[0].email
              : thread.participants?.[0]?.full_name || thread.participants?.[0]?.name || "Unknown";
            
            // Truncate message preview to 30 characters
            const messagePreview = thread.last_message?.body 
              ? thread.last_message.body.length > 30 
                ? thread.last_message.body.substring(0, 30) + "..."
                : thread.last_message.body
              : "";
            
            return (
            <Link key={thread.id} href="/admin/messages">
              <div
                className="p-4 rounded-xl border bg-card hover:bg-[#7A9B8E]/5 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">
                        {displayName}
                      </h4>
                      {thread.unread_count > 0 && (
                        <Badge variant="default" className="bg-[#7A9B8E] text-white text-xs px-2 py-0">
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                    {thread.last_message && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {messagePreview}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="ml-2 capitalize text-xs"
                  >
                    {thread.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                  </span>
                  {thread.is_group && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Group
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
          })
        )}
      </CardContent>
    </Card>
  );
}
