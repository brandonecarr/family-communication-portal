import { redirect } from "next/navigation";
import { createClient } from "../../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default async function VisitDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Fetch visit details
  const { data: visit } = await supabase
    .from("visits")
    .select(`
      *,
      staff:staff_id (
        name,
        phone,
        email,
        discipline
      )
    `)
    .eq("id", params.id)
    .single();

  if (!visit) {
    return redirect("/family");
  }

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    en_route: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    scheduled: Clock,
    en_route: MapPin,
    in_progress: AlertCircle,
    completed: CheckCircle2,
    cancelled: AlertCircle,
  };

  const StatusIcon = statusIcons[visit.status as keyof typeof statusIcons] || Clock;

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Link href="/family">
          <Button variant="ghost" className="mb-6 -ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Visit Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                Visit Details
              </h1>
              <p className="text-muted-foreground text-lg">
                {visit.staff?.discipline || "Care"} Visit
              </p>
            </div>
            <Badge className={statusColors[visit.status as keyof typeof statusColors]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {visit.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Visit Information */}
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Visit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-[#7A9B8E]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(visit.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#B8A9D4]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-[#B8A9D4]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Window</p>
                    <p className="font-medium">
                      {visit.time_window_start} - {visit.time_window_end}
                    </p>
                  </div>
                </div>
              </div>

              {visit.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#D4876F]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-[#D4876F]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Visit Notes</p>
                      <p className="text-sm">{visit.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Staff Information */}
          {visit.staff && (
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                  Care Team Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-[#7A9B8E]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{visit.staff.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{visit.staff.discipline}</p>
                    
                    <div className="space-y-2">
                      {visit.staff.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${visit.staff.phone}`} className="hover:underline">
                            {visit.staff.phone}
                          </a>
                        </div>
                      )}
                      {visit.staff.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${visit.staff.email}`} className="hover:underline">
                            {visit.staff.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {visit.status === 'completed' && (
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-[#7A9B8E]/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">How was this visit?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your feedback helps us improve care quality
                    </p>
                  </div>
                  <Link href="/family/feedback">
                    <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full">
                      Leave Feedback
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
