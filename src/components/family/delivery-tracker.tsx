"use client";

import { useEffect, useState } from "react";
import { Package, Truck, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
  }, []);

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

    const { data } = await supabase
      .from("deliveries")
      .select("*")
      .eq("patient_id", familyMember.patient_id)
      .order("created_at", { ascending: false });

    if (data) {
      setDeliveries(data);
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

  if (deliveries.length === 0) {
    return (
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No deliveries yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            When items are shipped to you, they'll appear here with tracking information
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-6">
      {deliveries.map((delivery) => {
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
                    {delivery.last_update}
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

              {trackingUrl && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  asChild
                >
                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Track with {delivery.carrier}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
