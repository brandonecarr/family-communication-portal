"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, CheckCircle2, Circle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "../../../supabase/client";
import { format } from "date-fns";

interface Visit {
  id: string;
  scheduled_date: string;
  scheduled_time?: string;
  time_window_start?: string;
  time_window_end?: string;
  status: string;
  notes?: string;
  discipline: string;
  staff_name: string;
}

const statusConfig = {
  scheduled: {
    label: "Scheduled",
    color: "bg-muted text-muted-foreground",
    icon: Circle,
  },
  en_route: {
    label: "En Route",
    color: "bg-[#D4876F]/20 text-[#D4876F] border-[#D4876F]/20",
    icon: MapPin,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-[#B8A9D4]/20 text-[#B8A9D4] border-[#B8A9D4]/20",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-[#7A9B8E]/20 text-[#7A9B8E] border-[#7A9B8E]/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Circle,
  },
};

export default function VisitTimeline() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchVisits();

    // Subscribe to real-time visit updates
    const channel = supabase
      .channel("visits")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visits",
        },
        () => {
          fetchVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVisits = async () => {
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
      .from("visits")
      .select("*")
      .eq("patient_id", familyMember.patient_id)
      .order("scheduled_date", { ascending: true })
      .limit(10);

    if (data) {
      setVisits(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading visits...</div>;
  }

  return (
    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
          <Calendar className="h-6 w-6 text-[#7A9B8E]" />
          Visit Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No visits scheduled
          </div>
        ) : (
          <div className="relative space-y-6">
            {visits.map((visit, index) => {
              const config = statusConfig[visit.status as keyof typeof statusConfig] || statusConfig.scheduled;
              const StatusIcon = config.icon;
              const isCompleted = visit.status === "completed";

              return (
                <div key={visit.id} className="relative">
                  <div
                    className={`rounded-2xl border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-[1.01] ${
                      isCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 relative">
                        <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                          <StatusIcon className="h-5 w-5 text-[#7A9B8E]" />
                        </div>
                        {index < visits.length - 1 && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-10 h-[calc(100%+1.5rem)] w-0.5 border-l-2 border-dashed border-[#7A9B8E]/30" />
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{visit.discipline}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              {visit.staff_name}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={config.color}
                          >
                            {config.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(visit.scheduled_date), "M/d/yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{visit.scheduled_time || "Time TBD"}</span>
                          </div>
                        </div>

                        {visit.notes && (
                          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                            {visit.notes}
                          </p>
                        )}

                        {!isCompleted && (
                          <Link href={`/family/visits/${visit.id}`}>
                            <Button variant="ghost" size="sm" className="mt-2">
                              View Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
