"use client";

import Link from "next/link";
import { Bell, MessageSquare, Calendar, Package, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserProfile from "@/components/user-profile";
import NotificationCenter from "@/components/notification-center";

export default function FamilyNavbar() {
  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/family" className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold">Family Portal</h1>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link href="/family">
              <Button variant="ghost" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Visits
              </Button>
            </Link>
            <Link href="/family/messages">
              <Button variant="ghost" size="sm" className="gap-2 relative">
                <MessageSquare className="h-4 w-4" />
                Messages
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  3
                </Badge>
              </Button>
            </Link>
            <Link href="/family/deliveries">
              <Button variant="ghost" size="sm" className="gap-2">
                <Package className="h-4 w-4" />
                Deliveries
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
