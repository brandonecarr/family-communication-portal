"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  inviteTeamMember,
  resendInvitation,
  cancelInvitation,
  updateTeamMemberRole,
  removeTeamMember,
  type TeamMember,
  type TeamInvitation,
} from "@/lib/actions/team-management";

interface TeamManagementClientProps {
  teamMembers: TeamMember[];
  pendingInvitations: TeamInvitation[];
  currentUserId: string;
  currentUserRole: string;
}

const roleColors: Record<string, string> = {
  agency_admin: "bg-red-100 text-red-800",
  agency_staff: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  super_admin: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
  family_admin: "bg-blue-100 text-blue-800",
  family_member: "bg-gray-100 text-gray-800",
};

const roleLabels: Record<string, string> = {
  agency_admin: "Administrator",
  agency_staff: "Staff",
  super_admin: "Super Admin",
  family_admin: "Family Admin",
  family_member: "Family Member",
};

const permissions = [
  { name: "View Dashboard", admin: true, staff: true },
  { name: "Manage Patients", admin: true, staff: true },
  { name: "Manage Visits", admin: true, staff: true },
  { name: "Manage Messages", admin: true, staff: true },
  { name: "View Reports", admin: true, staff: true },
  { name: "Manage Team", admin: true, staff: false },
  { name: "Manage Settings", admin: true, staff: false },
  { name: "View Audit Logs", admin: true, staff: false },
];

// Helper function to format dates consistently on client side
function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeamManagementClient({
  teamMembers: initialTeamMembers,
  pendingInvitations: initialPendingInvitations,
  currentUserId,
  currentUserRole,
}: TeamManagementClientProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations);
  const [mounted, setMounted] = useState(false);
  
  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agency_staff");
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUserRole === "agency_admin" || currentUserRole === "super_admin";

  // Prevent hydration mismatch by only rendering dates after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Client-side check for already invited emails
    const alreadyInvited = pendingInvitations.some(
      (inv) => inv.email.toLowerCase() === inviteEmail.toLowerCase()
    );
    if (alreadyInvited) {
      toast({
        title: "Already Invited",
        description: "This email has a pending invitation. Cancel it first to send a new one.",
        variant: "destructive",
      });
      return;
    }

    // Client-side check for existing team members
    const alreadyMember = teamMembers.some(
      (m) => m.email.toLowerCase() === inviteEmail.toLowerCase()
    );
    if (alreadyMember) {
      toast({
        title: "Already a Member",
        description: "This email is already a team member.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await inviteTeamMember({
        email: inviteEmail,
        role: inviteRole,
      });
      
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("agency_staff");
      
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      await resendInvitation(invitationId);
      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      await cancelInvitation(invitationId);
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      toast({
        title: "Success",
        description: "Invitation cancelled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedMember || !newRole) return;

    setLoading(true);
    try {
      await updateTeamMemberRole(selectedMember.id, newRole);
      
      setTeamMembers(prev =>
        prev.map(m =>
          m.id === selectedMember.id ? { ...m, role: newRole } : m
        )
      );
      
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      
      setEditRoleDialogOpen(false);
      setSelectedMember(null);
      setNewRole("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setLoading(true);
    try {
      await removeTeamMember(selectedMember.id);
      
      setTeamMembers(prev => prev.filter(m => m.id !== selectedMember.id));
      
      toast({
        title: "Success",
        description: "Team member removed",
      });
      
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditRoleDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setEditRoleDialogOpen(true);
  };

  const openRemoveDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage team members and their permissions
          </p>
        </div>
        {isAdmin && (
          <Button 
            className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2"
            onClick={() => setInviteDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">TOTAL</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Team Members
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {teamMembers.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">ACTIVE</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Active Members
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {teamMembers.filter((m) => m.status === "Active").length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-[#7A9B8E]" />
              </div>
              <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">PENDING</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Pending Invites
            </p>
            <p
              className="text-3xl font-light"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {pendingInvitations.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No team members yet. Invite someone to get started.
            </p>
          ) : (
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-start justify-between p-4 rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-[#7A9B8E]">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{member.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge
                      className={
                        roleColors[member.role] || "bg-gray-100 text-gray-800"
                      }
                    >
                      {roleLabels[member.role] || member.role}
                    </Badge>
                    <Badge
                      className={
                        member.status === "Active"
                          ? "bg-[#7A9B8E]/20 text-[#7A9B8E]"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {member.status}
                    </Badge>
                    <span>Joined: {mounted ? formatDate(member.joinDate) : "—"}</span>
                    <span>Last login: {mounted ? formatDateTime(member.lastLogin) : "—"}</span>
                  </div>
                </div>

                {isAdmin && member.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => openEditRoleDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2 text-red-600 focus:text-red-600"
                        onClick={() => openRemoveDialog(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">
                    Permission
                  </th>
                  <th className="text-center py-2 px-3 font-medium">
                    Administrator
                  </th>
                  <th className="text-center py-2 px-3 font-medium">Staff</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.name} className="border-b">
                    <td className="py-2 px-3">{permission.name}</td>
                    <td className="text-center py-2 px-3">
                      {permission.admin ? (
                        <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                          <Check className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      {permission.staff ? (
                        <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                          <Check className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInvitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending invitations
            </p>
          ) : (
            pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
              >
                <div>
                  <p className="font-medium text-sm">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {roleLabels[invite.role] || invite.role} | Sent:{" "}
                    {mounted ? formatDate(invite.created_at) : "—"} | Expires:{" "}
                    {mounted ? formatDate(invite.expires_at) : "—"}
                  </p>
                </div>
                {isAdmin && invite.token && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => handleResendInvitation(invite.id)}
                      disabled={loading}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleCancelInvitation(invite.id)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {isAdmin && !invite.token && (
                  <Badge className="bg-amber-100 text-amber-800">
                    Awaiting Setup
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Invite Team Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to add a new team member to your agency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-[#FAF8F5] border-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-[#FAF8F5] border-none">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_admin">Administrator</SelectItem>
                  <SelectItem value="agency_staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={loading || !inviteEmail}
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
            >
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              Edit Role
            </DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-[#FAF8F5] border-none">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_admin">Administrator</SelectItem>
                  <SelectItem value="agency_staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={loading || !newRole}
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Fraunces, serif" }}>
              Remove Team Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.name} from your team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRemoveMember}
              disabled={loading}
              variant="destructive"
            >
              {loading ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
