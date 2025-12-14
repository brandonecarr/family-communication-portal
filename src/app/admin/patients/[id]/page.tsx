import { createServiceClient } from "../../../../../supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Users, Package, MessageSquare, UserPlus, Pencil } from "lucide-react";
import { EditPatientDialog } from "@/components/admin/edit-patient-dialog";
import { InviteFamilyMemberDialog } from "@/components/admin/invite-family-member-dialog";
import { FamilyMemberCard } from "@/components/admin/family-member-card";
import { CreateVisitDialog } from "@/components/admin/create-visit-dialog";
import { EditVisitDialog } from "@/components/admin/edit-visit-dialog";
import { DeleteVisitDialog } from "@/components/admin/delete-visit-dialog";

export default async function PatientDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServiceClient();

  if (!supabase) {
    notFound();
  }

  // Fetch patient details
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !patient) {
    notFound();
  }

  // Fetch related data
  const [visitsResult, familyResult, messagesResult, deliveriesResult] = await Promise.all([
    supabase
      .from("visits")
      .select("*")
      .eq("patient_id", params.id)
      .order("scheduled_date", { ascending: false })
      .limit(5),
    supabase
      .from("family_members")
      .select("*")
      .eq("patient_id", params.id),
    supabase
      .from("messages")
      .select("*")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("deliveries")
      .select("*")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const visits = visitsResult.data || [];
  const familyMembers = familyResult.data || [];
  const messages = messagesResult.data || [];
  const deliveries = deliveriesResult.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-sage-100 text-sage-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      case "deceased":
        return "bg-charcoal-100 text-charcoal-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/patients">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-light mb-2">{patient.first_name} {patient.last_name}</h1>
          <p className="text-muted-foreground">Patient ID: {patient.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(patient.status)}>
            {patient.status}
          </Badge>
          <EditPatientDialog patient={patient} />
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
              <p className="font-medium">
                {patient.date_of_birth
                  ? new Date(patient.date_of_birth).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Admission Date</p>
              <p className="font-medium">
                {patient.admission_date
                  ? new Date(patient.admission_date).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Primary Diagnosis</p>
              <p className="font-medium">{patient.primary_diagnosis || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Address</p>
              <p className="font-medium">{patient.address || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone</p>
              <p className="font-medium">{patient.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
              <p className="font-medium">{patient.emergency_contact || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="visits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">
            <Calendar className="h-4 w-4 mr-2" />
            Visits ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="family">
            <Users className="h-4 w-4 mr-2" />
            Family ({familyMembers.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Package className="h-4 w-4 mr-2" />
            Deliveries ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages ({messages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Visits</CardTitle>
              <CreateVisitDialog patientId={params.id} />
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">All upcoming visits will be listed here.</p>
              ) : (
                <div className="space-y-3">
                  {visits.map((visit) => (
                    <Card key={visit.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-base">{visit.discipline}</h3>
                              {visit.staff_name && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {visit.staff_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {new Date(visit.scheduled_date).toLocaleDateString()}
                              </span>
                              {visit.scheduled_time && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  {visit.scheduled_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-[#7A9B8E] hover:bg-[#7A9B8E]/90 text-white px-4 py-1.5 capitalize">
                              {visit.status.replace('_', ' ')}
                            </Badge>
                            <EditVisitDialog visit={{
                              id: visit.id,
                              staff_name: visit.staff_name || "",
                              discipline: visit.discipline,
                              scheduled_date: visit.scheduled_date,
                              scheduled_time: visit.scheduled_time,
                              notes: visit.notes,
                              status: visit.status
                            }} />
                            <DeleteVisitDialog visit={{
                              id: visit.id,
                              staff_name: visit.staff_name || "",
                              discipline: visit.discipline,
                              scheduled_date: visit.scheduled_date
                            }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Family Members</CardTitle>
              <InviteFamilyMemberDialog patientId={params.id} patientName={`${patient.first_name} ${patient.last_name}`} />
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Family members added will display here
                </p>
              ) : (
                <div className="space-y-4">
                  {familyMembers.map((member) => (
                    <FamilyMemberCard
                      key={member.id}
                      member={member}
                      patientId={params.id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No deliveries found
                </p>
              ) : (
                <div className="space-y-4">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{delivery.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.carrier} - {delivery.tracking_number}
                        </p>
                      </div>
                      <Badge>{delivery.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Messages</CardTitle>
              <Link href={`/admin/messages?patient=${params.id}`}>
                <Button variant="outline" size="sm" className="rounded-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Open Messages
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No messages found for this patient
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isStaff = message.sender_type === "staff";
                    return (
                      <div 
                        key={message.id} 
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isStaff
                              ? "bg-[#7A9B8E] text-white rounded-br-md"
                              : "bg-[#B8A9D4]/20 text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap line-clamp-3">
                            {message.body || message.content}
                          </p>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${
                            isStaff ? "text-white/70 justify-end" : "text-muted-foreground"
                          }`}>
                            <span>{message.sender_type === "staff" ? "Staff" : "Family"}</span>
                            <span>•</span>
                            <span>{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length >= 5 && (
                    <div className="text-center pt-4">
                      <Link href={`/admin/messages?patient=${params.id}`}>
                        <Button variant="link" className="text-[#7A9B8E]">
                          View all messages →
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
