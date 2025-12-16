"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Send,
  Paperclip,
  MessageSquare,
  User,
  Users,
  X,
  FileIcon,
  CheckCheck,
  Check,
  Plus,
  Archive,
  ArrowLeft,
  Building2,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  archiveThread,
  unarchiveThread,
  type MessageThread,
  type ThreadMessage,
} from "@/lib/actions/internal-messages";

interface MessagesClientProps {
  currentUserId: string;
  userRole: string;
}

export default function MessagesClientNew({
  currentUserId,
  userRole,
}: MessagesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is staff (can see internal messages)
  const isStaff = ["agency_admin", "agency_staff", "super_admin"].includes(userRole);

  // State - default to family tab for non-staff users
  const [activeTab, setActiveTab] = useState<"internal" | "family">(isStaff ? "internal" : "family");
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
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string | null>(null);

  // Load threads on mount and tab change
  useEffect(() => {
    loadThreads();
  }, [activeTab, showArchived]);

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
      if (showArchived) {
        const archived = await getArchivedThreads(activeTab);
        setArchivedThreads(archived);
        setThreads([]);
      } else {
        const data = await getMessageThreads(activeTab, false);
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
      // Refresh thread list to update unread counts
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
        category: activeTab,
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
      const recipients = await getAvailableRecipients(activeTab);
      setAvailableRecipients(recipients);
      setSelectedPatientFilter(null);
      setRecipientSearchQuery("");
      setSelectedRecipients([]);
      setNewThreadSubject("");
      setInitialMessage("");
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

  const handleArchiveThread = async (threadId: string) => {
    try {
      await archiveThread(threadId);
      setSelectedThread(null);
      await loadThreads();
      toast({
        title: "Success",
        description: "Conversation archived",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive conversation",
        variant: "destructive",
      });
    }
  };

  const handleUnarchiveThread = async (threadId: string) => {
    try {
      await unarchiveThread(threadId);
      await loadThreads();
      toast({
        title: "Success",
        description: "Conversation restored",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore conversation",
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

  // Filter recipients by search and patient filter
  const filteredRecipients = availableRecipients.filter((r) => {
    // For internal conversations, exclude family members
    if (activeTab === "internal" && r.role === "family_member") {
      return false;
    }
    
    // Apply patient filter for family members
    if (selectedPatientFilter && r.role === "family_member") {
      if (r.patient_id !== selectedPatientFilter) return false;
    }
    
    if (!recipientSearchQuery) return true;
    const searchLower = recipientSearchQuery.toLowerCase();
    const name = r.full_name?.toLowerCase() || "";
    const email = r.email?.toLowerCase() || "";
    const patientName = r.patient_name?.toLowerCase() || "";
    return name.includes(searchLower) || email.includes(searchLower) || patientName.includes(searchLower);
  });

  // Get unique patients from family members for the filter dropdown
  const uniquePatients = availableRecipients
    .filter((r) => r.role === "family_member" && r.patient_id && r.patient_name)
    .reduce((acc: { id: string; name: string }[], r) => {
      if (!acc.find((p) => p.id === r.patient_id)) {
        acc.push({ id: r.patient_id, name: r.patient_name });
      }
      return acc;
    }, []);

  const getThreadDisplayName = (thread: MessageThread) => {
    if (thread.subject) return thread.subject;
    const otherParticipants =
      thread.participants?.filter((p: any) => p.user_id !== currentUserId) || [];
    if (otherParticipants.length === 0) return "No participants";
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user?.full_name || otherParticipants[0].user?.email || "Unknown";
    }
    return `${otherParticipants[0].user?.full_name || "Unknown"} +${otherParticipants.length - 1} others`;
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
      <div className="mb-6">
        <h1 className="text-2xl font-light" style={{ fontFamily: "Fraunces, serif" }}>
          Messages
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Secure messaging for your care team and families
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as "internal" | "family");
          setSelectedThread(null);
          setShowArchived(false);
        }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList className={`grid ${isStaff ? "w-[400px] grid-cols-2" : "w-[200px] grid-cols-1"}`}>
            {isStaff && (
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Internal Messages
              </TabsTrigger>
            )}
            <TabsTrigger value="family" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Family Messages
            </TabsTrigger>
          </TabsList>

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
              New Conversation
            </Button>
          </div>
        </div>

        <TabsContent value="internal" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
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
                      {!showArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchiveThread(selectedThread.id)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      )}
                      {showArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchiveThread(selectedThread.id)}
                        >
                          Restore
                        </Button>
                      )}
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
                                  {message.sender?.full_name || message.sender?.email || "Unknown"}
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
                                {isOwn && (
                                  <CheckCheck className="h-3 w-3" />
                                )}
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
        </TabsContent>

        <TabsContent value="family" className="mt-0">
          {/* Same layout as internal, just different data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-16rem)]">
            {/* Thread List */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search family members..."
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
                              <AvatarFallback className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
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
                          <AvatarFallback className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
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
                      {!showArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchiveThread(selectedThread.id)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      )}
                      {showArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchiveThread(selectedThread.id)}
                        >
                          Restore
                        </Button>
                      )}
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
                                  ? "bg-[#B8A9D4] text-white rounded-2xl rounded-br-md"
                                  : "bg-[#FAF8F5] rounded-2xl rounded-bl-md"
                              } p-3`}
                            >
                              {!isOwn && (
                                <p className="text-xs font-medium mb-1 text-[#B8A9D4]">
                                  {message.sender?.full_name || message.sender?.email || "Unknown"}
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
                                {isOwn && (
                                  <CheckCheck className="h-3 w-3" />
                                )}
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
                          className="bg-[#B8A9D4] hover:bg-[#a899c4] text-white h-[60px] px-6"
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
        </TabsContent>
      </Tabs>

      {/* Create Conversation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              New {activeTab === "internal" ? "Internal" : "Family"} Conversation
            </DialogTitle>
            <DialogDescription>
              {activeTab === "internal"
                ? "Start a conversation with staff members. This will not be visible to patients or family members."
                : "Start a conversation with staff or family members."}
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
              {activeTab === "family" && uniquePatients.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  <Badge
                    variant={selectedPatientFilter === null ? "default" : "outline"}
                    className={`cursor-pointer ${selectedPatientFilter === null ? "bg-[#7A9B8E] hover:bg-[#6a8b7e]" : ""}`}
                    onClick={() => setSelectedPatientFilter(null)}
                  >
                    All
                  </Badge>
                  {uniquePatients.map((patient) => (
                    <Badge
                      key={patient.id}
                      variant={selectedPatientFilter === patient.id ? "default" : "outline"}
                      className={`cursor-pointer ${selectedPatientFilter === patient.id ? "bg-[#7A9B8E] hover:bg-[#6a8b7e]" : ""}`}
                      onClick={() => setSelectedPatientFilter(patient.id)}
                    >
                      {patient.name}
                    </Badge>
                  ))}
                </div>
              )}
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
                          <AvatarFallback className={`text-xs ${recipient.role === "family_member" ? "bg-[#B8A9D4]/20 text-[#B8A9D4]" : "bg-[#7A9B8E]/10 text-[#7A9B8E]"}`}>
                            {getInitials(recipient.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {recipient.full_name || recipient.name || recipient.email || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {recipient.role === "family_member" ? (
                              <>
                                <span className="capitalize">{recipient.relationship || "Family Member"}</span>
                                {recipient.patient_name && (
                                  <span className="text-[#7A9B8E]"> • {recipient.patient_name}</span>
                                )}
                              </>
                            ) : (
                              <span className="capitalize">{recipient.role?.replace("_", " ")}</span>
                            )}
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
