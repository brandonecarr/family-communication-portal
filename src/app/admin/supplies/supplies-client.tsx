"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Search, 
  Filter, 
  Clock,
  User,
  Settings,
  ClipboardList
} from "lucide-react";
import { SupplyRequestActions } from "@/components/admin/supply-request-actions";
import { SupplyCatalogManagement } from "@/components/admin/supply-catalog-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../../supabase/client";

type SupplyRequest = {
  id: string;
  patient_id: string;
  items: Record<string, number>;
  status: string;
  notes?: string | null;
  created_at: string;
  requested_by?: string | null;
  requested_by_name?: string | null;
  patient?: { first_name: string; last_name: string } | null;
  requester?: { name: string } | null;
  deliveries?: { id: string }[] | null;
};

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
};

// Default supply items (fallback if no custom catalog exists)
const defaultSupplyItems = [
  // Personal Care
  { id: "gloves", name: "Disposable Gloves", category: "Personal Care" },
  { id: "wipes", name: "Adult Wipes", category: "Personal Care" },
  { id: "pads", name: "Bed Pads", category: "Personal Care" },
  { id: "diapers", name: "Adult Diapers", category: "Personal Care" },
  // Medical Supplies
  { id: "gauze", name: "Gauze Pads", category: "Medical Supplies" },
  { id: "tape", name: "Medical Tape", category: "Medical Supplies" },
  { id: "swabs", name: "Cotton Swabs", category: "Medical Supplies" },
  { id: "bandages", name: "Bandages", category: "Medical Supplies" },
  // Comfort Items
  { id: "lotion", name: "Moisturizing Lotion", category: "Comfort Items" },
  { id: "chapstick", name: "Lip Balm", category: "Comfort Items" },
  { id: "tissues", name: "Tissues", category: "Comfort Items" },
  { id: "blanket", name: "Comfort Blanket", category: "Comfort Items" },
];

interface CatalogItem {
  id: string;
  name: string;
  category: string;
}

const carrierOptions = [
  "UPS",
  "FedEx",
  "USPS",
  "DHL",
  "Amazon Logistics",
  "Other",
];

interface SuppliesClientProps {
  requests: SupplyRequest[];
  userName: string;
  patients: Patient[];
  agencyId: string;
}

