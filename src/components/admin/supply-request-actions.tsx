"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, Loader2, Package, Warehouse, Truck } from "lucide-react";
import { approveSupplyRequest, rejectSupplyRequest, deductInventory } from "@/lib/actions/supplies";
import { useToast } from "@/components/ui/use-toast";

interface SupplyRequestActionsProps {
  requestId: string;
  patientName: string;
  items: Record<string, number>;
  userName: string;
  agencyId: string;
  onApprovalSuccess?: () => void;
}

export function SupplyRequestActions({
  requestId,
  patientName,
  items,
  userName,
  agencyId,
  onApprovalSuccess,
}: SupplyRequestActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fulfillmentSource, setFulfillmentSource] = useState<"inventory" | "external">("external");
  const { toast } = useToast();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approveSupplyRequest(requestId, userName);
      
      // If fulfilling from inventory, deduct the items
      if (fulfillmentSource === "inventory") {
        const itemsToDeduct = Object.entries(items).map(([name, quantity]) => {
          // Parse size from item name if present (e.g., "Gloves (Medium)" -> size: "Medium")
          const sizeMatch = name.match(/\(([^)]+)\)$/);
          const size = sizeMatch ? sizeMatch[1] : undefined;
          const itemName = sizeMatch ? name.replace(/\s*\([^)]+\)$/, "") : name;
          
          return {
            itemName,
            quantity,
            size,
          };
        });
        
        await deductInventory(agencyId, itemsToDeduct, requestId, userName);
        
        toast({
          title: "Inventory Updated",
          description: "Items have been deducted from your inventory.",
        });
      }
      
      setShowApproveDialog(false);
      
      // Call the callback to open delivery dialog
      if (onApprovalSuccess) {
        onApprovalSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this request.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await rejectSupplyRequest(requestId, userName, rejectionReason);
      toast({
        title: "Request Rejected",
        description: "The supply request has been rejected.",
      });
      setShowRejectDialog(false);
      setRejectionReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject the request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const itemsList = Object.entries(items)
    .map(([item, qty]) => `${item.replace(/_/g, " ")} (${qty})`)
    .join(", ");

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={() => setShowRejectDialog(true)}
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
      <Button
        size="sm"
        className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1.5"
        onClick={() => setShowApproveDialog(true)}
      >
        <CheckCircle2 className="h-4 w-4" />
        Approve
      </Button>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Supply Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this supply request for{" "}
              <span className="font-medium">{patientName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Requested Items
              </p>
              <p className="text-sm capitalize">{itemsList}</p>
            </div>
            <Textarea
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this supply request for{" "}
              <span className="font-medium">{patientName}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">{Object.keys(items).length} items requested:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(items).map(([name, quantity], index) => {
                // Format the item name: replace underscores with spaces and capitalize each word
                const formattedName = name
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-[#D4876F]/20 text-[#D4876F] text-sm font-medium"
                  >
                    {formattedName} × {quantity}
                  </span>
                );
              })}
            </div>
            
            {/* Fulfillment Source Selection */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-semibold mb-3 block">
                Where are these items coming from?
              </Label>
              <RadioGroup
                value={fulfillmentSource}
                onValueChange={(value) => setFulfillmentSource(value as "inventory" | "external")}
                className="space-y-3"
              >
                <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                  fulfillmentSource === "inventory" 
                    ? "border-[#7A9B8E] bg-[#7A9B8E]/5" 
                    : "border-muted hover:border-muted-foreground/30"
                }`}>
                  <RadioGroupItem value="inventory" id="inventory" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="inventory" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Warehouse className="h-4 w-4 text-[#7A9B8E]" />
                      From Inventory
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deduct these items from your on-hand inventory
                    </p>
                  </div>
                </div>
                <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                  fulfillmentSource === "external" 
                    ? "border-[#7A9B8E] bg-[#7A9B8E]/5" 
                    : "border-muted hover:border-muted-foreground/30"
                }`}>
                  <RadioGroupItem value="external" id="external" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="external" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Truck className="h-4 w-4 text-[#B8A9D4]" />
                      Order Externally
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Items will be ordered from an external supplier (no inventory change)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              A delivery will be automatically created for these items once approved.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              onClick={handleApprove}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Confirm Approval"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
