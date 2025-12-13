"use client";

import { useState, useEffect } from "react";
import { Search, MoreVertical, Users, Calendar, Plus, Phone, Mail, MapPin, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "../../../supabase/client";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  admission_date?: string;
  created_at: string;
}

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: null as Date | null,
    phone: "",
    email: "",
    address: "",
    status: "active",
    admission_date: new Date() as Date | null,
  });
  const supabase = createClient();
  const { toast } = useToast();

  // Format phone number as (xxx) xxx-xxxx
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setNewPatient({ ...newPatient, phone: formatted });
  };

  useEffect(() => {
    fetchPatients();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("patients-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patients",
        },
        () => {
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setPatients(data);
    }
    setLoading(false);
  };

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const handleAddPatient = async () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Attempting to add patient:", newPatient);
      const { data, error } = await supabase
        .from("patients")
        .insert([{
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          date_of_birth: newPatient.date_of_birth ? newPatient.date_of_birth.toISOString().split("T")[0] : null,
          phone: newPatient.phone || null,
          email: newPatient.email || null,
          address: newPatient.address || null,
          status: newPatient.status,
          admission_date: newPatient.admission_date ? newPatient.admission_date.toISOString().split("T")[0] : null,
        }])
        .select()
        .single();

      console.log("Insert result:", { data, error });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient added successfully",
      });

      setIsAddDialogOpen(false);
      setNewPatient({
        first_name: "",
        last_name: "",
        date_of_birth: null,
        phone: "",
        email: "",
        address: "",
        status: "active",
        admission_date: new Date(),
      });
      fetchPatients();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add patient",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors = {
    active: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    inactive: "bg-muted text-muted-foreground",
    discharged: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    deceased: "bg-gray-200 text-gray-800",
  };

  if (loading) {
    return <div className="text-center py-8">Loading patients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredPatients.length === 0 ? (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patients found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery ? "Try adjusting your search" : "Get started by adding your first patient"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-[#7A9B8E]/10 text-[#7A9B8E] text-lg">
                        {`${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}` || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Unknown Patient"}</h3>
                          {patient.admission_date && (
                            <p className="text-sm text-muted-foreground">
                              Admitted {new Date(patient.admission_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={statusColors[patient.status as keyof typeof statusColors]}
                        >
                          {patient.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {patient.date_of_birth && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {patient.email}
                          </span>
                        )}
                        {patient.address && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{patient.address}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Link href={`/admin/patients/${patient.id}`}>
                          <Button variant="outline" size="sm" className="rounded-full">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/admin/family-access?patient=${patient.id}`}>
                          <Button variant="outline" size="sm" className="rounded-full">
                            Manage Family Access
                          </Button>
                        </Link>
                        <Link href={`/admin/visits?patient=${patient.id}&action=schedule`}>
                          <Button variant="outline" size="sm" className="rounded-full">
                            Schedule Visit
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="ml-auto">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Patient Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Patient</DialogTitle>
            <DialogDescription>
              Enter the patient's information below. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="Enter first name"
                  value={newPatient.first_name}
                  onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="Enter last name"
                  value={newPatient.last_name}
                  onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <DatePicker
                  id="dob"
                  selected={newPatient.date_of_birth}
                  onChange={(date) => setNewPatient({ ...newPatient, date_of_birth: date })}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  maxDate={new Date()}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admission">Admission Date</Label>
                <DatePicker
                  id="admission"
                  selected={newPatient.admission_date}
                  onChange={(date) => setNewPatient({ ...newPatient, admission_date: date })}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={newPatient.phone}
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="patient@example.com"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter patient's address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newPatient.status}
                onValueChange={(value) => setNewPatient({ ...newPatient, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              onClick={handleAddPatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
