"use client";

import { Phone, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const careTeam = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Registered Nurse",
    discipline: "RN",
    phone: "(555) 123-4567",
    email: "sarah.j@hospice.com",
    description: "Provides skilled nursing care, medication management, and symptom assessment",
    initials: "SJ",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Home Health Aide",
    discipline: "HHA",
    phone: "(555) 234-5678",
    email: "michael.c@hospice.com",
    description: "Assists with personal care, bathing, and daily living activities",
    initials: "MC",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Physical Therapist",
    discipline: "PT",
    phone: "(555) 345-6789",
    email: "emily.r@hospice.com",
    description: "Helps maintain mobility and provides therapeutic exercises",
    initials: "ER",
  },
  {
    id: 4,
    name: "Dr. James Wilson",
    role: "Medical Director",
    discipline: "MD",
    phone: "(555) 456-7890",
    email: "james.w@hospice.com",
    description: "Oversees medical care and coordinates treatment plans",
    initials: "JW",
  },
];

export default function CareTeamDirectory() {
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
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
