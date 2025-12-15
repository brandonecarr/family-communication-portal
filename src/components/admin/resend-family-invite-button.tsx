"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { resendFamilyInvitation } from "@/lib/actions/patients";

interface ResendFamilyInviteButtonProps {
  familyMemberId: string;
}

export function ResendFamilyInviteButton({ familyMemberId }: ResendFamilyInviteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await resendFamilyInvitation(familyMemberId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to resend invitation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-full gap-2" 
      onClick={handleResend}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {success ? "Sent!" : "Resend Invite"}
    </Button>
  );
}
