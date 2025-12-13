import VisitControlPanel from "@/components/admin/visit-control-panel";

export default function AdminVisitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Visit Management</h1>
        <p className="text-muted-foreground">
          Schedule and manage patient visits
        </p>
      </div>
      <VisitControlPanel />
    </div>
  );
}
