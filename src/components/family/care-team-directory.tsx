"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, MessageSquare, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getFamilyPatientCareTeam, type CareTeamMemberForFamily } from "@/lib/actions/patient-care-team";
import Link from "next/link";

export default function CareTeamDirectory() {
  const [careTeam, setCareTeam] = useState<CareTeamMemberForFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCareTeam() {
      try {
        setLoading(true);
        const data = await getFamilyPatientCareTeam();
        setCareTeam(data);
      } catch (err) {
        console.error("Error loading care team:", err);
        setError("Unable to load care team information");
      } finally {
        setLoading(false);
      }
    }

    loadCareTeam();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="soft-shadow-lg border-0 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="soft-shadow-lg border-0">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (careTeam.length === 0) {
    return (
      <Card className="soft-shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Care Team Assigned Yet</h3>
          <p className="text-muted-foreground">
            Your care team members will appear here once they have been assigned to your loved one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {careTeam.map((member) => (
        <Card
          key={member.id}
          className="soft-shadow-lg border-0 overflow-hidden group hover:soft-shadow-lg hover:scale-[1.02] transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {member.initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>

                <p className="text-sm bg-muted/30 rounded-lg p-3">
                  {member.description}
                </p>

                <div className="space-y-2 text-sm">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  {!member.phone && !member.email && (
                    <p className="text-muted-foreground text-xs italic">
                      Contact information not available
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href="/family/messages/new" className="flex-1">
                    <Button size="sm" className="w-full gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </Link>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-2">
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
