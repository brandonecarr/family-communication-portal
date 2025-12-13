"use client";

import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const upcomingVisits = [
  {
    id: 1,
    discipline: "RN",
    date: "Today",
    time: "2:00 PM",
  },
  {
    id: 2,
    discipline: "HHA",
    date: "Tomorrow",
    time: "10:00 AM",
  },
  {
    id: 3,
    discipline: "PT",
    date: "Friday",
    time: "3:00 PM",
  },
];

export default function UpcomingVisits() {
  return (
    <Card className="soft-shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingVisits.map((visit) => (
          <div
            key={visit.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {visit.discipline}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{visit.date}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {visit.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
