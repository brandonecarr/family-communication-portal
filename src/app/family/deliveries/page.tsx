import dynamic from "next/dynamic";

const DeliveryTracker = dynamic(
  () => import("@/components/family/delivery-tracker"),
  { ssr: false }
);

const SupplyRequestTracker = dynamic(
  () => import("@/components/family/supply-request-tracker"),
  { ssr: false }
);

export default function DeliveriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Deliveries & Tracking</h1>
        <p className="text-muted-foreground">
          Track your medication and supply deliveries
        </p>
      </div>
      <SupplyRequestTracker />
      <DeliveryTracker />
    </div>
  );
}
