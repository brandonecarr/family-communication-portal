import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Phone, Shield, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default async function FamilyMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get current family member info
  const { data: currentMember } = await supabase
    .from("family_members")
    .select("*, patient:patient_id(*)")
    .eq("user_id", user.id)
    .single();

  if (!currentMember) {
    return redirect("/family");
  }

  // Check if user is admin
  const isAdmin = currentMember.role === "family_admin";

  // Get all family members for this patient
  const { data: familyMembers } = await supabase
    .from("family_members")
    .select("*")
    .eq("patient_id", currentMember.patient_id)
    .order("created_at", { ascending: false });

  const roleColors = {
    family_admin: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    family_member: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                Family Access
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage who can access {currentMember.patient?.name || "the patient"}'s care information
              </p>
            </div>
            {isAdmin && (
              <Link href="/family/members/invite">
                <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </Link>
            )}
          </div>
        </div>

        {!isAdmin && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-6 bg-[#B8A9D4]/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-[#B8A9D4] mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Limited Access</p>
                  <p className="text-sm text-muted-foreground">
                    Only family administrators can invite new members or manage access. Contact your family admin if you need to add someone.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {familyMembers?.map((member) => (
            <Card key={member.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base">{member.name || "Unnamed"}</h3>
                        <Badge variant="outline" className="text-xs font-normal capitalize">
                          {member.relationship}
                        </Badge>
                        {member.user_id === user.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {member.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#7A9B8E] hover:bg-[#7A9B8E]/90 text-white px-4 py-1.5">
                        {member.role === "family_admin" ? "Administrator" : "Family Member"}
                      </Badge>
                      {isAdmin && member.user_id !== user.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted">
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
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>

        {familyMembers?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlus className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No family members yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Invite family members to give them access to care information
              </p>
              {isAdmin && (
                <Link href="/family/members/invite">
                  <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Member
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
