"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { 
  Search, 
  Send, 
  Paperclip, 
  MessageSquare, 
  User,
  X,
  FileIcon,
  CheckCheck,
  Check,
  ExternalLink,
  Plus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "../../../../supabase/client";
import Link from "next/link";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  agency_id: string;
}

interface FamilyMember {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  status: string | null;
  patient_id: string;
  user_id: string | null;
  patient: Patient | null;
}

interface Message {
  id: string;
  patient_id: string;
  sender_id: string;
  sender_type: string;
  body: string;
  attachments?: string[];
  read: boolean;
  created_at: string;
  status: string;
}

interface ConversationMetadata {
  lastMessage: Message | null;
  unreadCount: number;
}

interface AdminMessagesClientProps {
  familyMembers: FamilyMember[];
  conversationMetadata: Record<string, ConversationMetadata>;
  currentUserId: string;
  initialPatientId?: string;
}

export default function AdminMessagesClient({
  familyMembers,
  conversationMetadata,
  currentUserId,
  initialPatientId,
}: AdminMessagesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientIdFromUrl = searchParams.get("patient") || initialPatientId;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSearchQuery, setCreateSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Auto-select family member based on URL parameter
  useEffect(() => {
    if (patientIdFromUrl && familyMembers.length > 0 && !selectedFamilyMember) {
      const familyMember = familyMembers.find(fm => fm.patient_id === patientIdFromUrl);
      if (familyMember) {
        setSelectedFamilyMember(familyMember);
      }
    }
  }, [patientIdFromUrl, familyMembers]);

  // Update URL when selecting a conversation
  const handleSelectFamilyMember = (fm: FamilyMember) => {
    setSelectedFamilyMember(fm);
    router.push(`/admin/messages?patient=${fm.patient_id}`, { scroll: false });
  };

  // Filter family members based on search
  const filteredFamilyMembers = familyMembers.filter((fm) => {
    const searchLower = searchQuery.toLowerCase();
    const name = fm.name?.toLowerCase() || "";
    const email = fm.email?.toLowerCase() || "";
    const patientName = `${fm.patient?.first_name || ""} ${fm.patient?.last_name || ""}`.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || patientName.includes(searchLower);
  });

  // Fetch messages when a family member is selected
  useEffect(() => {
    if (selectedFamilyMember) {
      fetchMessages();

      // Subscribe to real-time message updates
      const channel = supabase
        .channel(`messages:${selectedFamilyMember.patient_id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `patient_id=eq.${selectedFamilyMember.patient_id}`,
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedFamilyMember]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
    if (selectedFamilyMember) {
      markMessagesAsRead();
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedFamilyMember) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("patient_id", selectedFamilyMember.patient_id)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedFamilyMember) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.read && msg.sender_type === "family"
    );

    if (unreadMessages.length > 0) {
      const ids = unreadMessages.map((msg) => msg.id);
      await supabase
        .from("messages")
        .update({ read: true })
        .in("id", ids);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + attachments.length > 5) {
      toast({
        title: "Too many files",
        description: "You can only attach up to 5 files per message",
        variant: "destructive",
      });
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of attachments) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `message-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("attachments")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload attachments. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedFamilyMember) {
      toast({
        title: "Error",
        description: "No conversation selected",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      let attachmentUrls: string[] = [];

      if (attachments.length > 0) {
        const urls = await uploadAttachments();
        if (urls === null) {
          setSending(false);
          return;
        }
        attachmentUrls = urls;
      }

      const { error } = await supabase.from("messages").insert({
        patient_id: selectedFamilyMember.patient_id,
        sender_id: currentUserId,
        sender_type: "staff",
        body: newMessage.trim(),
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        read: false,
        status: "sent",
      });

      if (error) throw error;

      setNewMessage("");
      setAttachments([]);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Messages
          </h1>
          <p className="text-muted-foreground">
            Communicate with patient family members
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
              <Plus className="h-4 w-4" />
              Create Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
              <DialogDescription>
                Select a family member to start messaging
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search family members..."
                  className="pl-10"
                  value={createSearchQuery}
                  onChange={(e) => setCreateSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {familyMembers
                    .filter((fm) => {
                      const searchLower = createSearchQuery.toLowerCase();
                      const name = fm.name?.toLowerCase() || "";
                      const email = fm.email?.toLowerCase() || "";
                      const patientName = `${fm.patient?.first_name || ""} ${fm.patient?.last_name || ""}`.toLowerCase();
                      return name.includes(searchLower) || email.includes(searchLower) || patientName.includes(searchLower);
                    })
                    .map((fm) => (
                      <button
                        key={fm.id}
                        onClick={() => {
                          handleSelectFamilyMember(fm);
                          setCreateDialogOpen(false);
                          setCreateSearchQuery("");
                        }}
                        className="w-full p-3 rounded-lg text-left transition-all hover:bg-muted/50 border border-transparent hover:border-[#7A9B8E]/30"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-muted">
                              {getInitials(fm.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block truncate">
                              {fm.name || fm.email || "Unknown"}
                            </span>
                            <p className="text-xs text-muted-foreground truncate">
                              {fm.relationship && `${fm.relationship} • `}
                              {fm.patient?.first_name} {fm.patient?.last_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  {familyMembers.filter((fm) => {
                    const searchLower = createSearchQuery.toLowerCase();
                    const name = fm.name?.toLowerCase() || "";
                    const email = fm.email?.toLowerCase() || "";
                    const patientName = `${fm.patient?.first_name || ""} ${fm.patient?.last_name || ""}`.toLowerCase();
                    return name.includes(searchLower) || email.includes(searchLower) || patientName.includes(searchLower);
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No family members found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Conversation List */}
        <Card className="w-[380px] flex-shrink-0 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search family members..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredFamilyMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No family members found" : "No family members yet"}
                  </p>
                </div>
              ) : (
                filteredFamilyMembers.map((fm) => {
                  const metadata = conversationMetadata[fm.patient_id];
                  const isSelected = selectedFamilyMember?.id === fm.id;
                  
                  return (
                    <button
                      key={fm.id}
                      onClick={() => handleSelectFamilyMember(fm)}
                      className={`w-full p-3 rounded-lg text-left transition-all mb-1 ${
                        isSelected
                          ? "bg-[#7A9B8E]/10 border border-[#7A9B8E]/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className={isSelected ? "bg-[#7A9B8E] text-white" : "bg-muted"}>
                            {getInitials(fm.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {fm.name || fm.email || "Unknown"}
                            </span>
                            {metadata?.unreadCount > 0 && (
                              <Badge className="bg-[#D4876F] text-white text-xs px-2 py-0.5">
                                {metadata.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {fm.relationship && `${fm.relationship} • `}
                            {fm.patient?.first_name} {fm.patient?.last_name}
                          </p>
                          {metadata?.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {metadata.lastMessage.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right Column - Message Thread */}
        <Card className="flex-1 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col min-w-0">
          {selectedFamilyMember ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#7A9B8E] text-white">
                      {getInitials(selectedFamilyMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedFamilyMember.name || selectedFamilyMember.email || "Unknown"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedFamilyMember.relationship && `${selectedFamilyMember.relationship} • `}
                      Patient: {selectedFamilyMember.patient?.first_name} {selectedFamilyMember.patient?.last_name}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/patients/${selectedFamilyMember.patient_id}`}>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full">
                    <ExternalLink className="h-4 w-4" />
                    View Patient
                  </Button>
                </Link>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isStaff = msg.sender_type === "staff";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              isStaff
                                ? "bg-[#7A9B8E] text-white rounded-br-md"
                                : "bg-[#B8A9D4]/20 text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs ${
                                      isStaff ? "text-white/80 hover:text-white" : "text-[#7A9B8E] hover:underline"
                                    }`}
                                  >
                                    <FileIcon className="h-3 w-3" />
                                    Attachment {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              isStaff ? "text-white/70 justify-end" : "text-muted-foreground"
                            }`}>
                              <span>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                              {isStaff && (
                                msg.read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm"
                      >
                        <FileIcon className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[44px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    className="flex-shrink-0 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full"
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={sending || uploading || (!newMessage.trim() && attachments.length === 0)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a family member from the list to view and send messages
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
