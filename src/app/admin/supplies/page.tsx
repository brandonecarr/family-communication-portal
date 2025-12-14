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
  Clock,
  CheckCircle2,
  XCircle,
  User
} from "lucide-react";
import { Database } from "@/types/supabase";

type SupplyRequest = Database["public"]["Tables"]["supply_requests"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminSuppliesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch all supply requests
  const { data: requests } = await supabase
    .from("supply_requests")
    .select(`
      *,
      patient:patient_id (
        name
      ),
      requester:requested_by (
        email
      )
    `)
    .order("created_at", { ascending: false });

  const statusColors = {
    pending: "bg-[#D4876F]/20 text-[#D4876F]",
    approved: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    fulfilled: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Supply Requests
          </h1>
          <p className="text-muted-foreground">
            Review and fulfill supply requests
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
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

      {/* Request List */}
      <div className="grid gap-4">
        {requests?.map((request: SupplyRequest) => {
          const config = statusColors[request.status as keyof typeof statusColors] || statusColors.pending;
          const items = request.items as Record<string, number>;
          const itemCount = Object.keys(items).length;
          const totalQuantity = Object.values(items).reduce((sum: number, qty: number) => sum + qty, 0);

          return (
            <Card key={request.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {itemCount} {itemCount === 1 ? 'Item' : 'Items'} Requested
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Patient: {request.patient?.name || "Unknown"}
                        </p>
                      </div>
                      <Badge variant="outline" className={config}>
                        {request.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Requested Items:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(items).map(([itemId, quantity]) => (
                          <div key={itemId} className="flex items-center justify-between">
                            <span className="text-muted-foreground capitalize">{itemId.replace('_', ' ')}</span>
                            <span className="font-medium">×{quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {request.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                        <span className="font-medium">Notes:</span> {request.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(request.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {request.requester?.email || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {request.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full gap-1 text-red-600 hover:text-red-700">
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && (
                      <Button size="sm" className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
                        Mark Fulfilled
                      </Button>
                    )}
                    {request.status === "fulfilled" && (
                      <Button variant="outline" size="sm" className="rounded-full">
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {requests?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No supply requests</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                All supply requests have been handled
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
