"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserProfile from "@/components/user-profile";
import NotificationCenter from "@/components/notification-center";

export default function AdminHeader() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-8">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients, messages, visits..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
