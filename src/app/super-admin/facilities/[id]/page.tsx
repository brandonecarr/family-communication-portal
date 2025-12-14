import { createClient } from "../../../../../supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Users,
  UserCheck,
  Heart,
  Edit,
  UserPlus,
  Trash2,
  Shield,
  Calendar,
  MoreVertical,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { EditFacilityForm } from "@/components/super-admin/edit-facility-form";
import { AddStaffForm } from "@/components/super-admin/add-staff-form";
import { ResendInviteButton } from "@/components/super-admin/resend-invite-button";

export default async function FacilityDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { action?: string; tab?: string };
}) {
  const supabase = await createClient();
  const isEditing = searchParams.action === "edit";
  const activeTab = searchParams.tab || "overview";
  const showAddStaff = searchParams.action === "add-staff";

  // Fetch facility
  const { data: facility, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !facility) {
    notFound();
  }

  // Fetch staff members
  const { data: staffMembers } = await supabase
    .from("agency_users")
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .eq("agency_id", params.id);

  // Fetch staff details from users table
  const staffWithDetails = await Promise.all(
    (staffMembers || []).map(async (staff: any) => {
      const { data: userDetails } = await supabase
        .from("users")
        .select("name, email, role")
        .eq("id", staff.user_id)
        .single();
      return {
        ...staff,
        userDetails,
      };
    })
  );

  // Fetch patients
  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .eq("agency_id", params.id)
    .order("name");

  // Fetch family members through patients
  const patientIds = patients?.map((p: any) => p.id) || [];
  const { data: familyMembers } = patientIds.length > 0 
    ? await supabase
        .from("family_members")
        .select(`
          *,
          patient:patient_id (
            id,
            name
          )
        `)
        .in("patient_id", patientIds)
    : { data: [] };

  // Stats
  const stats = {
    patients: patients?.length || 0,
    activePatients: patients?.filter((p: any) => p.status === "active").length || 0,
    staff: staffMembers?.length || 0,
    familyMembers: familyMembers?.length || 0,
  };

  const statusColors: Record<string, string> = {
    active: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    inactive: "bg-[#D4876F]/20 text-[#D4876F]",
    suspended: "bg-red-100 text-red-600",
    discharged: "bg-gray-100 text-gray-600",
    deceased: "bg-gray-200 text-gray-700",
  };

  const roleColors: Record<string, string> = {
    agency_admin: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    agency_staff: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    family_admin: "bg-[#D4876F]/20 text-[#D4876F]",
    family_member: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/facilities">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: facility.primary_color || '#7A9B8E' }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                {facility.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={statusColors[facility.status || "active"]}>
                  {facility.status || "active"}
                </Badge>
                <Badge variant="secondary" className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                  {facility.subscription_tier || "standard"}
                </Badge>
                {!facility.onboarding_completed && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    Pending Setup
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        {!isEditing ? (
          <div className="flex gap-2">
            {!facility.onboarding_completed && (
              <ResendInviteButton 
                facilityId={params.id} 
                hasInvite={!!facility.admin_email_pending}
              />
            )}
            <Link href={`/super-admin/facilities/${params.id}?action=edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Facility
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={`/super-admin/facilities/${params.id}`}>
            <Button variant="outline" className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </Link>
        )}
      </div>

      {/* Pending Admin Setup Alert */}
      {!facility.onboarding_completed && facility.admin_email_pending && (
        <Card className="soft-shadow border-0 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">Admin Setup Pending</p>
                  <p className="text-sm text-amber-600">
                    Invitation sent to <span className="font-medium">{facility.admin_email_pending}</span>
                  </p>
                </div>
              </div>
              <ResendInviteButton facilityId={params.id} hasInvite={true} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="soft-shadow border-0 bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#7A9B8E]/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#7A9B8E]" />
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>
                {stats.patients}
              </p>
              <p className="text-sm text-muted-foreground">Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-0 bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#B8A9D4]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#B8A9D4]" />
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>
                {stats.staff}
              </p>
              <p className="text-sm text-muted-foreground">Staff Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-0 bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#D4876F]/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-[#D4876F]" />
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>
                {stats.familyMembers}
              </p>
              <p className="text-sm text-muted-foreground">Family Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="soft-shadow border-0 bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'Fraunces, serif' }}>
                {stats.activePatients}
              </p>
              <p className="text-sm text-muted-foreground">Active Patients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} className="space-y-6">
        <TabsList className="bg-white soft-shadow p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg">Staff ({stats.staff})</TabsTrigger>
          <TabsTrigger value="patients" className="rounded-lg">Patients ({stats.patients})</TabsTrigger>
          <TabsTrigger value="family" className="rounded-lg">Family Members ({stats.familyMembers})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="soft-shadow border-0 bg-white">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>
                Facility Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <EditFacilityForm facility={facility} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Email</p>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {facility.email || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {facility.phone || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {facility.address 
                          ? `${facility.address}, ${facility.city || ""} ${facility.state || ""} ${facility.zip_code || ""}`.trim()
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Subscription Tier</p>
                      <Badge variant="secondary" className="bg-[#B8A9D4]/20 text-[#B8A9D4] mt-1">
                        {facility.subscription_tier || "standard"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Limits</p>
                      <p className="font-medium">
                        {facility.max_patients || 100} patients / {facility.max_staff || 50} staff
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(facility.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card className="soft-shadow border-0 bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>
                Staff Members
              </CardTitle>
              <Link href={`/super-admin/facilities/${params.id}?tab=staff&action=add-staff`}>
                <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Staff
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {showAddStaff && (
                <AddStaffForm facilityId={params.id} />
              )}

              {staffWithDetails && staffWithDetails.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffWithDetails.map((staff: any) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">
                          {staff.userDetails?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{staff.userDetails?.email || staff.user?.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[staff.role]}>
                            {staff.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(staff.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No staff members assigned</p>
                  <Link href={`/super-admin/facilities/${params.id}?tab=staff&action=add-staff`}>
                    <Button variant="link" className="text-[#7A9B8E]">
                      Add your first staff member
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients">
          <Card className="soft-shadow border-0 bg-white">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>
                Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patients && patients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient: any) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[patient.status || "active"]}>
                            {patient.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No patients in this facility</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Members Tab */}
        <TabsContent value="family">
          <Card className="soft-shadow border-0 bg-white">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>
                Family Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers && familyMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((member: any) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.patient?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[member.role || "family_member"]}>
                            {(member.role || "family_member").replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[member.status || "active"]}>
                            {member.status || "active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No family members connected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
