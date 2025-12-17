"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Calendar, Package, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserProfile from "@/components/user-profile";
import NotificationCenter from "@/components/notification-center";
import { getTotalUnreadMessageCount } from "@/lib/actions/internal-messages";
import { getFamilyUpcomingVisitsCount } from "@/lib/actions/visits";
import { getFamilyPendingDeliveriesCount } from "@/lib/actions/deliveries";

export default function FamilyNavbar() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingVisits, setUpcomingVisits] = useState(0);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [messages, visits, deliveries] = await Promise.all([
          getTotalUnreadMessageCount(),
          getFamilyUpcomingVisitsCount(),
          getFamilyPendingDeliveriesCount(),
        ]);
        setUnreadMessages(messages);
        setUpcomingVisits(visits);
        setPendingDeliveries(deliveries);
      } catch (err) {
        console.error("Error loading navbar counts:", err);
      }
    }

    loadCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/family" className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold">Family Portal</h1>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link href="/family">
              <Button variant="ghost" size="sm" className="gap-2 relative">
                <Calendar className="h-4 w-4" />
                Visits
                {upcomingVisits > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-[#7A9B8E] text-white border-0">
                    {upcomingVisits}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/family/messages">
              <Button variant="ghost" size="sm" className="gap-2 relative">
                <MessageSquare className="h-4 w-4" />
                Messages
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/family/deliveries">
              <Button variant="ghost" size="sm" className="gap-2 relative">
                <Package className="h-4 w-4" />
                Deliveries
                {pendingDeliveries > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-[#B8A9D4] text-white border-0">
                    {pendingDeliveries}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/family/education">
              <Button variant="ghost" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Education
              </Button>
            </Link>
            <Link href="/family/care-team">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Care Team
              </Button>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <NotificationCenter />
            <UserProfile />
          </div>
        </div>
      </div>
    </nav>
  );
}
