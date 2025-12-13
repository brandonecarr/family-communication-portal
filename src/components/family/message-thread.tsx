"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, MoreVertical, X, FileIcon, CheckCheck, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  patient_id: string;
  sender_id: string;
  body: string;
  attachments?: string[];
  read: boolean;
  created_at: string;
  sender_type: string;
}

interface MessageThreadProps {
  patientId?: string;
  currentUserId: string;
}

export default function MessageThread({ patientId, currentUserId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (patientId) {
      fetchMessages();
      
      // Subscribe to real-time message updates
      const channel = supabase
        .channel(`messages:${patientId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `patient_id=eq.${patientId}`,
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
  }, [patientId]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  const fetchMessages = async () => {
    if (!patientId) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async () => {
    if (!patientId) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.read && msg.sender_id !== currentUserId
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
    if (!patientId) {
      toast({
        title: "Error",
        description: "No patient selected",
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
        patient_id: patientId,
        sender_id: currentUserId,
        sender_type: "family",
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
        description: "Your message has been delivered",
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            Message Thread
          </CardTitle>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Care Team</p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-2">Start a conversation with your care team</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwnMessage = msg.sender_id === currentUserId;
              
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={isOwnMessage ? "bg-[#B8A9D4]/20 text-[#B8A9D4]" : "bg-[#7A9B8E]/20 text-[#7A9B8E]"}>
                      {isOwnMessage ? "Y" : "C"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}>
                    <div
                      className={`rounded-2xl p-4 ${
                        isOwnMessage
                          ? "bg-[#B8A9D4]/10 text-foreground ml-auto"
                          : "bg-[#7A9B8E]/5"
                      }`}
                    >
                      <p className="text-sm">{msg.body}</p>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-primary hover:underline"
                            >
                              <FileIcon className="h-3 w-3" />
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isOwnMessage ? "justify-end" : ""}`}>
                      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      {isOwnMessage && (
                        msg.read ? (
                          <CheckCheck className="h-3 w-3 text-[#7A9B8E]" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      <div className="border-t p-4">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
              >
                <FileIcon className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{file.name}</span>
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
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />
          <Button
            size="icon"
            className="flex-shrink-0 h-[60px] w-[60px] bg-[#7A9B8E] hover:bg-[#6A8B7E]"
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
