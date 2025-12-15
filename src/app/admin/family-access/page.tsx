import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResendFamilyInviteButton } from "@/components/admin/resend-family-invite-button";
import { 
  Users, 
  Search, 
  Filter, 
  Mail,
  Phone,
  Shield,
  UserPlus,
  MoreVertical,
  Trash2,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { inviteFamilyMemberAction } from "@/lib/actions/patients";
import { Database } from "@/types/supabase";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"] & {
  patient?: { 
    id: string;
    first_name: string;
    last_name: string;
    agency_id: string;
  } | null;
};

export const dynamic = "force-dynamic";

export default async function AdminFamilyAccessPage({
  searchParams,
}: {
  searchParams: { patient?: string; action?: string; invite?: string; error?: string; success?: string };
}) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's role from users table
  const { data: userData } = await serviceSupabase
    ?.from("users")
    .select("role")
    .eq("id", user.id)
    .single() || { data: null };
  
  const isSuperAdmin = userData?.role === "super_admin";
  
  // Get agency_id from agency_users table
  let userAgencyId: string | undefined;
  if (!isSuperAdmin && serviceSupabase) {
    const { data: agencyUserData } = await serviceSupabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();
    
    userAgencyId = agencyUserData?.agency_id;
  }

  const showInviteForm = searchParams.action === "invite" || searchParams.invite === "open" || !!searchParams.error;
  const selectedPatientId = searchParams.patient;

  // Fetch all patients for the dropdown (filtered by agency unless super admin)
  let patientsQuery = serviceSupabase
    ?.from("patients")
    .select("id, first_name, last_name, agency_id")
    .eq("status", "active")
    .order("first_name");
  
  if (!isSuperAdmin && userAgencyId) {
    patientsQuery = patientsQuery?.eq("agency_id", userAgencyId);
  }

  const { data: patientsRaw } = await patientsQuery || { data: null };

  // Map patients to include full name
  const patients = patientsRaw?.map((p: { id: string; first_name: string; last_name: string; agency_id: string }) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
  }));

  // Fetch selected patient details if provided
  const selectedPatient = selectedPatientId
    ? patients?.find((p: { id: string; name: string }) => p.id === selectedPatientId)
    : null;

  // Fetch all family members (filter by patient if provided)
  // Use service client to bypass RLS, but filter by agency for security
  let familyMembersData: FamilyMember[] | null = null;
  let familyMembersError: any = null;

  if (selectedPatientId) {
    // Filter by specific patient
    const { data, error } = await serviceSupabase
      ?.from("family_members")
      .select(`
        *,
        patient:patients!patient_id (
          id,
          first_name,
          last_name,
          agency_id
        )
      `)
      .eq("patient_id", selectedPatientId)
      .order("created_at", { ascending: false }) || { data: null, error: null };
    
    familyMembersData = data;
    familyMembersError = error;
  } else if (isSuperAdmin) {
    // Super admin sees all family members
    const { data, error } = await serviceSupabase
      ?.from("family_members")
      .select(`
        *,
        patient:patients!patient_id (
          id,
          first_name,
          last_name,
          agency_id
        )
      `)
      .order("created_at", { ascending: false }) || { data: null, error: null };
    
    familyMembersData = data;
    familyMembersError = error;
  } else if (userAgencyId) {
    // Agency admin sees only their agency's family members
    // We need to join with patients to filter by agency
    const { data: agencyPatients } = await serviceSupabase
      ?.from("patients")
      .select("id")
      .eq("agency_id", userAgencyId) || { data: null };
    
    const patientIds = agencyPatients?.map(p => p.id) || [];
    
    if (patientIds.length > 0) {
      const { data, error } = await serviceSupabase
        ?.from("family_members")
        .select(`
          *,
          patient:patients!patient_id (
            id,
            first_name,
            last_name,
            agency_id
          )
        `)
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false }) || { data: null, error: null };
      
      familyMembersData = data;
      familyMembersError = error;
    }
  }

  const familyMembers = familyMembersData;

  const roleColors = {
    family_admin: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    family_member: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Family Access Management
          </h1>
          <p className="text-muted-foreground">
            {selectedPatient
              ? `Managing family access for ${selectedPatient.name}`
              : "Manage family member access across all patients"}
          </p>
        </div>
        {!showInviteForm && (
          <Link href={`/admin/family-access?action=invite${selectedPatientId ? `&patient=${selectedPatientId}` : ""}`}>
            <Button className="rounded-full gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Family Member
            </Button>
          </Link>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Invite Family Member</CardTitle>
            <Link href={selectedPatientId ? `/admin/patients/${selectedPatientId}` : "/admin/family-access"}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {/* Error Message */}
            {searchParams.error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchParams.error}</AlertDescription>
              </Alert>
            )}
            
            {/* Success Message */}
            {searchParams.success && (
              <Alert className="mb-6 border-[#7A9B8E] bg-[#7A9B8E]/10">
                <CheckCircle className="h-4 w-4 text-[#7A9B8E]" />
                <AlertDescription className="text-[#7A9B8E]">{searchParams.success}</AlertDescription>
              </Alert>
            )}
            
            <form action={inviteFamilyMemberAction} className="space-y-6">
              <input type="hidden" name="redirectTo" value={selectedPatientId ? `/admin/patients/${selectedPatientId}` : "/admin/family-access"} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient *</Label>
                  <input type="hidden" name="patient_id" value={selectedPatientId || ""} />
                  <Input 
                    value={selectedPatient?.name || "No patient selected"} 
                    readOnly 
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <input type="hidden" name="role" value="family_member" />
                  <Input 
                    value="Family Member" 
                    readOnly 
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" name="name" placeholder="Enter full name" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship *</Label>
                  <Select name="relationship" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" name="email" type="email" placeholder="Enter email address" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="Enter phone number" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href={selectedPatientId ? `/admin/patients/${selectedPatientId}` : "/admin/family-access"}>
                  <Button type="button" variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="rounded-full gap-2">
                  <Send className="h-4 w-4" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search family members..."
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

      {/* Family Members List */}
      <div className="grid gap-4">
        {!familyMembers || familyMembers.length === 0 ? (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6 pb-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No family members found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedPatientId 
                  ? "This patient doesn't have any family members invited yet."
                  : "No family members have been invited across any patients."}
              </p>
              <Link href={`/admin/family-access?action=invite${selectedPatientId ? `&patient=${selectedPatientId}` : ""}`}>
                <Button className="rounded-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Family Member
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          familyMembers.map((member: FamilyMember) => (
          <Card key={member.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-[#7A9B8E]">
                      {member.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{member.name || "Unnamed"}</h3>
                        <p className="text-sm text-muted-foreground">
                          Patient: {member.patient ? `${member.patient.first_name} ${member.patient.last_name}` : "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.status === "invited" && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                            Pending
                          </Badge>
                        )}
                        <Badge className={roleColors[member.role as keyof typeof roleColors]}>
                          {member.role === "family_admin" ? "Administrator" : "Family Member"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {member.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.relationship && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="capitalize">{member.relationship}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {member.status === "invited" && (
                        <ResendFamilyInviteButton familyMemberId={member.id} />
                      )}
                      <Button variant="outline" size="sm" className="rounded-full">
                        View Activity
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full">
                        Change Role
                      </Button>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-600 focus:text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Access
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )))}
      </div>
    </div>
  );
}
