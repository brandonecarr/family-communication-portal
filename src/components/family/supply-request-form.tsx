"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, Package, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";

// Default supply categories (fallback if no custom catalog exists)
const defaultSupplyCategories = [
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

interface SupplyCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface SupplyCatalogItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  sizes: string[] | null;
  requires_size: boolean;
  display_order: number;
  is_active: boolean;
}

interface FormattedItem {
  id: string;
  name: string;
  unit: string;
  sizes?: string[];
  requires_size?: boolean;
}

interface FormattedCategory {
  category: string;
  items: FormattedItem[];
}

// Track selected items with optional size
interface SelectedItem {
  quantity: number;
  size?: string;
}

export default function SupplyRequestForm() {
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supplyCategories, setSupplyCategories] = useState<FormattedCategory[]>(defaultSupplyCategories);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchSupplyCatalog();
  }, []);

  const fetchSupplyCatalog = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get family member's patient to find agency
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("patient_id, patients(agency_id)")
        .eq("user_id", user.id)
        .single();

      if (!familyMember?.patients) {
        setLoading(false);
        return;
      }

      const agencyId = (familyMember.patients as any).agency_id;

      // Fetch categories and items from the agency's catalog
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from("supply_categories")
          .select("*")
          .eq("agency_id", agencyId)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("supply_catalog_items")
          .select("*")
          .eq("agency_id", agencyId)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (categoriesRes.data && categoriesRes.data.length > 0 && itemsRes.data) {
        // Format the data to match the expected structure
        const formattedCategories: FormattedCategory[] = categoriesRes.data.map((category: SupplyCategory) => ({
          category: category.name,
          items: itemsRes.data
            .filter((item: SupplyCatalogItem) => item.category_id === category.id)
            .map((item: SupplyCatalogItem) => ({
              id: item.id,
              name: item.name,
              unit: item.unit,
              sizes: item.sizes || undefined,
              requires_size: item.requires_size || false,
            })),
        })).filter((cat: FormattedCategory) => cat.items.length > 0);

        if (formattedCategories.length > 0) {
          setSupplyCategories(formattedCategories);
        }
      }
    } catch (error) {
      console.error("Error fetching supply catalog:", error);
      // Keep default categories on error
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, delta: number, size?: string) => {
    setSelectedItems((prev) => {
      const current = prev[itemId]?.quantity || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: { quantity: newValue, size: size || prev[itemId]?.size } };
    });
  };

  const handleSizeChange = (itemId: string, size: string) => {
    setSelectedItems((prev) => {
      if (!prev[itemId]) return prev;
      return { ...prev, [itemId]: { ...prev[itemId], size } };
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

    // Validate that all items requiring size have a size selected
    for (const [itemId, selectedItem] of Object.entries(selectedItems)) {
      for (const category of supplyCategories) {
        const item = category.items.find(i => i.id === itemId);
        if (item && item.requires_size && item.sizes?.length && !selectedItem.size) {
          toast({
            title: "Size required",
            description: `Please select a size for ${item.name}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get family member info including name
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("patient_id, name")
        .eq("user_id", user.id)
        .single();

      if (!familyMember) {
        throw new Error("Family member not found");
      }

      // Convert item IDs to item names for the request (include size if applicable)
      const itemsWithNames: Record<string, number> = {};
      Object.entries(selectedItems).forEach(([itemId, selectedItem]) => {
        // Find the item name from the categories
        for (const category of supplyCategories) {
          const item = category.items.find(i => i.id === itemId);
          if (item) {
            // Use a sanitized version of the name as the key, include size if present
            let key = item.name.toLowerCase().replace(/\s+/g, '_');
            if (selectedItem.size) {
              key = `${key}_${selectedItem.size.toLowerCase().replace(/\s+/g, '_')}`;
            }
            itemsWithNames[key] = selectedItem.quantity;
            break;
          }
        }
      });

      // Create supply request with family member's name from family_members table
      const { error } = await supabase.from("supply_requests").insert({
        patient_id: familyMember.patient_id,
        requested_by_name: familyMember.name || user.email || "Family Member",
        items: itemsWithNames,
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

  if (loading) {
    return (
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            <Package className="h-6 w-6 text-[#7A9B8E]" />
            Request Supplies
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
                  className="p-4 rounded-xl border bg-card hover:bg-[#7A9B8E]/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!!selectedItems[item.id]}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // If item requires size and has sizes, set first size as default
                            const defaultSize = item.requires_size && item.sizes?.length ? item.sizes[0] : undefined;
                            handleQuantityChange(item.id, 1, defaultSize);
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
                          {selectedItems[item.id].quantity}
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

                  {/* Size selector - shown when item is selected and requires size */}
                  {selectedItems[item.id] && item.requires_size && item.sizes && item.sizes.length > 0 && (
                    <div className="mt-3 ml-9 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Size:</span>
                      <div className="flex flex-wrap gap-2">
                        {item.sizes.map((size) => (
                          <Button
                            key={size}
                            variant={selectedItems[item.id]?.size === size ? "default" : "outline"}
                            size="sm"
                            className={selectedItems[item.id]?.size === size 
                              ? "bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-7 px-3" 
                              : "h-7 px-3"
                            }
                            onClick={() => handleSizeChange(item.id, size)}
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
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
