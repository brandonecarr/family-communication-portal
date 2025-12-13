"use client";

import { useState } from "react";
import { Menu, X, Home, MessageSquare, Package, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/family", icon: Home },
    { name: "Messages", href: "/family/messages", icon: MessageSquare },
    { name: "Deliveries", href: "/family/deliveries", icon: Package },
    { name: "Education", href: "/family/education", icon: BookOpen },
    { name: "Profile", href: "/family/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1
            className="text-xl font-light"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Family Portal
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-white">
            <nav className="flex flex-col">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 border-b text-sm ${
                      isActive
                        ? "bg-[#7A9B8E]/10 text-[#7A9B8E] font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

      {/* Mobile Bottom Navigation */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 px-4 text-xs flex-1 ${
                  isActive
                    ? "text-[#7A9B8E] border-t-2 border-[#7A9B8E]"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
