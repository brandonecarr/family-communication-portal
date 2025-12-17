"use client";

import { useState } from "react";
import { Plus, Minus, Package, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";

const supplyCategories = [
  {
    category: "Personal Care",
    items: [
      { id: "gloves", name: "Disposable Gloves", unit: "box" },
      { id: "wipes", name: "Adult Wipes", unit: "pack" },
      { id: "pads", name: "Bed Pads", unit: "pack" },
      { id: "diapers", name: "Adult Diapers", unit: "pack" },
    ],
  },
  {
    category: "Medical Supplies",
    items: [
      { id: "gauze", name: "Gauze Pads", unit: "box" },
      { id: "tape", name: "Medical Tape", unit: "roll" },
      { id: "swabs", name: "Cotton Swabs", unit: "box" },
      { id: "bandages", name: "Bandages", unit: "box" },
    ],
  },
  {
    category: "Comfort Items",
    items: [
      { id: "lotion", name: "Moisturizing Lotion", unit: "bottle" },
      { id: "chapstick", name: "Lip Balm", unit: "tube" },
      { id: "tissues", name: "Tissues", unit: "box" },
      { id: "blanket", name: "Comfort Blanket", unit: "each" },
    ],
  },
];

export default function SupplyRequestForm() {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newValue };
    });
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to request",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get family member info
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("patient_id")
        .eq("user_id", user.id)
        .single();

      if (!familyMember) {
        throw new Error("Family member not found");
      }

      // Create supply request
      const { error } = await supabase.from("supply_requests").insert({
        patient_id: familyMember.patient_id,
        requested_by: user.id,
        items: selectedItems,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "Your supply request has been received and will be processed soon",
      });

      // Reset form
      setSelectedItems({});
      setNotes("");
      
      // Refresh the page to show the new request card
      router.refresh();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = Object.keys(selectedItems).length;


  return (
    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            <Package className="h-6 w-6 text-[#7A9B8E]" />
            Request Supplies
          </CardTitle>
          {totalItems > 0 && (
            <div className="px-3 py-1 rounded-full bg-[#7A9B8E]/10 text-[#7A9B8E] text-sm font-medium">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} selected
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {supplyCategories.map((category) => (
          <div key={category.category} className="space-y-3">
            <h3 className="font-semibold text-lg">{category.category}</h3>
            <div className="space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-[#7A9B8E]/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={!!selectedItems[item.id]}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleQuantityChange(item.id, 1);
                        } else {
                          setSelectedItems((prev) => {
                            const { [item.id]: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                    <Label className="cursor-pointer">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({item.unit})
                      </span>
                    </Label>
                  </div>

                  {selectedItems[item.id] && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {selectedItems[item.id]}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special instructions or additional items needed..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || totalItems === 0}
          className="w-full h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full text-base"
        >
          {submitting ? (
            "Submitting..."
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
