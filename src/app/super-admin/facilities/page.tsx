import { createClient } from "../../../../supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Search, 
  Plus,
  MapPin,
  Phone,
  Users,
  UserCheck,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { CreateFacilityForm } from "@/components/super-admin/create-facility-form";

export default async function SuperAdminFacilitiesPage({
  searchParams,
}: {
  searchParams: { action?: string; search?: string; status?: string };
}) {
  const supabase = await createClient();
  const showCreateForm = searchParams.action === "create";
  const searchQuery = searchParams.search || "";
  const statusFilter = searchParams.status || "all";

  // Fetch all facilities with counts
  let query = supabase
    .from("agencies")
    .select("*")
    .order("name");

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: facilities } = await query;

  // Filter by search if provided
  const filteredFacilities = facilities?.filter((f: any) => 
    !searchQuery || 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get stats for each facility
  const facilitiesWithStats = await Promise.all(
    (filteredFacilities || []).map(async (facility: any) => {
      const [patientsResult, staffResult] = await Promise.all([
        supabase
          .from("patients")
          .select("id", { count: "exact" })
          .eq("agency_id", facility.id),
        supabase
          .from("agency_users")
          .select("id", { count: "exact" })
          .eq("agency_id", facility.id),
      ]);

      return {
        ...facility,
        patientCount: patientsResult.count || 0,
        staffCount: staffResult.count || 0,
      };
    })
  );

  const statusColors: Record<string, string> = {
    active: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    inactive: "bg-[#D4876F]/20 text-[#D4876F]",
    suspended: "bg-red-100 text-red-600",
  };

  const tierColors: Record<string, string> = {
    "1-25": "bg-gray-100 text-gray-600",
    "26-50": "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    "51-75": "bg-[#B8A9D4]/30 text-[#9A8BC4]",
    "76-100": "bg-amber-100 text-amber-600",
    "101-125": "bg-amber-200 text-amber-700",
    "126-150": "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    "151-175": "bg-[#7A9B8E]/30 text-[#6A8B7E]",
    "176-200": "bg-[#7A9B8E]/40 text-[#5A7B6E]",
    "201+": "bg-[#D4876F]/20 text-[#D4876F]",
    // Legacy tiers for backwards compatibility
    basic: "bg-gray-100 text-gray-600",
    standard: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    premium: "bg-amber-100 text-amber-600",
    enterprise: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Facility Management
          </h1>
          <p className="text-muted-foreground">
            Manage all hospice agencies on the platform
          </p>
        </div>
        {!showCreateForm && (
          <Link href="/super-admin/facilities?action=create">
            <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2">
              <Plus className="w-4 h-4" />
              Add Facility
            </Button>
          </Link>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && <CreateFacilityForm />}

      {/* Filters */}
      <Card className="soft-shadow border-0 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <form>
                <Input 
                  name="search"
                  placeholder="Search facilities..." 
                  defaultValue={searchQuery}
                  className="pl-10 bg-[#FAF8F5] border-[#E8E4DF]"
                />
                <input type="hidden" name="status" value={statusFilter} />
              </form>
            </div>
            <form className="flex gap-2">
              <input type="hidden" name="search" value={searchQuery} />
              <Select name="status" defaultValue={statusFilter}>
                <SelectTrigger className="w-[150px] bg-[#FAF8F5] border-[#E8E4DF]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">Filter</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilitiesWithStats && facilitiesWithStats.length > 0 ? (
          facilitiesWithStats.map((facility: any) => (
            <Card 
              key={facility.id} 
              className="soft-shadow border-0 bg-white hover:shadow-lg transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: facility.primary_color || '#7A9B8E' }}
                    >
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2D2D2D]">{facility.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary" 
                          className={statusColors[facility.status || "active"]}
                        >
                          {facility.status || "active"}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={tierColors[facility.subscription_tier || "standard"]}
                        >
                          {facility.subscription_tier || "standard"}
                        </Badge>
                        {!facility.onboarding_completed && (
                          <Badge 
                            variant="secondary" 
                            className="bg-amber-100 text-amber-700"
                          >
                            Pending Setup
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/super-admin/facilities/${facility.id}`} className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/super-admin/facilities/${facility.id}?action=edit`} className="flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Location */}
                {(facility.city || facility.state) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {[facility.city, facility.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-2 mb-4">
                  {facility.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{facility.phone}</span>
                    </div>
                  )}
                  {facility.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{facility.email}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-[#E8E4DF]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#7A9B8E]" />
                    <span className="text-sm">
                      <span className="font-medium">{facility.patientCount}</span>
                      <span className="text-muted-foreground"> patients</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#B8A9D4]" />
                    <span className="text-sm">
                      <span className="font-medium">{facility.staffCount}</span>
                      <span className="text-muted-foreground"> staff</span>
                    </span>
                  </div>
                </div>

                {/* View Button */}
                <Link href={`/super-admin/facilities/${facility.id}`}>
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-[#7A9B8E] hover:text-[#6A8B7E] hover:bg-[#7A9B8E]/10"
                  >
                    Manage Facility
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="soft-shadow border-0 bg-white">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-[#2D2D2D] mb-2">No facilities found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first facility"}
                </p>
                <Link href="/super-admin/facilities?action=create">
                  <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2">
                    <Plus className="w-4 h-4" />
                    Add Facility
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
