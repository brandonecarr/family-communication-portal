"use client";

import { useEffect, useState } from "react";
import { X, Package, Clock, CheckCircle2, XCircle, Eye, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getFamilySupplyRequests, dismissSupplyRequest, type FamilySupplyRequest } from "@/lib/actions/supplies";
import Link from "next/link";

const supplyItemNames: Record<string, string> = {
  gloves: "Disposable Gloves",
  wipes: "Adult Wipes",
  pads: "Bed Pads",
  diapers: "Adult Diapers",
  gauze: "Gauze Pads",
  tape: "Medical Tape",
  swabs: "Cotton Swabs",
  bandages: "Bandages",
  lotion: "Moisturizing Lotion",
  chapstick: "Lip Balm",
  tissues: "Tissues",
  blanket: "Comfort Blanket",
};

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-[#D4876F]/10 text-[#D4876F] border-[#D4876F]/20",
    icon: Clock,
    bgColor: "bg-[#D4876F]/5",
  },
  approved: {
    label: "Approved",
    color: "bg-[#7A9B8E]/10 text-[#7A9B8E] border-[#7A9B8E]/20",
    icon: CheckCircle2,
    bgColor: "bg-[#7A9B8E]/5",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-600 border-red-200",
    icon: XCircle,
    bgColor: "bg-red-50",
  },
  fulfilled: {
    label: "Fulfilled",
    color: "bg-[#B8A9D4]/10 text-[#B8A9D4] border-[#B8A9D4]/20",
    icon: CheckCircle2,
    bgColor: "bg-[#B8A9D4]/5",
  },
};

export default function SupplyRequestCards() {
  const [requests, setRequests] = useState<FamilySupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getFamilySupplyRequests();
      setRequests(data || []);
    } catch (err: any) {
      // Don't log error if user is just not authenticated or not a family member
      if (err?.message !== "Not authenticated" && err?.message !== "Family member not found") {
        console.error("Error loading supply requests:", err);
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDismiss = async (requestId: string) => {
    try {
      setDismissing(requestId);
      await dismissSupplyRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error dismissing request:", err);
    } finally {
      setDismissing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = config.icon;
        const items = request.items as Record<string, number>;
        const itemCount = Object.keys(items).length;
        const canDismiss = request.status === "approved" || request.status === "rejected" || request.status === "fulfilled";

        return (
          <Card
            key={request.id}
            className={`border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden relative ${config.bgColor}`}
          >
            {/* Dismiss button for approved/rejected requests */}
            {canDismiss && (
              <button
                onClick={() => handleDismiss(request.id)}
                disabled={dismissing === request.id}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 transition-colors z-10"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-full ${config.color.split(' ')[0]}`}>
                  <Package className="h-5 w-5" style={{ color: config.color.includes('D4876F') ? '#D4876F' : config.color.includes('7A9B8E') ? '#7A9B8E' : config.color.includes('B8A9D4') ? '#B8A9D4' : '#dc2626' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold">
                        Supply Request
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {itemCount} {itemCount === 1 ? "item" : "items"} • {new Date(request.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${config.color} border font-medium shrink-0 ${canDismiss ? 'mr-6' : ''}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-[#7A9B8E]" />
                            Supply Request Details
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant="outline" className={`${config.color} border font-medium`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Submitted</span>
                            <span className="text-sm font-medium">
                              {new Date(request.created_at).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold mb-3">Requested Items</h4>
                            <div className="space-y-2">
                              {Object.entries(items).map(([itemId, quantity]) => (
                                <div key={itemId} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                                  <span className="text-sm">{supplyItemNames[itemId] || itemId.replace(/_/g, " ")}</span>
                                  <span className="text-sm font-medium">×{quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {request.notes && (
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-semibold mb-2">Notes</h4>
                              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                                {request.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {(request.status === "approved" || request.status === "fulfilled") && (
                      <Link href="/family/deliveries">
                        <Button size="sm" className="rounded-full gap-1.5 text-xs bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white">
                          <Truck className="h-3.5 w-3.5" />
                          Track Delivery
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