// Helper function to format date consistently
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${hour12}:${minutes} ${ampm}`;
};

export function SuppliesClient({ requests, userName, patients, agencyId }: SuppliesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{name: string, quantity: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(defaultSupplyItems);
  const [catalogCategories, setCatalogCategories] = useState<string[]>(["Personal Care", "Medical Supplies", "Comfort Items"]);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    fetchSupplyCatalog();
  }, [agencyId]);

  const fetchSupplyCatalog = async () => {
    try {
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
          .select("*, supply_categories(name)")
          .eq("agency_id", agencyId)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (categoriesRes.data && categoriesRes.data.length > 0 && itemsRes.data) {
        // Format items with category names
        const formattedItems: CatalogItem[] = itemsRes.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.supply_categories?.name || "Uncategorized",
        }));

        setCatalogItems(formattedItems);
        
        // Get unique categories from the database only
        const categories = categoriesRes.data.map((c: any) => c.name);
        setCatalogCategories(categories);
      }
    } catch (error) {
      console.error("Error fetching supply catalog:", error);
      // Keep default items on error
    }
  };
  
  const [formData, setFormData] = useState({
    patient_id: "",
    carrier: "",
    tracking_number: "",
    tracking_url: "",
    status: "ordered",
    estimated_delivery: "",
    notes: "",
    supply_request_id: undefined as string | undefined,
  });

  const toggleItem = (itemName: string) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.name === itemName);
      if (exists) {
        return prev.filter(i => i.name !== itemName);
      }
      return [...prev, { name: itemName, quantity: 1 }];
    });
  };
  
  const removeItem = (itemName: string) => {
    setSelectedItems(prev => prev.filter(i => i.name !== itemName));
  };

  const handleOpenDeliveryDialog = (patientId: string, requestedItems: Record<string, number>, supplyRequestId?: string) => {
    // Convert requested items to array with quantities
    // Match the item keys to catalog item names, handling size variants
    const itemsWithQuantities = Object.entries(requestedItems).map(([key, quantity]) => {
      // Normalize the key for comparison (e.g., "disposable_gloves_medium" -> "disposable gloves")
      // Remove size suffixes (small, medium, large, xl, xs, xxl)
      const normalizedKey = key.toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s*(small|medium|large|xl|xs|xxl|x-large|x-small)\s*$/i, '')
        .trim();
      
      // Try to find matching catalog item by:
      // 1. Exact ID match
      // 2. Exact name match (case-insensitive)
      // 3. Normalized key matches catalog name (ignoring size suffix)
      const matchingItem = catalogItems.find(item => {
        const normalizedItemName = item.name.toLowerCase().trim();
        return (
          item.id === key ||
          normalizedItemName === key.toLowerCase() ||
          normalizedItemName === normalizedKey
        );
      });
      
      return {
        name: matchingItem?.name || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        quantity: quantity
      };
    });
    
    setFormData({
      patient_id: patientId,
      carrier: "",
      tracking_number: "",
      tracking_url: "",
      status: "ordered",
      estimated_delivery: "",
      notes: "",
      supply_request_id: supplyRequestId,
    });
    setSelectedItems(itemsWithQuantities);
    setShowDeliveryDialog(true);
  };

  const handleAddDelivery = async () => {
    if (!formData.patient_id || selectedItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and at least one item.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const itemName = selectedItems.map(i => `${i.name} (${i.quantity})`).join(", ");
      const deliveryData = { ...formData, item_name: itemName };
      
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) throw new Error("Failed to create delivery");

      setShowDeliveryDialog(false);
      setSelectedItems([]);
      setFormData({
        patient_id: "",
        carrier: "",
        tracking_number: "",
        tracking_url: "",
        status: "ordered",
        estimated_delivery: "",
        notes: "",
        supply_request_id: undefined,
      });
      
      toast({
        title: "Delivery Created",
        description: "The delivery has been successfully created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = searchTerm === "" || 
      request.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-[#2D2D2D]">
              Supplies Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage supply requests and configure your supply catalog
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Supply Requests
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Catalog Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by patient or requester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Requests List */}
            <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "No supply requests match your filters"
                    : "No supply requests yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const items = request.items || {};
              const itemCount = Object.keys(items).length;

              return (
                <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {request.patient
                                ? `${request.patient.first_name} ${request.patient.last_name}`
                                : "Unknown Patient"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                request.status === "pending"
                                  ? "bg-[#D4876F]/20 text-[#D4876F] border-0"
                                  : request.status === "approved"
                                  ? "bg-[#7A9B8E]/20 text-[#7A9B8E] border-0"
                                  : "bg-red-100 text-red-800 border-0"
                              }
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span className="font-medium">{itemCount} items requested:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(items).map(([item, qty]) => {
                              const formattedName = item
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                              return (
                                <Badge key={item} variant="secondary">
                                  {formattedName} × {qty}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {request.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Note: {request.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {mounted ? formatDate(request.created_at) : "Loading..."}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {request.requester?.name || "Family Member"}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {request.status === "pending" && (
                            <SupplyRequestActions
                              requestId={request.id}
                              patientName={request.patient ? `${request.patient.first_name} ${request.patient.last_name}` : "Unknown Patient"}
                              items={items}
                              userName={userName}
                              onApprovalSuccess={() => handleOpenDeliveryDialog(request.patient_id, items, request.id)}
                            />
                          )}
                          {request.status === "approved" && request.deliveries && request.deliveries.length > 0 && (
                            <Badge variant="outline" className="bg-[#B8A9D4]/20 text-[#B8A9D4] border-0">
                              Delivery Created
                            </Badge>
                          )}
                          {request.status === "approved" && (!request.deliveries || request.deliveries.length === 0) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDeliveryDialog(request.patient_id, items, request.id)}
                              className="text-[#7A9B8E] border-[#7A9B8E] hover:bg-[#7A9B8E]/10"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Create Delivery
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
            </div>
          </TabsContent>

          <TabsContent value="catalog">
            <SupplyCatalogManagement agencyId={agencyId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Delivery</DialogTitle>
            <DialogDescription>
              Add delivery details for the approved supply request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, patient_id: value })
                }
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Items *</Label>
              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedItems.map((item) => (
                    <Badge
                      key={item.name}
                      variant="secondary"
                      className="flex items-center gap-1 bg-[#D4876F]/20 text-[#D4876F]"
                    >
                      {item.name} × {item.quantity}
                      <button
                        type="button"
                        onClick={() => removeItem(item.name)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-48 rounded-md border p-3">
                <div className="space-y-3">
                  {catalogCategories.map((category) => {
                    const categoryItems = catalogItems.filter((item) => item.category === category);
                    if (categoryItems.length === 0) return null;
                    return (
                      <div key={category}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                        <div className="space-y-2">
                          {categoryItems.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-${item.id}`}
                                checked={selectedItems.some(i => i.name === item.name)}
                                onCheckedChange={() => toggleItem(item.name)}
                              />
                              <label
                                htmlFor={`add-${item.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {item.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">
                    Out for Delivery
                  </SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional delivery notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeliveryDialog(false);
                // Reset form when canceling
                setSelectedItems([]);
                setFormData({
                  patient_id: "",
                  carrier: "",
                  tracking_number: "",
                  tracking_url: "",
                  status: "ordered",
                  estimated_delivery: "",
                  notes: "",
                  supply_request_id: undefined,
                });
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDelivery}
              disabled={isLoading}
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Delivery"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
