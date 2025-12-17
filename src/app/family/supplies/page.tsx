import SupplyRequestForm from "@/components/family/supply-request-form";
import SupplyRequestCards from "@/components/family/supply-request-cards";

export default function SuppliesPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-light mb-2">Request Supplies</h1>
        <p className="text-muted-foreground">
          Let us know what supplies you need for your loved one's care
        </p>
      </div>
      <SupplyRequestCards />
      <SupplyRequestForm />
    </div>
  );
}
