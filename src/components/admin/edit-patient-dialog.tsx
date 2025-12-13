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
import { updatePatient } from "@/lib/actions/patients";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  status: string;
  admission_date?: string;
  date_of_death?: string;
  discharge_date?: string;
  primary_diagnosis?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergency_contact?: string;
  notes?: string;
}

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>(patient.status);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    patient.date_of_birth ? new Date(patient.date_of_birth) : null
  );
  const [admissionDate, setAdmissionDate] = useState<Date | null>(
    patient.admission_date ? new Date(patient.admission_date) : null
  );
  const [dateOfDeath, setDateOfDeath] = useState<Date | null>(
    patient.date_of_death ? new Date(patient.date_of_death) : null
  );
  const [dischargeDate, setDischargeDate] = useState<Date | null>(
    patient.discharge_date ? new Date(patient.discharge_date) : null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const patientData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : undefined,
      status: status,
      admission_date: admissionDate ? format(admissionDate, "yyyy-MM-dd") : undefined,
      date_of_death: status === "deceased" && dateOfDeath ? format(dateOfDeath, "yyyy-MM-dd") : undefined,
      discharge_date: status === "discharged" && dischargeDate ? format(dischargeDate, "yyyy-MM-dd") : undefined,
      primary_diagnosis: formData.get("primary_diagnosis") as string || undefined,
      address: formData.get("address") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      emergency_contact_name: formData.get("emergency_contact") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    };

    startTransition(async () => {
      try {
        await updatePatient(patient.id, patientData);
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } catch (err: any) {
        setError(err?.message || "Failed to update patient");
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
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update patient information and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
              Patient updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={patient.first_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={patient.last_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => {
                setStatus(value);
                // Clear date of death if status is not deceased
                if (value !== "deceased") {
                  setDateOfDeath(null);
                }
                // Clear discharge date if status is not discharged
                if (value !== "discharged") {
                  setDischargeDate(null);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "deceased" && (
              <div className="space-y-2">
                <Label htmlFor="date_of_death">Date of Death</Label>
                <DatePicker
                  selected={dateOfDeath}
                  onChange={(date) => setDateOfDeath(date)}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  dropdownMode="select"
                  maxDate={new Date()}
                />
              </div>
            )}

            {status === "discharged" && (
              <div className="space-y-2">
                <Label htmlFor="discharge_date">Discharge Date</Label>
                <DatePicker
                  selected={dischargeDate}
                  onChange={(date) => setDischargeDate(date)}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  dropdownMode="select"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <DatePicker
                selected={dateOfBirth}
                onChange={(date) => setDateOfBirth(date)}
                dateFormat="MM/dd/yyyy"
                placeholderText="Select date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                showYearDropdown
                dropdownMode="select"
                maxDate={new Date()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date</Label>
              <DatePicker
                selected={admissionDate}
                onChange={(date) => setAdmissionDate(date)}
                dateFormat="MM/dd/yyyy"
                placeholderText="Select date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                showYearDropdown
                dropdownMode="select"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_diagnosis">Primary Diagnosis</Label>
              <Input
                id="primary_diagnosis"
                name="primary_diagnosis"
                defaultValue={patient.primary_diagnosis || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={patient.phone || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={patient.email || ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={patient.address || ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="emergency_contact">Emergency Contact</Label>
              <Input
                id="emergency_contact"
                name="emergency_contact"
                defaultValue={patient.emergency_contact || ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={patient.notes || ""}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
