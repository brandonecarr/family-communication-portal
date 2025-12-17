"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  Filter,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Delivery {
  id: string;
  patient_id: string;
  item_name: string;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  status: string;
  estimated_delivery?: string | null;
  last_update?: string | null;
  notes?: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface DeliveryManagementClientProps {
  initialDeliveries: Delivery[];
  patients: Patient[];
}

const statusColors = {
  ordered: "bg-[#D4876F]/20 text-[#D4876F]",
  shipped: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
  in_transit: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  out_for_delivery: "bg-[#D4876F]/20 text-[#D4876F]",
  delivered: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  exception: "bg-red-100 text-red-800",
};

const carrierOptions = [
  "UPS",
  "FedEx",
  "USPS",
  "DHL",
  "Amazon Logistics",
  "Other",
];

const supplyItems = [
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

export function DeliveryManagementClient({
  initialDeliveries,
  patients,
}: DeliveryManagementClientProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    patient_id: "",
    item_name: "",
    carrier: "",
    tracking_number: "",
    tracking_url: "",
    status: "ordered",
    estimated_delivery: "",
    notes: "",
  });
  
  // Multi-select items state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const allSelectableItems = [
    { id: "medication", name: "Medication", category: "General" },
    { id: "medical_equipment", name: "Medical Equipment", category: "General" },
    ...supplyItems,
  ];
  
  const toggleItem = (itemName: string) => {
    setSelectedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(i => i !== itemName)
        : [...prev, itemName]
    );
  };
  
  const removeItem = (itemName: string) => {
    setSelectedItems(prev => prev.filter(i => i !== itemName));
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (delivery.patient &&
        `${delivery.patient.first_name} ${delivery.patient.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || delivery.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      // Combine selected items into item_name
      const itemName = selectedItems.join(", ");
      const deliveryData = { ...formData, item_name: itemName };
      
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) throw new Error("Failed to create delivery");

      const newDelivery = await response.json();
      setDeliveries([newDelivery, ...deliveries]);
      setShowAddDialog(false);
      resetForm();
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

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedDelivery) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const updatedDelivery = await response.json();
      setDeliveries(
        deliveries.map((d) =>
          d.id === selectedDelivery.id ? updatedDelivery : d
        )
      );
      setShowStatusDialog(false);
      setSelectedDelivery(null);
      toast({
        title: "Status Updated",
        description: "The delivery status has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDelivery = async () => {
    if (!selectedDelivery) return;
    
    if (selectedItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one item.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Combine selected items into item_name
      const itemName = selectedItems.join(", ");
      const deliveryData = { ...formData, item_name: itemName };
      
      const response = await fetch(`/api/deliveries/${selectedDelivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) throw new Error("Failed to update delivery");

      const updatedDelivery = await response.json();
      setDeliveries(
        deliveries.map((d) =>
          d.id === selectedDelivery.id ? updatedDelivery : d
        )
      );
      setShowEditDialog(false);
      setSelectedDelivery(null);
      resetForm();
      toast({
        title: "Delivery Updated",
        description: "The delivery has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      item_name: "",
      carrier: "",
      tracking_number: "",
      tracking_url: "",
      status: "ordered",
      estimated_delivery: "",
      notes: "",
    });
    setSelectedItems([]);
  };

  const openEditDialog = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setFormData({
      patient_id: delivery.patient_id,
      item_name: delivery.item_name,
      carrier: delivery.carrier || "",
      tracking_number: delivery.tracking_number || "",
      tracking_url: delivery.tracking_url || "",
      status: delivery.status,
      estimated_delivery: delivery.estimated_delivery || "",
      notes: delivery.notes || "",
    });
    // Parse existing items from item_name (comma-separated)
    const existingItems = delivery.item_name
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    setSelectedItems(existingItems);
    setShowEditDialog(true);
  };

  const openStatusDialog = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowStatusDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Delivery Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage all deliveries
          </p>
        </div>
        <Button
          className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Add Delivery
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item, tracking number, or patient..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] rounded-full">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Delivery List */}
      <div className="grid gap-4">
        {filteredDeliveries.map((delivery) => {
          const config =
            statusColors[delivery.status as keyof typeof statusColors] ||
            statusColors.ordered;
          const StatusIcon =
            delivery.status === "delivered" ? CheckCircle2 : Truck;

          return (
            <Card
              key={delivery.id}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center flex-shrink-0">
                      <StatusIcon className="h-6 w-6 text-[#7A9B8E]" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {delivery.item_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Patient:{" "}
                            {delivery.patient
                              ? `${delivery.patient.first_name} ${delivery.patient.last_name}`
                              : "Unknown"}
                          </p>
                        </div>
                        <Badge variant="outline" className={config}>
                          {delivery.status?.replace("_", " ").toUpperCase() ||
                            "UNKNOWN"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>
                            {delivery.carrier && delivery.tracking_number
                              ? `${delivery.carrier} • ${delivery.tracking_number}`
                              : delivery.carrier || "Preparing for shipment"}
                          </span>
                        </div>
                        {delivery.estimated_delivery && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>ETA: {delivery.estimated_delivery}</span>
                          </div>
                        )}
                      </div>

                      {(delivery.last_update || delivery.notes) && (
                        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                          {delivery.last_update || delivery.notes}
                        </p>
                      )}

                      {delivery.tracking_url && (
                        <a
                          href={delivery.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#7A9B8E] hover:text-[#6A8B7E]"
                        >
                          Track Package
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => openStatusDialog(delivery)}
                    >
                      Update Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => openEditDialog(delivery)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDeliveries.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== "all"
                  ? "No deliveries found"
                  : "No deliveries yet"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding a new delivery"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Delivery Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Delivery</DialogTitle>
            <DialogDescription>
              Create a new delivery entry for a patient
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
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
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
                <div className="flex flex-wrap gap-3 mb-2">
                  {selectedItems.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-2 bg-[#7A9B8E]/20 text-[#7A9B8E] px-3 py-2 text-base"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-48 rounded-md border p-3">
                <div className="space-y-3">
                  {["General", "Personal Care", "Medical Supplies", "Comfort Items"].map((category) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                      <div className="space-y-2">
                        {allSelectableItems
                          .filter((item) => item.category === category)
                          .map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`add-${item.id}`}
                                checked={selectedItems.includes(item.name)}
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
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
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
                setShowAddDialog(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              onClick={handleAddDelivery}
              disabled={isLoading}
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

      {/* Edit Delivery Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update delivery information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Items *</Label>
              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedItems.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-1 bg-[#7A9B8E]/20 text-[#7A9B8E]"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
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
                  {["General", "Personal Care", "Medical Supplies", "Comfort Items"].map((category) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                      <div className="space-y-2">
                        {allSelectableItems
                          .filter((item) => item.category === category)
                          .map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${item.id}`}
                                checked={selectedItems.includes(item.name)}
                                onCheckedChange={() => toggleItem(item.name)}
                              />
                              <label
                                htmlFor={`edit-${item.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {item.name}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_carrier">Carrier</Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(value) =>
                    setFormData({ ...formData, carrier: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carrierOptions.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_tracking_number">Tracking Number</Label>
                <Input
                  id="edit_tracking_number"
                  value={formData.tracking_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tracking_number: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_tracking_url">Tracking URL</Label>
              <Input
                id="edit_tracking_url"
                value={formData.tracking_url}
                onChange={(e) =>
                  setFormData({ ...formData, tracking_url: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_estimated_delivery">
                Estimated Delivery
              </Label>
              <Input
                id="edit_estimated_delivery"
                type="date"
                value={formData.estimated_delivery}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_delivery: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
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
                setShowEditDialog(false);
                setSelectedDelivery(null);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              onClick={handleEditDelivery}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Delivery"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Change the status of this delivery
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {selectedDelivery && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">
                    {selectedDelivery.item_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current status:{" "}
                    {selectedDelivery.status?.replace("_", " ").toUpperCase()}
                  </p>
                </div>
              )}
              <Label>New Status</Label>
              <Select
                defaultValue={selectedDelivery?.status}
                onValueChange={(value) => handleUpdateStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
