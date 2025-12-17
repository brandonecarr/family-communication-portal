"use client";

import { useEffect, useState } from "react";
import { Package, Truck, CheckCircle2, ExternalLink, Archive, ChevronDown, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "../../../supabase/client";
import Link from "next/link";

interface Delivery {
  id: string;
  item_name: string;
  carrier?: string | null;
  tracking_number?: string | null;
  status: string;
  estimated_delivery?: string | null;
  last_update?: string | null;
  tracking_url?: string | null;
  notes?: string | null;
  created_at: string;
  delivered_at?: string | null;
  is_archived?: boolean;
}

interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  isCompleted: boolean;
}

interface TrackingDetails {
  trackingNumber?: string;
  carrier?: string;
  currentStatus: string;
  estimatedDelivery?: string;
  shipTo?: string;
  events: TrackingEvent[];
  deliveryStatus?: "label_created" | "in_transit" | "out_for_delivery" | "delivered";
  error?: string;
}

const statusConfig = {
  ordered: { label: "Ordered", color: "bg-[#D4876F]/20 text-[#D4876F]", progress: 10 },
  shipped: { label: "Shipped", color: "bg-[#B8A9D4]/20 text-[#B8A9D4]", progress: 40 },
  in_transit: { label: "In Transit", color: "bg-[#7A9B8E]/20 text-[#7A9B8E]", progress: 60 },
  out_for_delivery: { label: "Out for Delivery", color: "bg-[#D4876F]/20 text-[#D4876F]", progress: 80 },
  delivered: { label: "Delivered", color: "bg-[#7A9B8E]/20 text-[#7A9B8E]", progress: 100 },
  exception: { label: "Exception", color: "bg-red-100 text-red-800", progress: 0 },
};

