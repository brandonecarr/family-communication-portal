import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Search, 
  Filter, 
  Plus,
  Truck,
  CheckCircle2,
  Clock
} from "lucide-react";
import Link from "next/link";

export default async function AdminDeliveriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch all deliveries
  const { data: deliveries } = await supabase
    .from("deliveries")
    .select(`
      *,
      patient:patient_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  const statusColors = {
    scheduled: "bg-muted text-muted-foreground",
    shipped: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    in_transit: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    out_for_delivery: "bg-[#D4876F]/20 text-[#D4876F]",
    delivered: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Delivery Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage all deliveries
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Add Delivery
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2 rounded-full">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery List */}
      <div className="grid gap-4">
        {deliveries?.map((delivery) => {
          const config = statusColors[delivery.status as keyof typeof statusColors] || statusColors.scheduled;
          const StatusIcon = delivery.status === "delivered" ? CheckCircle2 : Truck;

          return (
            <Card key={delivery.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                      <StatusIcon className="h-6 w-6 text-[#7A9B8E]" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{delivery.item_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Patient: {delivery.patient?.name || "Unknown"}
                          </p>
                        </div>
                        <Badge variant="outline" className={config}>
                          {delivery.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{delivery.carrier} • {delivery.tracking_number}</span>
                        </div>
                        {delivery.estimated_delivery && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>ETA: {delivery.estimated_delivery}</span>
                          </div>
                        )}
                      </div>

                      {delivery.last_update && (
                        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                          {delivery.last_update}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full">
                      Update Status
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full">
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {deliveries?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Get started by adding a new delivery
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
