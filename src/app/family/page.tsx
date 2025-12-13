import VisitTimeline from "@/components/family/visit-timeline";
import RealTimeStatusBar from "@/components/family/real-time-status-bar";
import QuickActions from "@/components/family/quick-actions";
import UpcomingVisits from "@/components/family/upcoming-visits";

export default function FamilyDashboard() {
  return (
    <div className="space-y-6">
      <RealTimeStatusBar />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-light mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-lg">
              Here's what's happening with your loved one's care
            </p>
          </div>
          
          <VisitTimeline />
        </div>
        
        <div className="space-y-6">
          <QuickActions />
          <UpcomingVisits />
        </div>
      </div>
    </div>
  );
}
