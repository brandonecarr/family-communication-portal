"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Package, User, Truck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "../../../supabase/client";
import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";

interface Visit {
  id: string;
  scheduled_date: string;
  scheduled_time?: string;
  discipline: string | null;
  staff_name: string | null;
  status: string | null;
  notes?: string | null;
}

interface Delivery {
  id: string;
  item_name: string;
  estimated_delivery_date: string | null;
  carrier: string | null;
  status: string | null;
}

interface UpcomingItem {
  id: string;
  type: "visit" | "delivery";
  date: Date;
  data: Visit | Delivery;
}

const disciplineLabels: Record<string, string> = {
  RN: "Registered Nurse",
  LPN: "Licensed Practical Nurse",
  HHA: "Home Health Aide",
  PT: "Physical Therapist",
  OT: "Occupational Therapist",
  ST: "Speech Therapist",
  MSW: "Medical Social Worker",
  Chaplain: "Chaplain",
};

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
};

export default function UpcomingVisits() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingItems();
  }, []);

  const fetchUpcomingItems = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    // Fetch visits in the next 7 days
    const { data: visits } = await supabase
      .from("visits")
      .select("id, scheduled_date, scheduled_time, discipline, staff_name, status, notes")
      .eq("patient_id", familyMember.patient_id)
      .gte("scheduled_date", today.toISOString().split("T")[0])
      .lte("scheduled_date", nextWeek.toISOString().split("T")[0])
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true });

    // Fetch deliveries with estimated delivery in the next 7 days
    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("id, item_name, estimated_delivery_date, carrier, status")
      .eq("patient_id", familyMember.patient_id)
      .gte("estimated_delivery_date", today.toISOString().split("T")[0])
      .lte("estimated_delivery_date", nextWeek.toISOString().split("T")[0])
      .neq("status", "delivered")
      .or("is_archived.is.null,is_archived.eq.false")
      .order("estimated_delivery_date", { ascending: true });

    // Combine and sort by date
    const combinedItems: UpcomingItem[] = [];

    if (visits) {
      visits.forEach((visit) => {
        combinedItems.push({
          id: visit.id,
          type: "visit",
          date: new Date(visit.scheduled_date),
          data: visit,
        });
      });
    }

    if (deliveries) {
      deliveries.forEach((delivery) => {
        if (delivery.estimated_delivery_date) {
          combinedItems.push({
            id: delivery.id,
            type: "delivery",
            date: new Date(delivery.estimated_delivery_date),
            data: delivery,
          });
        }
      });
    }

    // Sort by date
    combinedItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    setItems(combinedItems);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="soft-shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="soft-shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming visits or deliveries this week</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {item.type === "visit" ? (
                <>
                  <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#7A9B8E]">
                      {(item.data as Visit).discipline || "Visit"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">
                        {disciplineLabels[(item.data as Visit).discipline || ""] || (item.data as Visit).discipline || "Care"} Visit
                      </p>
                      <Badge variant="outline" className="text-xs bg-[#7A9B8E]/10 text-[#7A9B8E] border-[#7A9B8E]/20">
                        Visit
                      </Badge>
                    </div>
                    {(item.data as Visit).staff_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        {(item.data as Visit).staff_name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateLabel(item.date)}
                      </span>
                      {(item.data as Visit).scheduled_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(item.data as Visit).scheduled_time}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-[#D4876F]/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-[#D4876F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {(item.data as Delivery).item_name}
                      </p>
                      <Badge variant="outline" className="text-xs bg-[#D4876F]/10 text-[#D4876F] border-[#D4876F]/20 flex-shrink-0">
                        Delivery
                      </Badge>
                    </div>
                    {(item.data as Delivery).carrier && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Truck className="h-3 w-3" />
                        {(item.data as Delivery).carrier}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateLabel(item.date)}
                      </span>
                      {(item.data as Delivery).status && (
                        <span className="capitalize">{(item.data as Delivery).status?.replace("_", " ")}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
