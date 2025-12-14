import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Send
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

export const dynamic = "force-dynamic";

export default async function AdminFamilyAccessPage({
  searchParams,
}: {
  searchParams: { patient?: string; action?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const showInviteForm = searchParams.action === "invite";
  const selectedPatientId = searchParams.patient;

  // Fetch all patients for the dropdown
  const { data: patientsRaw } = await supabase
    .from("patients")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  // Map patients to include full name
  const patients = patientsRaw?.map((p: Patient) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
  }));

  // Fetch selected patient details if provided
  const selectedPatient = selectedPatientId
    ? patients?.find((p: { id: string; name: string }) => p.id === selectedPatientId)
    : null;

  // Fetch all family members (filter by patient if provided)
  let familyQuery = supabase
    .from("family_members")
    .select(`
      *,
      patient:patient_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (selectedPatientId) {
    familyQuery = familyQuery.eq("patient_id", selectedPatientId);
  }

  const { data: familyMembers } = await familyQuery;

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
        {familyMembers?.map((member) => (
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
                          Patient: {member.patient?.name || "Unknown"}
                        </p>
                      </div>
                      <Badge className={roleColors[member.role as keyof typeof roleColors]}>
                        {member.role === "family_admin" ? "Administrator" : "Family Member"}
                      </Badge>
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
        ))}

        {familyMembers?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No family members found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Family members will appear here once they're added
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
