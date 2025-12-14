import { createClient } from "../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  UserCheck, 
  Activity,
  TrendingUp,
  ArrowRight,
  Plus
} from "lucide-react";
import Link from "next/link";

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  // Fetch aggregate stats
  const [agenciesResult, usersResult, patientsResult, familyResult] = await Promise.all([
    supabase.from("agencies").select("id, status", { count: "exact" }),
    supabase.from("users").select("id", { count: "exact" }),
    supabase.from("patients").select("id, status", { count: "exact" }),
    supabase.from("family_members").select("id", { count: "exact" }),
  ]);

  const totalFacilities = agenciesResult.count || 0;
  const activeFacilities = agenciesResult.data?.filter((a: any) => a.status === "active").length || 0;
  const totalUsers = usersResult.count || 0;
  const totalPatients = patientsResult.count || 0;
  const activePatients = patientsResult.data?.filter((p: any) => p.status === "active").length || 0;
  const totalFamilyMembers = familyResult.count || 0;

  // Fetch recent facilities
  const { data: recentFacilities } = await supabase
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      title: "Total Facilities",
      value: totalFacilities,
      subtitle: `${activeFacilities} active`,
      icon: Building2,
      color: "bg-[#7A9B8E]",
      href: "/super-admin/facilities",
    },
    {
      title: "Total Users",
      value: totalUsers,
      subtitle: "Platform-wide",
      icon: Users,
      color: "bg-[#B8A9D4]",
      href: "/super-admin/users",
    },
    {
      title: "Total Patients",
      value: totalPatients,
      subtitle: `${activePatients} active`,
      icon: UserCheck,
      color: "bg-[#D4876F]",
      href: "/super-admin/facilities",
    },
    {
      title: "Family Members",
      value: totalFamilyMembers,
      subtitle: "Connected families",
      icon: Activity,
      color: "bg-[#7A9B8E]",
      href: "/super-admin/facilities",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Platform Overview
          </h1>
          <p className="text-muted-foreground">
            Manage all facilities and monitor platform health
          </p>
        </div>
        <Link href="/super-admin/facilities?action=create">
          <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Facility
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="soft-shadow hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-semibold text-[#2D2D2D]" style={{ fontFamily: 'Fraunces, serif' }}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Facilities */}
      <Card className="soft-shadow border-0 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>
            Recent Facilities
          </CardTitle>
          <Link href="/super-admin/facilities">
            <Button variant="ghost" className="text-[#7A9B8E] hover:text-[#6A8B7E] gap-2">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentFacilities && recentFacilities.length > 0 ? (
              recentFacilities.map((facility: any) => (
                <Link 
                  key={facility.id} 
                  href={`/super-admin/facilities/${facility.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F2EF] transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center soft-shadow">
                        <Building2 className="w-5 h-5 text-[#7A9B8E]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2D2D2D]">{facility.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {facility.city && facility.state 
                            ? `${facility.city}, ${facility.state}` 
                            : "Location not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        className={
                          facility.status === "active" 
                            ? "bg-[#7A9B8E]/20 text-[#7A9B8E]" 
                            : "bg-[#D4876F]/20 text-[#D4876F]"
                        }
                      >
                        {facility.status || "active"}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#7A9B8E] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No facilities yet</p>
                <Link href="/super-admin/facilities?action=create">
                  <Button variant="link" className="text-[#7A9B8E]">
                    Create your first facility
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="soft-shadow border-0 bg-white hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/super-admin/facilities?action=create">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#7A9B8E]/10 flex items-center justify-center group-hover:bg-[#7A9B8E]/20 transition-colors">
                <Plus className="w-6 h-6 text-[#7A9B8E]" />
              </div>
              <div>
                <p className="font-medium text-[#2D2D2D]">Add New Facility</p>
                <p className="text-sm text-muted-foreground">Onboard a new hospice agency</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="soft-shadow border-0 bg-white hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/super-admin/users">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#B8A9D4]/10 flex items-center justify-center group-hover:bg-[#B8A9D4]/20 transition-colors">
                <Users className="w-6 h-6 text-[#B8A9D4]" />
              </div>
              <div>
                <p className="font-medium text-[#2D2D2D]">Manage Users</p>
                <p className="text-sm text-muted-foreground">View all platform users</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="soft-shadow border-0 bg-white hover:shadow-lg transition-all cursor-pointer group">
          <Link href="/super-admin/settings">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D4876F]/10 flex items-center justify-center group-hover:bg-[#D4876F]/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-[#D4876F]" />
              </div>
              <div>
                <p className="font-medium text-[#2D2D2D]">Platform Settings</p>
                <p className="text-sm text-muted-foreground">Configure global settings</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
