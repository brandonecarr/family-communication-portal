import PatientList from "@/components/admin/patient-list";

export const dynamic = "force-dynamic";

export default function AdminPatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2">Patient Management</h1>
          <p className="text-muted-foreground">
            Manage patient information and family access
          </p>
        </div>
      </div>
      <PatientList />
    </div>
  );
}
