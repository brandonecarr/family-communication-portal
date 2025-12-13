"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, MoreVertical, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "../../../supabase/client";
import { EditVisitDialog } from "./edit-visit-dialog";
import { DeleteVisitDialog } from "./delete-visit-dialog";

interface Visit {
  id: string;
  patient_id: string;
  staff_id: string;
  date: string;
  time_window_start: string;
  time_window_end: string;
  status: string;
  discipline: string;
  notes?: string;
  patient: {
    name: string;
  };
  staff: {
    name: string;
  };
}

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-muted text-muted-foreground" },
  en_route: { label: "En Route", color: "bg-[#D4876F]/20 text-[#D4876F]" },
  in_progress: { label: "In Progress", color: "bg-[#B8A9D4]/20 text-[#B8A9D4]" },
  completed: { label: "Completed", color: "bg-[#7A9B8E]/20 text-[#7A9B8E]" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export default function VisitControlPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchVisits();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("visits-admin")
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
  }, [dateFilter, statusFilter]);

  const fetchVisits = async () => {
    let query = supabase
      .from("visits")
      .select(`
        *,
        patient:patient_id (
          name
        ),
        staff:staff_id (
          name
        )
      `)
      .order("date", { ascending: true });

    // Apply date filter
    const today = new Date().toISOString().split("T")[0];
    if (dateFilter === "today") {
      query = query.eq("date", today);
    } else if (dateFilter === "tomorrow") {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      query = query.eq("date", tomorrow);
    } else if (dateFilter === "week") {
      const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      query = query.gte("date", today).lte("date", weekFromNow);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;

    if (data) {
      setVisits(data);
    }
    setLoading(false);
  };

  const handleStatusChange = async (visitId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("visits")
        .update({ status: newStatus })
        .eq("id", visitId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Visit status has been updated successfully",
      });

      fetchVisits();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update visit status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading visits...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Schedule Visit
        </Button>
      </div>

      <div className="grid gap-4">
        {visits.length === 0 ? (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No visits found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                No visits match the selected filters
              </p>
            </CardContent>
          </Card>
        ) : (
          visits.map((visit) => (
            <Card key={visit.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{visit.patient?.name || "Unknown Patient"}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {visit.staff?.name || "Unassigned"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusConfig[visit.status as keyof typeof statusConfig].color}
                      >
                        {statusConfig[visit.status as keyof typeof statusConfig].label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(visit.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {visit.time_window_start} - {visit.time_window_end}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-muted text-xs">
                        {visit.discipline}
                      </span>
                    </div>

                    {visit.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                        {visit.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Select
                        value={visit.status}
                        onValueChange={(value) => handleStatusChange(visit.id, value)}
                      >
                        <SelectTrigger className="w-[160px] h-9 rounded-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="en_route">En Route</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <EditVisitDialog visit={{
                        id: visit.id,
                        staff_name: visit.staff?.name || "",
                        discipline: visit.discipline,
                        scheduled_date: visit.date,
                        scheduled_time: visit.time_window_start,
                        notes: visit.notes,
                        status: visit.status
                      }} />
                      <DeleteVisitDialog visit={{
                        id: visit.id,
                        staff_name: visit.staff?.name || "",
                        discipline: visit.discipline,
                        scheduled_date: visit.date
                      }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
