import dynamic from "next/dynamic";

const SupplyRequestForm = dynamic(
  () => import("@/components/family/supply-request-form"),
  { ssr: false }
);

export default function SuppliesPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-light mb-2">Request Supplies</h1>
        <p className="text-muted-foreground">
          Let us know what supplies you need for your loved one's care
        </p>
      </div>
      <SupplyRequestForm />
    </div>
  );
}
