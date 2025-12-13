import FeedbackDashboard from "@/components/admin/feedback-dashboard";

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Visit Feedback</h1>
        <p className="text-muted-foreground">
          Review and respond to family feedback
        </p>
      </div>
      <FeedbackDashboard />
    </div>
  );
}
