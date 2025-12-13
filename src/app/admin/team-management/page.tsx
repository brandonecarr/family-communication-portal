import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function AdminTeamManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const teamMembers = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@agency.com",
      role: "Administrator",
      status: "Active",
      lastLogin: "2024-01-20 10:30 AM",
      joinDate: "2023-06-15",
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "michael@agency.com",
      role: "Manager",
      status: "Active",
      lastLogin: "2024-01-20 09:15 AM",
      joinDate: "2023-08-20",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      email: "emily@agency.com",
      role: "Staff",
      status: "Active",
      lastLogin: "2024-01-19 04:45 PM",
      joinDate: "2023-10-10",
    },
    {
      id: "4",
      name: "David Thompson",
      email: "david@agency.com",
      role: "Staff",
      status: "Inactive",
      lastLogin: "2024-01-10 02:20 PM",
      joinDate: "2023-11-05",
    },
  ];

  const roleColors = {
    Administrator: "bg-red-100 text-red-800",
    Manager: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    Staff: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
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
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
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
              2
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
          {teamMembers.map((member) => (
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
                      roleColors[member.role as keyof typeof roleColors]
                    }
                  >
                    {member.role}
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
                  <span>Joined: {member.joinDate}</span>
                  <span>Last login: {member.lastLogin}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
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
                  <th className="text-center py-2 px-3 font-medium">Manager</th>
                  <th className="text-center py-2 px-3 font-medium">Staff</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "View Dashboard",
                  "Manage Patients",
                  "Manage Visits",
                  "Manage Messages",
                  "View Reports",
                  "Manage Team",
                  "Manage Settings",
                  "View Audit Logs",
                ].map((permission) => (
                  <tr key={permission} className="border-b">
                    <td className="py-2 px-3">{permission}</td>
                    <td className="text-center py-2 px-3">
                      <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                        ✓
                      </Badge>
                    </td>
                    <td className="text-center py-2 px-3">
                      <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                        ✓
                      </Badge>
                    </td>
                    <td className="text-center py-2 px-3">
                      {[
                        "View Dashboard",
                        "Manage Patients",
                        "Manage Visits",
                        "Manage Messages",
                        "View Reports",
                      ].includes(permission) ? (
                        <Badge className="bg-[#7A9B8E]/20 text-[#7A9B8E]">
                          ✓
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
          {[
            {
              email: "john.smith@agency.com",
              role: "Manager",
              sentDate: "2024-01-18",
              expiresDate: "2024-02-01",
            },
            {
              email: "jane.doe@agency.com",
              role: "Staff",
              sentDate: "2024-01-19",
              expiresDate: "2024-02-02",
            },
          ].map((invite, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/30"
            >
              <div>
                <p className="font-medium text-sm">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  Role: {invite.role} | Sent: {invite.sentDate} | Expires:{" "}
                  {invite.expiresDate}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                >
                  Resend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs text-red-600 hover:text-red-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
