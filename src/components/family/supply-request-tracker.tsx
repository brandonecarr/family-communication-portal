"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle2, Clock, XCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../supabase/client";
import Link from "next/link";

interface SupplyRequest {
  id: string;
  item_name?: string;
  quantity?: number;
  items?: Record<string, number>;
  status: string;
  notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pending: { label: "Pending Review", color: "bg-[#D4876F]/20 text-[#D4876F]", progress: 25, icon: Clock },
  approved: { label: "Approved", color: "bg-[#B8A9D4]/20 text-[#B8A9D4]", progress: 50, icon: CheckCircle2 },
  fulfilled: { label: "Fulfilled", color: "bg-[#7A9B8E]/20 text-[#7A9B8E]", progress: 100, icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", progress: 0, icon: XCircle },
};

export default function SupplyRequestTracker() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("supply_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "supply_requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
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
      .from("supply_requests")
      .select("*")
      .eq("patient_id", familyMember.patient_id)
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter out archived requests and only show active ones
  const activeRequests = requests.filter(r => r.status !== 'archived');

  // Hide the section entirely if there are no active requests
  if (activeRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Supply Requests</h2>
        <Button asChild variant="outline" size="sm" className="hover:bg-primary/10 hover:text-foreground">
          <Link href="/family/supplies">
            <Plus className="h-4 w-4 mr-2" />
            Request Supplies
          </Link>
        </Button>
      </div>
      {activeRequests.map((request) => {
        const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = status.icon;
        
        // Parse items from JSON or use legacy fields
        const items = request.items || {};
        const itemEntries = Object.entries(items);
        const totalQuantity = itemEntries.reduce((sum, [_, qty]) => sum + qty, 0);
        const displayTitle = itemEntries.length > 0 
          ? `Supply Request (${itemEntries.length} item${itemEntries.length > 1 ? 's' : ''})`
          : request.item_name || 'Supply Request';

        return (
          <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#FAF8F5]">
                    <Package className="h-5 w-5 text-[#7A9B8E]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {displayTitle}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total Quantity: {totalQuantity || request.quantity || 0}
                    </p>
                  </div>
                </div>
                <Badge className={status.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Requested Items */}
              {itemEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{totalQuantity} items requested:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {itemEntries.map(([itemName, quantity]) => {
                      const formattedName = itemName
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                      return (
                        <Badge 
                          key={itemName}
                          variant="secondary" 
                          className="bg-[#D4876F]/20 text-[#D4876F] border-0 px-3 py-1"
                        >
                          {formattedName} × {quantity}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Request Details */}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Requested: </span>
                  <span className="font-medium">
                    {new Date(request.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {request.updated_at !== request.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {new Date(request.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {request.notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Your Notes:</p>
                  <p className="text-sm">{request.notes}</p>
                </div>
              )}

              {/* Admin Notes */}
              {request.admin_notes && (
                <div className="pt-3 border-t bg-[#FAF8F5]/50 -mx-6 px-6 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Agency Notes:</p>
                  <p className="text-sm">{request.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
