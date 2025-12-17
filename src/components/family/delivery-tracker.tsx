"use client";

import { useEffect, useState } from "react";
import { Package, Truck, CheckCircle2, ExternalLink, Archive, ChevronDown, Loader2 } from "lucide-react";
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

interface TrackingDetails {
  status: string;
  location?: string;
  timestamp?: string;
  events?: Array<{
    status: string;
    location?: string;
    timestamp: string;
  }>;
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

  const fetchTrackingDetails = async (deliveryId: string, trackingUrl: string) => {
    if (trackingDetails[deliveryId]) return;
    
    setLoadingTracking((prev) => ({ ...prev, [deliveryId]: true }));
    
    try {
      // Since we can't directly scrape tracking pages due to CORS,
      // we'll display the tracking URL and provide a link to view details
      // In a production environment, you would use carrier APIs or a tracking service
      setTrackingDetails((prev) => ({
        ...prev,
        [deliveryId]: {
          status: "Tracking information available",
          events: [
            {
              status: "Click the link below to view full tracking details",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      }));
    } catch (error) {
      setTrackingDetails((prev) => ({
        ...prev,
        [deliveryId]: {
          status: "Unable to fetch tracking details",
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

  const getTrackingUrl = (delivery: Delivery) => {
    if (delivery.tracking_url) return delivery.tracking_url;
    if (!delivery.carrier || !delivery.tracking_number) return null;
    const urlGenerator = carrierUrls[delivery.carrier];
    return urlGenerator ? urlGenerator(delivery.tracking_number) : null;
  };

  if (loading) {
    return <div className="text-center py-8">Loading deliveries...</div>;
  }

  const displayDeliveries = showArchived ? archivedDeliveries : deliveries;

  if (displayDeliveries.length === 0 && !showArchived) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(true)}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            View Archived
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
        <div className="flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowArchived(false)}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            View Active
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
      <div className="flex justify-end">
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2"
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
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      {loadingTracking[delivery.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Loading tracking details...
                          </span>
                        </div>
                      ) : trackingUrl ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-[#7A9B8E]" />
                              <span className="text-sm font-medium">
                                {trackingDetails[delivery.id]?.status || "Tracking information available"}
                              </span>
                            </div>
                            {trackingDetails[delivery.id]?.events?.map((event, index) => (
                              <div
                                key={index}
                                className="ml-4 pl-3 border-l-2 border-muted py-1"
                              >
                                <p className="text-sm text-muted-foreground">
                                  {event.status}
                                </p>
                                {event.location && (
                                  <p className="text-xs text-muted-foreground">
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-muted">
                            <p className="text-xs text-muted-foreground mb-2">
                              Tracking URL:
                            </p>
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#7A9B8E] hover:text-[#6A8B7E] underline break-all"
                            >
                              {trackingUrl}
                            </a>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full rounded-full mt-2"
                            asChild
                          >
                            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Full Tracking on Carrier Site
                            </a>
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-4">
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
