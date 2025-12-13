"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Loader2, CheckCircle, Phone, Mail } from "lucide-react";
import { updateFamilyMember, deleteFamilyMember } from "@/lib/actions/patients";

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  relationship: string;
  status?: string;
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRelationship(relationship: string): string {
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

export function FamilyMemberCard({
  member,
  patientId,
}: {
  member: FamilyMember;
  patientId: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [phone, setPhone] = useState(member.phone ? formatPhoneNumber(member.phone) : "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.append("id", member.id);
    formData.append("patient_id", patientId);
    formData.set("phone", phone.replace(/\D/g, ""));

    startTransition(async () => {
      try {
        const result = await updateFamilyMember(formData);
        if (result.success) {
          setSuccess(true);
          router.refresh();
          setTimeout(() => {
            setEditOpen(false);
            setSuccess(false);
          }, 1500);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to update family member");
      }
    });
  }

  async function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteFamilyMember(member.id, patientId);
        router.refresh();
        setDeleteOpen(false);
      } catch (err: any) {
        console.error("Failed to delete:", err);
      }
    });
  }

  return (
    <div className="flex items-center justify-between p-6 border rounded-lg bg-white">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <p className="font-semibold text-base">{member.name}</p>
          <Badge variant="outline" className="text-xs font-normal">
            {formatRelationship(member.relationship)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            {member.email}
          </span>
          {member.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {formatPhoneNumber(member.phone)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className="bg-[#7A9B8E] hover:bg-[#7A9B8E]/90 text-white px-4 py-1.5">
          {formatRole(member.role)}
        </Badge>
        
        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Family Member</DialogTitle>
              <DialogDescription>
                Update the family member's information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Family member updated successfully!
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={member.name}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={member.email}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  placeholder="(xxx) xxx-xxxx"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-relationship">Relationship *</Label>
                <Select name="relationship" defaultValue={member.relationship} required>
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
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {member.name} from this patient's family members? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isDeleting ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
