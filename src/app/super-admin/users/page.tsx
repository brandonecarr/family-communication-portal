import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Search, 
  Filter,
  MoreVertical,
  Shield,
  Building2,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: { search?: string; role?: string };
}) {
  const supabase = await createClient();
  const searchQuery = searchParams.search || "";
  const roleFilter = searchParams.role || "all";

  // Fetch all users
  let query = supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (roleFilter !== "all") {
    query = query.eq("role", roleFilter);
  }

  const { data: users } = await query;

  // Filter by search
  const filteredUsers = users?.filter((u: any) => 
    !searchQuery || 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get agency assignments for each user
  const usersWithAgencies = await Promise.all(
    (filteredUsers || []).map(async (user: any) => {
      const { data: agencyUsers } = await supabase
        .from("agency_users")
        .select(`
          agency:agency_id (
            id,
            name
          )
        `)
        .eq("user_id", user.id);

      return {
        ...user,
        agencies: agencyUsers?.map((au: any) => au.agency).filter(Boolean) || [],
      };
    })
  );

  const roleColors: Record<string, string> = {
    super_admin: "bg-amber-100 text-amber-700",
    agency_admin: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    agency_staff: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    family_admin: "bg-[#D4876F]/20 text-[#D4876F]",
    family_member: "bg-gray-100 text-gray-600",
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    agency_admin: "Agency Admin",
    agency_staff: "Agency Staff",
    family_admin: "Family Admin",
    family_member: "Family Member",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          User Management
        </h1>
        <p className="text-muted-foreground">
          View and manage all users across the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total Users", count: users?.length || 0, color: "bg-[#7A9B8E]" },
          { label: "Super Admins", count: users?.filter((u: any) => u.role === "super_admin").length || 0, color: "bg-amber-500" },
          { label: "Agency Admins", count: users?.filter((u: any) => u.role === "agency_admin").length || 0, color: "bg-[#7A9B8E]" },
          { label: "Agency Staff", count: users?.filter((u: any) => u.role === "agency_staff").length || 0, color: "bg-[#B8A9D4]" },
          { label: "Family Members", count: users?.filter((u: any) => u.role === "family_member" || u.role === "family_admin").length || 0, color: "bg-[#D4876F]" },
        ].map((stat) => (
          <Card key={stat.label} className="soft-shadow border-0 bg-white">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'Fraunces, serif' }}>
                {stat.count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="soft-shadow border-0 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <form>
                <Input 
                  name="search"
                  placeholder="Search users by name or email..." 
                  defaultValue={searchQuery}
                  className="pl-10 bg-[#FAF8F5] border-[#E8E4DF]"
                />
                <input type="hidden" name="role" value={roleFilter} />
              </form>
            </div>
            <form className="flex gap-2">
              <input type="hidden" name="search" value={searchQuery} />
              <Select name="role" defaultValue={roleFilter}>
                <SelectTrigger className="w-[180px] bg-[#FAF8F5] border-[#E8E4DF]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="agency_admin">Agency Admin</SelectItem>
                  <SelectItem value="agency_staff">Agency Staff</SelectItem>
                  <SelectItem value="family_admin">Family Admin</SelectItem>
                  <SelectItem value="family_member">Family Member</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">Filter</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="soft-shadow border-0 bg-white">
        <CardContent className="p-0">
          {usersWithAgencies && usersWithAgencies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Facilities</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithAgencies.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FAF8F5] flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "Unnamed User"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={roleColors[user.role || "family_member"]}>
                        {user.role === "super_admin" && <Shield className="w-3 h-3 mr-1" />}
                        {roleLabels[user.role || "family_member"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.agencies && user.agencies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.agencies.slice(0, 2).map((agency: any) => (
                            <Link 
                              key={agency.id} 
                              href={`/super-admin/facilities/${agency.id}`}
                            >
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-[#FAF8F5]"
                              >
                                <Building2 className="w-3 h-3 mr-1" />
                                {agency.name}
                              </Badge>
                            </Link>
                          ))}
                          {user.agencies.length > 2 && (
                            <Badge variant="outline">
                              +{user.agencies.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No facilities</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Suspend User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              {(searchQuery || roleFilter !== "all") && (
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
