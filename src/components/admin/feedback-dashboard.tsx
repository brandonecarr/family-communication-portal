"use client";

import { useState, useEffect } from "react";
import { Star, Flag, CheckCircle2, User, Calendar, MessageSquare } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

interface Feedback {
  id: string;
  visit_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  flagged?: boolean;
  resolved?: boolean;
  visit: {
    date: string;
    discipline: string;
    patient: {
      name: string;
    };
    staff: {
      name: string;
    };
  };
}

export default function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchFeedback();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("feedback-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visit_feedback",
        },
        () => {
          fetchFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ratingFilter, statusFilter]);

  const fetchFeedback = async () => {
    let query = supabase
      .from("visit_feedback")
      .select(`
        *,
        visit:visit_id (
          date,
          discipline,
          patient:patient_id (
            name
          ),
          staff:staff_id (
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    // Apply rating filter
    if (ratingFilter === "low") {
      query = query.lte("rating", 2);
    } else if (ratingFilter !== "all") {
      query = query.eq("rating", parseInt(ratingFilter));
    }

    const { data } = await query;

    if (data) {
      let filtered = data;
      
      // Apply status filter
      if (statusFilter === "flagged") {
        filtered = filtered.filter((f) => f.flagged);
      } else if (statusFilter === "resolved") {
        filtered = filtered.filter((f) => f.resolved);
      }

      setFeedback(filtered);
    }
    setLoading(false);
  };

  const handleFlag = async (id: string) => {
    try {
      const { error } = await supabase
        .from("visit_feedback")
        .update({ flagged: true })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Feedback flagged",
        description: "This feedback has been flagged for follow-up",
      });

      fetchFeedback();
    } catch (error) {
      console.error("Error flagging feedback:", error);
      toast({
        title: "Error",
        description: "Failed to flag feedback",
        variant: "destructive",
      });
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from("visit_feedback")
        .update({ resolved: true, flagged: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Feedback resolved",
        description: "This feedback has been marked as resolved",
      });

      fetchFeedback();
    } catch (error) {
      console.error("Error resolving feedback:", error);
      toast({
        title: "Error",
        description: "Failed to resolve feedback",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const avgRating = feedback.length
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : "0";
  const flaggedCount = feedback.filter((f) => f.flagged).length;
  const responseRate = 73; // Mock for now

  if (loading) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-3xl font-light mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                  {avgRating}
                </p>
              </div>
              <Star className="h-8 w-8 text-[#7A9B8E] fill-[#7A9B8E]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-light mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                  {feedback.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[#7A9B8E]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-3xl font-light mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                  {flaggedCount}
                </p>
              </div>
              <Flag className="h-8 w-8 text-[#D4876F]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-light mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                  {responseRate}%
                </p>
              </div>
              <User className="h-8 w-8 text-[#7A9B8E]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="low">Low (1-2 Stars)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Feedback</SelectItem>
            <SelectItem value="flagged">Flagged Only</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {feedback.length === 0 ? (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                No feedback matches the selected filters
              </p>
            </CardContent>
          </Card>
        ) : (
          feedback.map((item) => {
            const ratingColor = item.rating >= 4 ? "text-[#7A9B8E]" : item.rating >= 3 ? "text-[#B8A9D4]" : "text-[#D4876F]";

            return (
              <Card
                key={item.id}
                className={`border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                  item.flagged ? "border-l-4 border-l-[#D4876F]" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{item.visit?.patient?.name || "Unknown Patient"}</h3>
                          {item.flagged && (
                            <Badge variant="destructive" className="gap-1">
                              <Flag className="h-3 w-3" />
                              Flagged
                            </Badge>
                          )}
                          {item.resolved && (
                            <Badge className="gap-1 bg-[#7A9B8E]/20 text-[#7A9B8E]">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.visit?.discipline} Visit - {item.visit?.staff?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < item.rating
                                ? `fill-current ${ratingColor}`
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {item.comment && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{item.comment}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {!item.flagged && !item.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 rounded-full"
                            onClick={() => handleFlag(item.id)}
                          >
                            <Flag className="h-4 w-4" />
                            Flag for Follow-up
                          </Button>
                        )}
                        {item.flagged && !item.resolved && (
                          <>
                            <Button variant="outline" size="sm" className="rounded-full">
                              Assign to Case Manager
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleResolve(item.id)}
                            >
                              Mark Resolved
                            </Button>
                          </>
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
    </div>
  );
}
