import VisitFeedbackForm from "@/components/family/visit-feedback-form";

export default function FeedbackPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-light mb-2">Visit Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve by sharing your experience with recent visits
        </p>
      </div>
      <VisitFeedbackForm />
    </div>
  );
}
