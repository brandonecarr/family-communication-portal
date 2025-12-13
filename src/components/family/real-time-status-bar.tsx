"use client";

import { Clock, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RealTimeStatusBar() {
  const activeUpdates = [
    {
      id: 1,
      message: "Nurse Sarah is en route to your home",
      time: "Expected in 15 minutes",
      type: "en_route",
    },
  ];

  if (activeUpdates.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeUpdates.map((update) => (
        <Alert
          key={update.id}
          className="border-primary/50 bg-primary/5 soft-shadow animate-in slide-in-from-top-2 duration-300"
        >
          <Clock className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium">{update.message}</span>
              <span className="text-sm text-muted-foreground ml-2">
                • {update.time}
              </span>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