const carrierUrls: Record<string, (tracking: string) => string> = {
  FedEx: (tracking) => `https://www.fedex.com/fedextrack/?trknbr=${tracking}`,
  UPS: (tracking) => `https://www.ups.com/track?tracknum=${tracking}`,
  USPS: (tracking) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`,
};

export default function DeliveryTracker() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [archivedDeliveries, setArchivedDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTracking, setExpandedTracking] = useState<Record<string, boolean>>({});
  const [trackingDetails, setTrackingDetails] = useState<Record<string, TrackingDetails | null>>({});
  const [loadingTracking, setLoadingTracking] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const getTrackingUrl = (delivery: Delivery) => {
    if (delivery.tracking_url) return delivery.tracking_url;
    if (!delivery.carrier || !delivery.tracking_number) return null;
    const urlGenerator = carrierUrls[delivery.carrier];
    return urlGenerator ? urlGenerator(delivery.tracking_number) : null;
  };

  const fetchTrackingDetails = async (deliveryId: string, trackingUrl: string, forceRefresh = false) => {
    if (trackingDetails[deliveryId] && !forceRefresh) return;
    
    setLoadingTracking((prev) => ({ ...prev, [deliveryId]: true }));
    
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackingUrl, deliveryId }),
      });

      const data = await response.json();
      
      setTrackingDetails((prev) => ({
        ...prev,
        [deliveryId]: data,
      }));
    } catch (error) {
      console.error("Error fetching tracking details:", error);
      setTrackingDetails((prev) => ({
        ...prev,
        [deliveryId]: {
          currentStatus: "Unable to fetch tracking details",
          events: [],
          error: "Please click the tracking link to view details on the carrier website",
        },
      }));
    } finally {
      setLoadingTracking((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  const toggleTracking = (deliveryId: string, trackingUrl: string) => {
    const isExpanding = !expandedTracking[deliveryId];
    setExpandedTracking((prev) => ({ ...prev, [deliveryId]: isExpanding }));
    
    if (isExpanding && trackingUrl) {
      fetchTrackingDetails(deliveryId, trackingUrl);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("deliveries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showArchived]);

  const fetchDeliveries = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setLoading(false);
      return;
    }

    // Get family member's patient_id
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("patient_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!familyMember?.patient_id) {
      setLoading(false);
      return;
    }

    // Calculate the cutoff date (1 day after delivery)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    if (showArchived) {
      // Fetch archived deliveries (delivered more than 1 day ago OR manually archived)
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .eq("patient_id", familyMember.patient_id)
        .or(`is_archived.eq.true,and(status.eq.delivered,delivered_at.lt.${oneDayAgo.toISOString()})`)
        .order("created_at", { ascending: false });

      if (data) {
        setArchivedDeliveries(data);
        setDeliveries([]);
      }
    } else {
      // Fetch active deliveries (not archived AND either not delivered OR delivered within 1 day)
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .eq("patient_id", familyMember.patient_id)
        .or(`is_archived.is.null,is_archived.eq.false`)
        .order("created_at", { ascending: false });

      if (data) {
        // Filter out deliveries that were delivered more than 1 day ago
        const activeDeliveries = data.filter((delivery) => {
          if (delivery.status !== "delivered") return true;
          if (!delivery.delivered_at) return true;
          const deliveredDate = new Date(delivery.delivered_at);
          return deliveredDate > oneDayAgo;
        });
        setDeliveries(activeDeliveries);
        setArchivedDeliveries([]);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading deliveries...</div>;
  }

  const displayDeliveries = showArchived ? archivedDeliveries : deliveries;

  if (displayDeliveries.length === 0 && !showArchived) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(true)}
            className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium"
          >
            <Archive className="h-4 w-4" />
            View Archived
          </Button>
          <Button asChild className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-10 px-4 py-2 text-sm font-medium">
            <Link href="/family/supplies" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Request Supplies
            </Link>
          </Button>
        </div>
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deliveries yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              When items are shipped to you, they'll appear here with tracking information
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (displayDeliveries.length === 0 && showArchived) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(false)}
            className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium"
          >
            <Package className="h-4 w-4" />
            View Active
          </Button>
          <Button asChild className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-10 px-4 py-2 text-sm font-medium">
            <Link href="/family/supplies" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Request Supplies
            </Link>
          </Button>
        </div>
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Archive className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No archived deliveries</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Deliveries are automatically archived 1 day after delivery
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium"
        >
          {showArchived ? (
            <>
              <Package className="h-4 w-4" />
              View Active
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              View Archived
            </>
          )}
        </Button>
        <Button asChild className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-10 px-4 py-2 text-sm font-medium">
          <Link href="/family/supplies" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Request Supplies
          </Link>
        </Button>
      </div>
      <div className="grid gap-6">
      {displayDeliveries.map((delivery) => {
        const config = statusConfig[delivery.status as keyof typeof statusConfig] || statusConfig.ordered;
        const trackingUrl = getTrackingUrl(delivery);

        return (
          <Card key={delivery.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                    {delivery.status === "delivered" ? (
                      <CheckCircle2 className="h-6 w-6 text-[#7A9B8E]" />
                    ) : (
                      <Truck className="h-6 w-6 text-[#7A9B8E]" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                      {delivery.item_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {delivery.carrier && delivery.tracking_number 
                        ? `${delivery.carrier} • ${delivery.tracking_number}`
                        : delivery.carrier || "Preparing for shipment"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Delivery Progress</span>
                  <span className="font-medium">{config.progress}%</span>
                </div>
                <Progress value={config.progress} className="h-2" />
              </div>

              <div className="bg-[#7A9B8E]/5 rounded-xl p-4 space-y-2">
                {delivery.estimated_delivery && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Delivery</span>
                    <span className="text-sm text-muted-foreground">
                      {delivery.estimated_delivery}
                    </span>
                  </div>
                )}
                {delivery.last_update && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(delivery.last_update).toLocaleString()}
                  </p>
                )}
                {delivery.notes && (
                  <p className="text-xs text-muted-foreground">
                    {delivery.notes}
                  </p>
                )}
                {!delivery.estimated_delivery && !delivery.last_update && !delivery.notes && (
                  <p className="text-xs text-muted-foreground">
                    Your delivery is being prepared
                  </p>
                )}
              </div>

              {(trackingUrl || delivery.status === "shipped" || delivery.status === "in_transit" || delivery.status === "out_for_delivery" || delivery.status === "delivered") && (
                <Collapsible
                  open={expandedTracking[delivery.id]}
                  onOpenChange={() => toggleTracking(delivery.id, trackingUrl || "")}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full rounded-full justify-between"
                    >
                      <span className="flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Tracking Details
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedTracking[delivery.id] ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {loadingTracking[delivery.id] ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading tracking details...
                          </span>
                        </div>
                      ) : trackingUrl ? (
                        <>
                          {trackingDetails[delivery.id] ? (
                            <div className="divide-y divide-gray-100">
                              {/* Header Section */}
                              <div className="p-4 bg-gray-50">
                                <p className="text-xs text-muted-foreground">Your shipment</p>
                                <p className="font-mono text-sm font-medium">
                                  {trackingDetails[delivery.id]?.trackingNumber || delivery.tracking_number || "N/A"}
                                </p>
                              </div>

                              {/* Estimated Delivery */}
                              <div className="p-4">
                                <p className="text-[#7A9B8E] font-medium text-sm">
                                  {trackingDetails[delivery.id]?.estimatedDelivery || 
                                   "Estimated delivery date will be available when carrier receives the package."}
                                </p>
                              </div>

                              {/* Ship To */}
                              {trackingDetails[delivery.id]?.shipTo && (
                                <div className="p-4">
                                  <p className="text-xs text-muted-foreground font-medium mb-1">Ship To</p>
                                  <p className="text-sm font-medium">{trackingDetails[delivery.id]?.shipTo}</p>
                                </div>
                              )}

                              {/* Tracking Timeline */}
                              <div className="p-4">
                                <div className="relative">
                                  {trackingDetails[delivery.id]?.events?.map((event, index) => {
                                    const isLast = index === (trackingDetails[delivery.id]?.events?.length || 0) - 1;
                                    const isFirst = index === 0;
                                    
                                    return (
                                      <div key={index} className="flex items-start gap-3 pb-4 last:pb-0">
                                        {/* Timeline indicator */}
                                        <div className="flex flex-col items-center">
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                            event.isCompleted 
                                              ? "bg-[#7A9B8E] border-[#7A9B8E]" 
                                              : "bg-white border-gray-300"
                                          }`}>
                                            {event.isCompleted && (
                                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          {!isLast && (
                                            <div className={`w-0.5 h-8 ${
                                              event.isCompleted ? "bg-[#7A9B8E]" : "bg-gray-200"
                                            }`} style={{ borderStyle: event.isCompleted ? "solid" : "dashed" }} />
                                          )}
                                        </div>
                                        
                                        {/* Event content */}
                                        <div className="flex-1 pt-0.5">
                                          <p className={`text-sm font-medium ${
                                            event.isCompleted ? "text-gray-900" : "text-gray-400"
                                          }`}>
                                            {event.status}
                                          </p>
                                          {event.location && event.isCompleted && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {event.location}
                                            </p>
                                          )}
                                          {event.timestamp && event.isCompleted && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {event.timestamp}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Error message if any */}
                              {trackingDetails[delivery.id]?.error && (
                                <div className="p-4 bg-yellow-50">
                                  <p className="text-sm text-yellow-800">
                                    {trackingDetails[delivery.id]?.error}
                                  </p>
                                </div>
                              )}

                              {/* View All Shipping Details Link */}
                              <div className="p-4">
                                <a
                                  href={trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-[#7A9B8E] hover:text-[#6A8B7E] font-medium"
                                >
                                  View All Shipping Details
                                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </a>
                              </div>

                              {/* Refresh Button */}
                              <div className="p-4 bg-gray-50">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => fetchTrackingDetails(delivery.id, trackingUrl, true)}
                                  disabled={loadingTracking[delivery.id]}
                                >
                                  {loadingTracking[delivery.id] ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Refreshing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Refresh Tracking
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-sm text-muted-foreground">
                                Click to load tracking details
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">
                            Tracking information will be available once the shipment is confirmed
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
