"use client";

import { useState, useEffect } from "react";
import { Star, Calendar, User, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Visit {
  id: string;
  date: string;
  discipline: string;
  staff: {
    name: string;
  };
}

export default function VisitFeedbackForm() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchRecentVisits();
  }, []);

  const fetchRecentVisits = async () => {
    const { data } = await supabase
      .from("visits")
      .select(`
        id,
        date,
        discipline,
        staff:staff_id (
          name
        )
      `)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(5);

    if (data) {
      setVisits(data);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedVisit || rating === 0) {
      toast({
        title: "Missing information",
        description: "Please select a visit and provide a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("visit_feedback").insert({
        visit_id: selectedVisit,
        submitted_by: user.id,
        rating,
        comment: comment || null,
      });

      if (error) throw error;

      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps us improve the quality of care",
      });

      // Reset form
      setSelectedVisit(null);
      setRating(0);
      setComment("");
      fetchRecentVisits();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading visits...</div>;
  }


  return (
    <div className="space-y-6">
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            Select a Recent Visit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed visits to rate yet
            </div>
          ) : (
            visits.map((visit) => (
              <button
                key={visit.id}
                onClick={() => setSelectedVisit(visit.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedVisit === visit.id
                    ? "bg-[#7A9B8E]/5 border-[#7A9B8E]/30"
                    : "bg-card border-border hover:bg-[#7A9B8E]/5"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{visit.discipline}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {visit.staff?.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(visit.date), { addSuffix: true })}
                    </p>
                  </div>
                  {selectedVisit === visit.id && (
                    <div className="h-6 w-6 rounded-full bg-[#7A9B8E] flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {selectedVisit && (
        <>
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Rate Your Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-12 w-12 ${
                        star <= (hoveredRating || rating)
                          ? "fill-[#D4876F] text-[#D4876F]"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center mt-4 text-muted-foreground">
                  {rating === 5 && "Excellent!"}
                  {rating === 4 && "Very Good"}
                  {rating === 3 && "Good"}
                  {rating === 2 && "Fair"}
                  {rating === 1 && "Needs Improvement"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Additional Comments (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Share your thoughts</Label>
                <Textarea
                  id="comment"
                  placeholder="What went well? What could be improved?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full text-base"
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
        </CardContent>
      </Card>

      {selectedVisit && (
        <Card className="soft-shadow-lg border-0">
          <CardHeader>
            <CardTitle>Rate Your Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>How would you rate this visit?</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hoveredRating || rating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground">
                  {rating === 5 && "Excellent! We're glad you had a great experience."}
                  {rating === 4 && "Great! Thank you for your feedback."}
                  {rating === 3 && "Good. We appreciate your input."}
                  {rating === 2 && "We're sorry to hear that. Please tell us more."}
                  {rating === 1 && "We apologize for the experience. Your feedback is important."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Additional Comments (Optional)</Label>
              <Textarea
                placeholder="Share any specific feedback about the visit..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={rating === 0}
            >
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
