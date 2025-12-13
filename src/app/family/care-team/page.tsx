import CareTeamDirectory from "@/components/family/care-team-directory";

export default function CareTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Your Care Team</h1>
        <p className="text-muted-foreground">
          Meet the professionals caring for your loved one
        </p>
      </div>
      <CareTeamDirectory />
    </div>
  );
}
