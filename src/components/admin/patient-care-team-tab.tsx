"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, X } from "lucide-react";
import {
  getStaffByAgency,
  getPatientCareTeam,
  assignStaffToPatient,
  removeStaffFromPatient,
  type StaffMember,
} from "@/lib/actions/patient-care-team";

interface PatientCareTeamTabProps {
  patientId: string;
  agencyId: string;
}

const JOB_ROLES = [
  "Admin",
  "RN",
  "LVN/LPN",
  "HHA",
  "MSW",
  "Chaplain",
  "MD",
  "Care coordinator",
  "NP",
];

interface TeamMemberAssignment {
  id: string;
  role: string;
  userId: string;
  userName: string;
  careTeamMemberId: string;
}

export function PatientCareTeamTab({
  patientId,
  agencyId,
}: PatientCareTeamTabProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [patientId, agencyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staff, careTeam] = await Promise.all([
        getStaffByAgency(agencyId),
        getPatientCareTeam(patientId),
      ]);

      setStaffMembers(staff);

      // Build team members list
      const members: TeamMemberAssignment[] = [];
      for (const assignment of careTeam) {
        const careTeamMember = assignment.care_team_members as any;
        if (careTeamMember?.role && careTeamMember?.user_id) {
          const staffMember = staff.find(
            (s) => s.user_id === careTeamMember.user_id
          );
          if (staffMember) {
            members.push({
              id: assignment.id,
              role: careTeamMember.role,
              userId: staffMember.user_id,
              userName: staffMember.full_name,
              careTeamMemberId: assignment.care_team_member_id,
            });
          }
        }
      }
      setTeamMembers(members);
    } catch (error) {
      console.error("Error loading care team data:", error);
      toast({
        title: "Error",
        description: "Failed to load care team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedRole || !selectedStaff) {
      toast({
        title: "Error",
        description: "Please select both a role and a staff member",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignStaffToPatient(patientId, selectedStaff, selectedRole, agencyId);
      
      await loadData();

      setDialogOpen(false);
      setSelectedRole("");
      setSelectedStaff("");

      toast({
        title: "Success",
        description: `Team member assigned successfully`,
      });
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast({
        title: "Error",
        description: "Failed to assign staff member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveTeamMember = async (careTeamMemberId: string, role: string) => {
    try {
      await removeStaffFromPatient(patientId, careTeamMemberId);
      
      setTeamMembers((prev) => prev.filter((m) => m.careTeamMemberId !== careTeamMemberId));

      toast({
        title: "Success",
        description: `${role} removed successfully`,
      });
    } catch (error) {
      console.error("Error removing staff:", error);
      toast({
        title: "Error",
        description: "Failed to remove staff member",
        variant: "destructive",
      });
    }
  };

  const getStaffForRole = (jobRole: string) => {
    return staffMembers.filter((staff) => staff.job_role === jobRole);
  };

  const getAvailableRoles = () => {
    const assignedRoles = teamMembers.map((m) => m.role);
    return JOB_ROLES.filter((role) => !assignedRoles.includes(role));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Care Team</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A9B8E] hover:bg-[#7A9B8E]/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FAF8F5]">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role" className="bg-white border-none">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().length === 0 ? (
                      <SelectItem value="no-roles" disabled>
                        All roles assigned
                      </SelectItem>
                    ) : (
                      getAvailableRoles().map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedRole && (
                <div className="space-y-2">
                  <Label htmlFor="staff">Staff Member</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger id="staff" className="bg-white border-none">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {getStaffForRole(selectedRole).length === 0 ? (
                        <SelectItem value="no-staff" disabled>
                          No {selectedRole} staff available
                        </SelectItem>
                      ) : (
                        getStaffForRole(selectedRole).map((staff) => (
                          <SelectItem key={staff.user_id} value={staff.user_id}>
                            {staff.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setSelectedRole("");
                    setSelectedStaff("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTeamMember}
                  disabled={!selectedRole || !selectedStaff}
                  className="bg-[#7A9B8E] hover:bg-[#7A9B8E]/90"
                >
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No team members assigned yet. Click "Add Team Member" to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl border bg-white"
              >
                <div>
                  <p className="font-semibold text-sm">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.userName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTeamMember(member.careTeamMemberId, member.role)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
