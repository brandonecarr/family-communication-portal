"use client";

import { useState, useEffect } from "react";
import { Search, MoreVertical, Users, Calendar, Plus, Phone, Mail, MapPin, X, Eye, UserPlus, CalendarPlus, Edit, Archive } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { createPatient } from "@/lib/actions/patients";
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
  date_of_death?: string;
  discharge_date?: string;
  previous_status?: string;
  created_at: string;
}

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: null as Date | null,
    phone: "",
    email: "",
    address: "",
    status: "active",
    admission_date: new Date() as Date | null,
    date_of_death: null as Date | null,
    discharge_date: null as Date | null,
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
  }, [showArchived, currentPage]);

  const fetchPatients = async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!showArchived) {
      query = query.neq("status", "archived");
    } else {
      query = query.eq("status", "archived");
    }

    const { data, count } = await query;

    if (data) {
      setPatients(data);
    }
    if (count !== null) {
      setTotalCount(count);
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
      
      // Use server action to ensure agency_id is set
      const data = await createPatient({
        first_name: newPatient.first_name,
        last_name: newPatient.last_name,
        date_of_birth: newPatient.date_of_birth ? newPatient.date_of_birth.toISOString().split("T")[0] : undefined,
        phone: newPatient.phone || undefined,
        email: newPatient.email || undefined,
        address: newPatient.address || undefined,
        status: newPatient.status,
        admission_date: newPatient.admission_date ? newPatient.admission_date.toISOString().split("T")[0] : undefined,
      });

      console.log("Insert result:", { data });

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
        date_of_death: null,
        discharge_date: null,
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

  const handleEditPatient = async () => {
    if (!selectedPatient) return;

    if (!newPatient.first_name || !newPatient.last_name) {
      toast({
        title: "Required fields missing",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          date_of_birth: newPatient.date_of_birth ? newPatient.date_of_birth.toISOString().split("T")[0] : null,
          phone: newPatient.phone || null,
          email: newPatient.email || null,
          address: newPatient.address || null,
          status: newPatient.status,
          admission_date: newPatient.admission_date ? newPatient.admission_date.toISOString().split("T")[0] : null,
          date_of_death: newPatient.status === "deceased" && newPatient.date_of_death ? newPatient.date_of_death.toISOString().split("T")[0] : null,
          discharge_date: newPatient.status === "discharged" && newPatient.discharge_date ? newPatient.discharge_date.toISOString().split("T")[0] : null,
        })
        .eq("id", selectedPatient.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedPatient(null);
      setNewPatient({
        first_name: "",
        last_name: "",
        date_of_birth: null,
        phone: "",
        email: "",
        address: "",
        status: "active",
        admission_date: new Date(),
        date_of_death: null,
        discharge_date: null,
      });
      fetchPatients();
    } catch (error: any) {
      console.error("Error updating patient:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update patient",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchivePatient = async () => {
    if (!selectedPatient) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({ status: "archived" })
        .eq("id", selectedPatient.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Patient archived successfully",
      });

      setIsArchiveDialogOpen(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error: any) {
      console.error("Error archiving patient:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive patient",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openArchiveDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsArchiveDialogOpen(true);
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setNewPatient({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth ? new Date(patient.date_of_birth) : null,
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      status: patient.status,
      admission_date: patient.admission_date ? new Date(patient.admission_date) : new Date(),
      date_of_death: patient.date_of_death ? new Date(patient.date_of_death) : null,
      discharge_date: patient.discharge_date ? new Date(patient.discharge_date) : null,
    });
    setIsEditDialogOpen(true);
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
        <Button 
          variant="outline"
          className="rounded-full gap-2"
          onClick={() => {
            setShowArchived(!showArchived);
            setSearchQuery("");
          }}
        >
          <Archive className="h-4 w-4" />
          {showArchived ? "View Active Patients" : "View Archived Patients"}
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
            <Link key={patient.id} href={`/admin/patients/${patient.id}`} className="block">
              <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer">
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
                          className={statusColors[(showArchived && patient.previous_status ? patient.previous_status : patient.status) as keyof typeof statusColors]}
                        >
                          {showArchived && patient.previous_status ? patient.previous_status : patient.status}
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

                      {/* Deceased Date Display */}
                      {patient.date_of_death && (
                        <div className="bg-red-100 border border-red-500 rounded px-2 py-1 w-fit mt-3">
                          <p className="text-red-600 font-bold text-sm uppercase">
                            DECEASED: {new Date(patient.date_of_death).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {/* Discharged Date Display */}
                      {patient.discharge_date && (
                        <div className="bg-red-100 border border-red-500 rounded px-2 py-1 w-fit mt-3">
                          <p className="text-red-600 font-bold text-sm uppercase">
                            DISCHARGED: {new Date(patient.discharge_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/patients/${patient.id}`} className="flex items-center cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/family-access?patient=${patient.id}`} className="flex items-center cursor-pointer">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Manage Family Access
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/visits?patient=${patient.id}&action=schedule`} className="flex items-center cursor-pointer">
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Schedule Visit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(patient)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Patient
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openArchiveDialog(patient)} 
                              className="cursor-pointer text-orange-600 focus:text-orange-600"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!searchQuery && totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} patients
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Patient</DialogTitle>
            <DialogDescription>
              Update the patient's information below. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  placeholder="Enter first name"
                  value={newPatient.first_name}
                  onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  placeholder="Enter last name"
                  value={newPatient.last_name}
                  onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_dob">Date of Birth</Label>
                <DatePicker
                  id="edit_dob"
                  selected={newPatient.date_of_birth}
                  onChange={(date) => setNewPatient({ ...newPatient, date_of_birth: date })}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_admission_date">Admission Date</Label>
                <DatePicker
                  id="edit_admission_date"
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

            <div className="grid gap-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={newPatient.status}
                onValueChange={(value) => setNewPatient({ ...newPatient, status: value })}
              >
                <SelectTrigger id="edit_status">
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

            {newPatient.status === "deceased" && (
              <div className="grid gap-2">
                <Label htmlFor="edit_date_of_death">Date of Death</Label>
                <DatePicker
                  id="edit_date_of_death"
                  selected={newPatient.date_of_death}
                  onChange={(date) => setNewPatient({ ...newPatient, date_of_death: date })}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
            )}

            {newPatient.status === "discharged" && (
              <div className="grid gap-2">
                <Label htmlFor="edit_discharge_date">Discharge Date</Label>
                <DatePicker
                  id="edit_discharge_date"
                  selected={newPatient.discharge_date}
                  onChange={(date) => setNewPatient({ ...newPatient, discharge_date: date })}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="Select date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input
                id="edit_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: formatPhoneNumber(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                placeholder="patient@example.com"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_address">Address</Label>
              <Textarea
                id="edit_address"
                placeholder="Enter full address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedPatient(null);
                setNewPatient({
                  first_name: "",
                  last_name: "",
                  date_of_birth: null,
                  phone: "",
                  email: "",
                  address: "",
                  status: "active",
                  admission_date: new Date(),
                  date_of_death: null,
                  discharge_date: null,
                });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              onClick={handleEditPatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Patient Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Archive Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this patient? You can view archived patients later.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="bg-[#FAF8F5] rounded-lg p-4 my-4">
              <p className="text-sm text-[#666666] mb-1">Patient Name</p>
              <p className="font-semibold text-[#2D2D2D]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsArchiveDialogOpen(false);
                setSelectedPatient(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleArchivePatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Archiving..." : "Archive Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
