"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2, CheckCircle, Plus } from "lucide-react";
import { createVisit } from "@/lib/actions/visits";
import { getTeamMembers, type TeamMember } from "@/lib/actions/team-management";

export function CreateVisitDialog({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [staffMembers, setStaffMembers] = useState<TeamMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Load staff members when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingStaff(true);
      getTeamMembers()
        .then((members) => {
          setStaffMembers(members);
          setLoadingStaff(false);
        })
        .catch((err) => {
          console.error("Error loading staff members:", err);
          setLoadingStaff(false);
        });
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedDate) {
      setError("Please select a date");
      return;
    }

    if (!selectedStaffId) {
      setError("Please select a staff member");
      return;
    }

    const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);
    if (!selectedStaff) {
      setError("Invalid staff member selected");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const visitData = {
      patient_id: patientId,
      staff_name: selectedStaff.name,
      discipline: selectedStaff.jobRole || "Staff",
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: formData.get("scheduled_time") as string,
      notes: formData.get("notes") as string || undefined,
    };

    startTransition(async () => {
      try {
        await createVisit(visitData);
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setSelectedDate(null);
          setSelectedStaffId("");
        }, 1500);
      } catch (err: any) {
        setError(err?.message || "Failed to create visit");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Add Visit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule New Visit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Visit scheduled successfully!
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="staff_member">Staff Member *</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={loadingStaff}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingStaff ? "Loading staff..." : "Select staff member"} />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} {staff.jobRole ? `(${staff.jobRole})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date *</Label>
              <DatePicker
                id="scheduled_date"
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="MM/dd/yyyy"
                placeholderText="Select date"
                minDate={new Date()}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Time</Label>
              <Input
                id="scheduled_time"
                name="scheduled_time"
                type="time"
                placeholder="HH:MM"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full gap-2" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              {isPending ? "Scheduling..." : "Schedule Visit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
