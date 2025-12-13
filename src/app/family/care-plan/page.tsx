import CarePlanOverview from "@/components/family/care-plan-overview";

export default function CarePlanPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-light mb-2">Care Plan Overview</h1>
        <p className="text-muted-foreground">
          Understanding your loved one's hospice care plan
        </p>
      </div>
      <CarePlanOverview />
    </div>
  );
}
