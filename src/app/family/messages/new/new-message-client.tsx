"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getPatientCareTeamRecipients,
  createMessageThread,
} from "@/lib/actions/internal-messages";

interface NewMessageClientProps {
  currentUserId: string;
  patientId?: string;
}

interface Recipient {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

export default function NewMessageClient({
  currentUserId,
  patientId,
}: NewMessageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  useEffect(() => {
    loadRecipients();
  }, [patientId]);

  const loadRecipients = async () => {
    if (!patientId) {
      setLoadingRecipients(false);
      return;
    }

    try {
      // Family members get care team members assigned to their patient
      const availableRecipients = await getPatientCareTeamRecipients(patientId);
      setRecipients(availableRecipients);
    } catch (error) {
      console.error("Error loading recipients:", error);
      toast({
        title: "Error",
        description: "Failed to load available recipients",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(recipientId)
        ? prev.filter((id) => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleSend = async () => {
    if (!message.trim() || selectedRecipients.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select recipients and write a message",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create thread with initial message
      const thread = await createMessageThread({
        category: "family",
        participantIds: selectedRecipients,
        initialMessage: message.trim(),
      });

      if (!thread) {
        throw new Error("Failed to create thread");
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });

      router.push("/family/messages");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/family/messages")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Messages
        </Button>
        <h1 className="text-3xl font-semibold text-[#2D2D2D]">New Message</h1>
        <p className="text-[#6B7280] mt-2">
          Send a secure message to your care team
        </p>
      </div>

      <Card className="bg-[#FAF8F5] border-[#E5E5E5] shadow-sm">
        <CardHeader className="border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#7A9B8E]" />
            <h2 className="text-xl font-semibold text-[#2D2D2D]">
              Message Details
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Recipients */}
          <div className="space-y-3">
            <Label className="text-[#2D2D2D] font-medium">
              Select Recipients *
            </Label>
            {loadingRecipients ? (
              <div className="text-[#6B7280]">Loading care team members...</div>
            ) : recipients.length === 0 ? (
              <div className="text-[#6B7280]">
                No care team members available
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-white border border-[#E5E5E5] hover:border-[#7A9B8E] transition-colors"
                  >
                    <Checkbox
                      id={recipient.id}
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={() => handleRecipientToggle(recipient.id)}
                    />
                    <Label
                      htmlFor={recipient.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-[#2D2D2D]">
                        {recipient.full_name || recipient.email}
                      </div>
                      <div className="text-sm text-[#6B7280] capitalize">
                        {recipient.role?.replace("_", " ")}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-[#2D2D2D] font-medium">
              Message *
            </Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="bg-white border-[#E5E5E5] focus:border-[#7A9B8E] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSend}
              disabled={
                isLoading ||
                !message.trim() ||
                selectedRecipients.length === 0
              }
              className="bg-[#7A9B8E] hover:bg-[#6B8A7E] text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Send Message"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/family/messages")}
              disabled={isLoading}
              className="border-[#E5E5E5] hover:bg-[#F5F5F5]"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
