"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateVisit } from "@/lib/actions/visits";

interface Visit {
  id: string;
  staff_name: string;
  discipline: string;
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
  status: string;
}

export function EditVisitDialog({ visit }: { visit: Visit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    visit.scheduled_date ? new Date(visit.scheduled_date) : null
  );
  const [discipline, setDiscipline] = useState<string>(visit.discipline);
  const [status, setStatus] = useState<string>(visit.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedDate) {
      setError("Please select a date");
      return;
    }

    if (!discipline) {
      setError("Please select a discipline");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const visitData = {
      staff_name: formData.get("staff_name") as string,
      discipline: discipline,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: formData.get("scheduled_time") as string,
      notes: formData.get("notes") as string || undefined,
      status: status,
    };

    startTransition(async () => {
      try {
        await updateVisit(visit.id, visitData);
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } catch (err: any) {
        setError(err?.message || "Failed to update visit");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Visit</DialogTitle>
          <DialogDescription>
            Update visit details for this patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="staff_name">Staff Name *</Label>
              <Input
                id="staff_name"
                name="staff_name"
                placeholder="Enter staff name"
                defaultValue={visit.staff_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline *</Label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discipline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nursing">Nursing</SelectItem>
                  <SelectItem value="Aide">Aide</SelectItem>
                  <SelectItem value="Social Work">Social Work</SelectItem>
                  <SelectItem value="Chaplain">Chaplain</SelectItem>
                  <SelectItem value="Physician">Physician</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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
                defaultValue={visit.scheduled_time || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any notes about this visit..."
                rows={3}
                defaultValue={visit.notes || ""}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
              Visit updated successfully!
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update Visit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
