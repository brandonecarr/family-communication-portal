"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Send,
  MessageSquare,
  Users,
  Plus,
  Archive,
  ArrowLeft,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "../../../../supabase/client";
import {
  getMessageThreads,
  getThreadWithMessages,
  createMessageThread,
  sendThreadMessage,
  markThreadAsRead,
  getAvailableRecipients,
  getArchivedThreads,
  type MessageThread,
  type ThreadMessage,
} from "@/lib/actions/internal-messages";

interface FamilyMessagesClientProps {
  currentUserId: string;
  patientId?: string;
}

export default function FamilyMessagesClient({
  currentUserId,
  patientId,
}: FamilyMessagesClientProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [archivedThreads, setArchivedThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // New conversation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, [showArchived]);

  // Load messages when thread is selected
  useEffect(() => {
    if (selectedThread) {
      loadThreadMessages(selectedThread.id);
    }
  }, [selectedThread?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedThread) return;

    const channel = supabase
      .channel(`thread:${selectedThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${selectedThread.id}`,
        },
        () => {
          loadThreadMessages(selectedThread.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThread?.id]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      // Family members can only see family messages
      if (showArchived) {
        const archived = await getArchivedThreads("family");
        setArchivedThreads(archived);
        setThreads([]);
      } else {
        const data = await getMessageThreads("family", false);
        setThreads(data);
        setArchivedThreads([]);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      const data = await getThreadWithMessages(threadId);
      setMessages(data.messages || []);
      setSelectedThread(data);
      await markThreadAsRead(threadId);
      loadThreads();
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedThread || !newMessage.trim()) return;

    setSending(true);
    try {
      await sendThreadMessage(selectedThread.id, newMessage.trim());
      setNewMessage("");
      await loadThreadMessages(selectedThread.id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCreateThread = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    try {
      const thread = await createMessageThread({
        category: "family",
        subject: newThreadSubject || undefined,
        participantIds: selectedRecipients,
        initialMessage: initialMessage || undefined,
      });

      setCreateDialogOpen(false);
      setSelectedRecipients([]);
      setNewThreadSubject("");
      setInitialMessage("");
      setRecipientSearchQuery("");

      await loadThreads();
      setSelectedThread(thread);

      toast({
        title: "Success",
        description: "Conversation created",
      });
    } catch (error: any) {
      console.error("Error creating thread:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const handleOpenCreateDialog = async () => {
    try {
      const recipients = await getAvailableRecipients("family");
      setAvailableRecipients(recipients);
      setCreateDialogOpen(true);
    } catch (error) {
      console.error("Error loading recipients:", error);
      toast({
        title: "Error",
        description: "Failed to load recipients",
        variant: "destructive",
      });
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter threads by search
  const filteredThreads = (showArchived ? archivedThreads : threads).filter(
    (thread) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      const subject = thread.subject?.toLowerCase() || "";
      const participantNames =
        thread.participants
          ?.map((p: any) => p.user?.full_name?.toLowerCase() || "")
          .join(" ") || "";
      return subject.includes(searchLower) || participantNames.includes(searchLower);
    }
  );

  // Filter recipients by search
  const filteredRecipients = availableRecipients.filter((r) => {
    if (!recipientSearchQuery) return true;
    const searchLower = recipientSearchQuery.toLowerCase();
    const name = r.full_name?.toLowerCase() || "";
    const email = r.email?.toLowerCase() || "";
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const getThreadDisplayName = (thread: MessageThread) => {
    if (thread.subject) return thread.subject;
    const otherParticipants =
      thread.participants?.filter((p: any) => p.user_id !== currentUserId) || [];
    if (otherParticipants.length === 0) return "No participants";
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user?.full_name || otherParticipants[0].user?.name || otherParticipants[0].user?.email || "Unknown";
    }
    return `${otherParticipants[0].user?.full_name || otherParticipants[0].user?.name || "Unknown"} +${otherParticipants.length - 1} others`;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light" style={{ fontFamily: "Fraunces, serif" }}>
          Messages
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setSelectedThread(null);
            }}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "View Active" : "View Archives"}
          </Button>
          <Button
            onClick={handleOpenCreateDialog}
            className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Thread List */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#FAF8F5] border-none"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-22rem)]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {showArchived
                    ? "No archived conversations"
                    : "No conversations yet"}
                </div>
              ) : (
                <div className="space-y-1 px-2">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedThread?.id === thread.id
                          ? "bg-[#7A9B8E]/10 border border-[#7A9B8E]/30"
                          : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#7A9B8E]/10 text-[#7A9B8E]">
                            {thread.is_group ? (
                              <Users className="h-5 w-5" />
                            ) : (
                              getInitials(getThreadDisplayName(thread))
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">
                              {getThreadDisplayName(thread)}
                            </h4>
                            {(thread.unread_count || 0) > 0 && (
                              <Badge className="bg-[#D4876F] text-white text-xs">
                                {thread.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(thread.last_message_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2 flex flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedThread(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#7A9B8E]/10 text-[#7A9B8E]">
                        {selectedThread.is_group ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(getThreadDisplayName(selectedThread))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {getThreadDisplayName(selectedThread)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedThread.participants?.length || 0} participants
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isOwn
                              ? "bg-[#7A9B8E] text-white rounded-2xl rounded-br-md"
                              : "bg-[#FAF8F5] rounded-2xl rounded-bl-md"
                          } p-3`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-medium mb-1 text-[#7A9B8E]">
                              {message.sender?.full_name || message.sender?.name || message.sender?.email || "Unknown"}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 ${
                              isOwn ? "text-white/70" : "text-muted-foreground"
                            }`}
                          >
                            <span className="text-xs">
                              {format(new Date(message.created_at), "h:mm a")}
                            </span>
                            {isOwn && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              {!showArchived && (
                <div className="p-4 border-t">
                  <div className="flex items-end gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[60px] max-h-[120px] resize-none bg-[#FAF8F5] border-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-[60px] px-6"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Conversation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              New Conversation
            </DialogTitle>
            <DialogDescription>
              Start a conversation with care team members or other family members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                placeholder="Enter a subject for this conversation"
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                className="bg-[#FAF8F5] border-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Recipients</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipients..."
                  value={recipientSearchQuery}
                  onChange={(e) => setRecipientSearchQuery(e.target.value)}
                  className="pl-10 bg-[#FAF8F5] border-none"
                />
              </div>
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                {filteredRecipients.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No recipients available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedRecipients.includes(recipient.id)
                            ? "bg-[#7A9B8E]/10"
                            : "hover:bg-[#FAF8F5]"
                        }`}
                        onClick={() => toggleRecipient(recipient.id)}
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(recipient.id)}
                          onCheckedChange={() => toggleRecipient(recipient.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#7A9B8E]/10 text-[#7A9B8E] text-xs">
                            {getInitials(recipient.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {recipient.full_name || recipient.email}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {recipient.role?.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedRecipients.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedRecipients.length} recipient(s) selected
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Initial Message (optional)</Label>
              <Textarea
                placeholder="Type your first message..."
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="min-h-[80px] bg-[#FAF8F5] border-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={selectedRecipients.length === 0}
              className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white"
            >
              Create Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
