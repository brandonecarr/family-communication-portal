import AnalyticsDashboard from "@/components/admin/analytics-dashboard";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Track key metrics and performance indicators
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
