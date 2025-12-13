"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resendFacilityInvite } from "@/lib/actions/facilities";
import { useToast } from "@/components/ui/use-toast";

interface ResendInviteButtonProps {
  facilityId: string;
  hasInvite?: boolean;
}

export function ResendInviteButton({ facilityId, hasInvite = true }: ResendInviteButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResend() {
    setIsSubmitting(true);
    
    try {
      const result = await resendFacilityInvite(facilityId);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: hasInvite ? "Invitation email resent successfully!" : "Invitation email sent successfully!",
        });
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${hasInvite ? "resend" : "send"} invitation`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button 
      type="button"
      onClick={handleResend}
      variant="outline" 
      className="border-amber-300 text-amber-700 hover:bg-amber-100"
      disabled={isSubmitting}
    >
      {isSubmitting ? "Sending..." : (hasInvite ? "Resend Invite" : "Send Invite")}
    </Button>
  );
}
