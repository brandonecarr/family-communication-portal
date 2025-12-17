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

type SupplyRequest = {
  id: string;
  patient_id: string;
  items: Record<string, number>;
  status: string;
  notes?: string | null;
  created_at: string;
  requested_by_name?: string | null;
  patient?: { first_name: string; last_name: string } | null;
};

export const dynamic = "force-dynamic";

export default async function AdminSuppliesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's agency_id
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = agencyUser?.agency_id;

  // Fetch supply requests for patients in this agency
  let requests: SupplyRequest[] = [];
  
  if (agencyId) {
    // First get all patients for this agency
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .eq("agency_id", agencyId);
    
    const patientIds = patients?.map((p: { id: string }) => p.id) || [];
    
    if (patientIds.length > 0) {
      const { data } = await supabase
        .from("supply_requests")
        .select(`
          *,
          patient:patient_id (
            first_name,
            last_name
          )
        `)
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });
      
      requests = (data || []) as SupplyRequest[];
    }
  }

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
      <div className="space-y-4">
        {requests?.map((request: SupplyRequest) => {
          const config = statusColors[request.status as keyof typeof statusColors] || statusColors.pending;
          const items = request.items as Record<string, number>;
          const itemCount = Object.keys(items).length;

          return (
            <Card key={request.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Header with status */}
              <div className={`px-6 py-3 flex items-center justify-between ${
                request.status === 'pending' ? 'bg-[#D4876F]/10' :
                request.status === 'approved' ? 'bg-[#B8A9D4]/10' :
                request.status === 'fulfilled' ? 'bg-[#7A9B8E]/10' :
                'bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  <Package className={`h-5 w-5 ${
                    request.status === 'pending' ? 'text-[#D4876F]' :
                    request.status === 'approved' ? 'text-[#B8A9D4]' :
                    request.status === 'fulfilled' ? 'text-[#7A9B8E]' :
                    'text-red-600'
                  }`} />
                  <span className="font-medium text-sm">
                    {request.patient ? `${request.patient.first_name} ${request.patient.last_name}` : "Unknown Patient"}
                  </span>
                </div>
                <Badge variant="outline" className={`${config} border-0 font-medium`}>
                  {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || 'Pending'}
                </Badge>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Items Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Requested Items ({itemCount})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2">Item</th>
                            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries(items).map(([itemId, quantity]) => (
                            <tr key={itemId} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-sm capitalize">{itemId.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium">{quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notes */}
                  {request.notes && (
                    <div className="bg-muted/20 rounded-lg p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}

                  {/* Footer with metadata and actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {request.created_at ? new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {request.requested_by_name || "Unknown"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-full gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                          <Button size="sm" className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
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
                </div>
              </CardContent>
            </Card>
          );
        })}

        {requests?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No supply requests</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Supply requests from family members will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
