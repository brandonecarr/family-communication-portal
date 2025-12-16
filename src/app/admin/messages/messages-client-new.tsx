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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  initialThreads?: MessageThread[];
  initialThreadMessages?: Record<string, ThreadMessage[]>;
}

export default function MessagesClientNew({
  currentUserId,
  userRole,
  initialThreads = [],
  initialThreadMessages = {},
}: MessagesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is staff (can see internal messages)
  const isStaff = ["agency_admin", "agency_staff", "super_admin"].includes(
    userRole,
  );

  // Initialize cache with server-fetched messages
  const messagesCache = useRef<Map<string, ThreadMessage[]>>(
    new Map(Object.entries(initialThreadMessages))
  );

  // State - default to family tab for non-staff users
  const [activeTab, setActiveTab] = useState<"internal" | "family">(
    isStaff ? "internal" : "family",
  );
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads);
  const [archivedThreads, setArchivedThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null,
  );
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(initialThreads.length === 0);
  const [showArchived, setShowArchived] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // New conversation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [initialMessage, setInitialMessage] = useState("");
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<
    string | null
  >(null);

  // Load threads on mount and tab change (skip if we have initial threads)
  useEffect(() => {
    if (initialThreads.length > 0 && !showArchived && activeTab === (isStaff ? "internal" : "family")) {
      setLoading(false);
      return;
    }
    loadThreads();
  }, [activeTab, showArchived]);

  // Pre-fetch messages for all threads in background
  useEffect(() => {
    if (threads.length === 0) return;
    
    threads.slice(1).forEach(async (thread) => {
      if (!messagesCache.current.has(thread.id)) {
        try {
          const data = await getThreadWithMessages(thread.id);
          messagesCache.current.set(thread.id, data.messages || []);
        } catch (e) {
          // Ignore errors
        }
      }
    });
  }, [threads]);

  // Messages are now loaded in the click handler

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for new messages and read receipts
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
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_receipts",
        },
        async (payload) => {
          // Check if this read receipt is for a message in the current thread
          const messageId = payload.new?.message_id || payload.old?.message_id;
          if (messageId) {
            // Reload messages to get updated read receipts
            const data = await getThreadWithMessages(selectedThread.id);
            setMessages(data.messages || []);
          }
        },
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
      // Check cache first for instant display
      const cachedMessages = messagesCache.current.get(threadId);
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
        setMessagesLoading(false);
      } else {
        setMessagesLoading(true);
      }
      
      // Fetch fresh data
      const data = await getThreadWithMessages(threadId);
      const newMessages = data.messages || [];
      
      // Update cache and state
      messagesCache.current.set(threadId, newMessages);
      setMessages(newMessages);
      setSelectedThread(data);
      setMessagesLoading(false);
      
      // Mark as read in background
      markThreadAsRead(threadId).then(() => {
        setThreads(prev => prev.map(t => 
          t.id === threadId ? { ...t, unread_count: 0 } : t
        ));
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessagesLoading(false);
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
        participantIds: selectedRecipients,
        initialMessage: initialMessage || undefined,
      });

      setCreateDialogOpen(false);
      setSelectedRecipients([]);
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
      console.log("Opening create dialog with activeTab:", activeTab);
      const recipients = await getAvailableRecipients(activeTab);
      console.log("Received recipients:", recipients);
      console.log(
        "Family members in recipients:",
        recipients.filter((r: any) => r.role === "family_member"),
      );
      setAvailableRecipients(recipients);
      setSelectedPatientFilter(null);
      setRecipientSearchQuery("");
      setSelectedRecipients([]);
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
        : [...prev, userId],
    );
  };

  // Filter threads by search
  const threadsList = showArchived ? archivedThreads : threads;
  const filteredThreads = (threadsList || []).filter((thread) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const participantNames =
      thread.participants
        ?.map((p: any) => p.user?.full_name?.toLowerCase() || "")
        .join(" ") || "";
    return participantNames.includes(searchLower);
  });

  // Filter recipients by search and patient filter
  const filteredRecipients = availableRecipients.filter((r) => {
    // For internal conversations, exclude family members
    if (activeTab === "internal" && r.role === "family_member") {
      return false;
    }

    // For family conversations, only show family members if a patient is selected
    if (activeTab === "family" && r.role === "family_member") {
      if (!selectedPatientFilter) return false;
      if (r.patient_id !== selectedPatientFilter) return false;
    }

    if (!recipientSearchQuery) return true;
    const searchLower = recipientSearchQuery.toLowerCase();
    const name = r.full_name?.toLowerCase() || "";
    const email = r.email?.toLowerCase() || "";
    const patientName = r.patient_name?.toLowerCase() || "";
    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      patientName.includes(searchLower)
    );
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
    const otherParticipants =
      thread.participants?.filter((p: any) => p.user_id !== currentUserId) ||
      [];
    if (otherParticipants.length === 0) return "No participants";
    if (otherParticipants.length === 1) {
      return (
        otherParticipants[0].user?.full_name ||
        otherParticipants[0].user?.email ||
        "Unknown"
      );
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
        <h1
          className="text-2xl font-light"
          style={{ fontFamily: "Fraunces, serif" }}
        >
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
          <TabsList
            className={`grid ${isStaff ? "w-[400px] grid-cols-2" : "w-[200px] grid-cols-1"}`}
          >
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
                          onClick={() => {
                            setSelectedThread(thread);
                            const cached = messagesCache.current.get(thread.id);
                            if (cached) setMessages(cached);
                            loadThreadMessages(thread.id);
                          }}
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
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className={`text-sm truncate ${(thread.unread_count || 0) > 0 ? "font-semibold" : "font-medium"}`}>
                                    {getThreadDisplayName(thread)}
                                  </h4>
                                  {(thread.unread_count || 0) > 0 && (
                                    <Badge className="bg-[#D4876F] text-white text-xs shrink-0">
                                      {thread.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatDistanceToNow(
                                    new Date(thread.last_message_at),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5rem] flex flex-row items-start gap-4">
                                {thread.last_message_preview ||
                                  "No messages yet"}
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-xs text-muted-foreground hover:text-[#7A9B8E] hover:underline cursor-pointer transition-colors">
                                {selectedThread.participants?.length || 0}{" "}
                                participants
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <div className="p-3 border-b bg-[#FAF8F5]">
                                <h4 className="font-semibold text-sm">
                                  Chat Participants
                                </h4>
                              </div>
                              <ScrollArea className="max-h-64">
                                <div className="p-2 space-y-1">
                                  {selectedThread.participants?.map(
                                    (participant: any) => (
                                      <div
                                        key={participant.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FAF8F5] transition-colors"
                                      >
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="bg-[#7A9B8E]/10 text-[#7A9B8E] text-xs">
                                            {getInitials(
                                              participant.user?.full_name ||
                                                participant.user?.email ||
                                                "?",
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {participant.user?.full_name ||
                                              "Unknown"}
                                            {participant.user_id ===
                                              currentUserId && (
                                              <span className="text-xs text-muted-foreground ml-1">
                                                (You)
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {participant.user?.job_role ||
                                              (participant.user?.role === "family_member"
                                                ? "Family Member"
                                                : "No role specified")}
                                          </p>
                                        </div>
                                        {participant.is_admin && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
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
                          onClick={() =>
                            handleUnarchiveThread(selectedThread.id)
                          }
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8">
                        <div className="text-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A9B8E] mx-auto mb-2"></div>
                          <p className="text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : (
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
                                  {message.sender?.full_name ||
                                    message.sender?.email ||
                                    "Unknown"}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">
                                {message.body}
                              </p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  isOwn
                                    ? "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span className="text-xs">
                                  {format(
                                    new Date(message.created_at),
                                    "h:mm a",
                                  )}
                                </span>
                                {isOwn && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    )}
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
                          onClick={() => {
                            setSelectedThread(thread);
                            const cached = messagesCache.current.get(thread.id);
                            if (cached) setMessages(cached);
                            loadThreadMessages(thread.id);
                          }}
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
                                <h4 className={`text-sm truncate ${(thread.unread_count || 0) > 0 ? "font-semibold" : "font-medium"}`}>
                                  {getThreadDisplayName(thread)}
                                </h4>
                                {(thread.unread_count || 0) > 0 && (
                                  <Badge className="bg-[#D4876F] text-white text-xs">
                                    {thread.unread_count}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(
                                  new Date(thread.last_message_at),
                                  {
                                    addSuffix: true,
                                  },
                                )}
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-xs text-muted-foreground hover:text-[#B8A9D4] hover:underline cursor-pointer transition-colors">
                                {selectedThread.participants?.length || 0}{" "}
                                participants
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <div className="p-3 border-b bg-[#FAF8F5]">
                                <h4 className="font-semibold text-sm">
                                  Chat Participants
                                </h4>
                              </div>
                              <ScrollArea className="max-h-64">
                                <div className="p-2 space-y-1">
                                  {selectedThread.participants?.map(
                                    (participant: any) => (
                                      <div
                                        key={participant.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#FAF8F5] transition-colors"
                                      >
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="bg-[#B8A9D4]/20 text-[#B8A9D4] text-xs">
                                            {getInitials(
                                              participant.user?.full_name ||
                                                participant.user?.email ||
                                                "?",
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {participant.user?.full_name ||
                                              "Unknown"}
                                            {participant.user_id ===
                                              currentUserId && (
                                              <span className="text-xs text-muted-foreground ml-1">
                                                (You)
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {participant.user?.job_role ||
                                              (participant.user?.role === "family_member"
                                                ? "Family Member"
                                                : "No role specified")}
                                          </p>
                                        </div>
                                        {participant.is_admin && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
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
                          onClick={() =>
                            handleUnarchiveThread(selectedThread.id)
                          }
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full py-8">
                        <div className="text-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A9B8E] mx-auto mb-2"></div>
                          <p className="text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : (
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
                                  {message.sender?.full_name ||
                                    message.sender?.email ||
                                    "Unknown"}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">
                                {message.body}
                              </p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  isOwn
                                    ? "text-white/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span className="text-xs">
                                  {format(
                                    new Date(message.created_at),
                                    "h:mm a",
                                  )}
                                </span>
                                {isOwn && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    )}
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
              New {activeTab === "internal" ? "Internal" : "Family"}{" "}
              Conversation
            </DialogTitle>
            <DialogDescription>
              {activeTab === "internal"
                ? "Start a conversation with staff members. This will not be visible to patients or family members."
                : "Start a conversation with staff or family members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Patient (optional)</Label>
              {uniquePatients.length > 0 ? (
                <Select
                  value={selectedPatientFilter || "all"}
                  onValueChange={(value) =>
                    setSelectedPatientFilter(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger className="bg-[#FAF8F5] border-none">
                    <SelectValue placeholder="All Patients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Patients</SelectItem>
                    {uniquePatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {activeTab === "family"
                    ? "No patients with family members found. Add family members to patients first."
                    : "No patients found. Add patients first."}
                </p>
              )}
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
                    {filteredRecipients.map((recipient) => {
                      const isMessageable =
                        recipient.role !== "family_member" ||
                        recipient.messageable !== false;
                      return (
                        <div
                          key={recipient.id}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            !isMessageable
                              ? "opacity-50 cursor-not-allowed"
                              : selectedRecipients.includes(recipient.id)
                                ? "bg-[#7A9B8E]/10 cursor-pointer"
                                : "hover:bg-[#FAF8F5] cursor-pointer"
                          }`}
                          onClick={() =>
                            isMessageable && toggleRecipient(recipient.id)
                          }
                        >
                          <Checkbox
                            checked={selectedRecipients.includes(recipient.id)}
                            onCheckedChange={() =>
                              isMessageable && toggleRecipient(recipient.id)
                            }
                            disabled={!isMessageable}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              className={`text-xs ${recipient.role === "family_member" ? "bg-[#B8A9D4]/20 text-[#B8A9D4]" : "bg-[#7A9B8E]/10 text-[#7A9B8E]"}`}
                            >
                              {getInitials(recipient.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {recipient.full_name ||
                                recipient.name ||
                                recipient.email ||
                                "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recipient.role === "family_member" ? (
                                <>
                                  <span className="capitalize">
                                    {recipient.relationship || "Family Member"}
                                  </span>
                                  {recipient.patient_name && (
                                    <span className="text-[#7A9B8E]">
                                      {" "}
                                      • {recipient.patient_name}
                                    </span>
                                  )}
                                  {!isMessageable && (
                                    <span className="text-[#D4876F]">
                                      {" "}
                                      • Invite pending
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="capitalize">
                                  {recipient.job_role ||
                                    recipient.role?.replace("_", " ")}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
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
