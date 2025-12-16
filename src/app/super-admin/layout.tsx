import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import Link from "next/link";
import { 
  Building2, 
  LayoutDashboard, 
  Settings, 
  Users,
  LogOut,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Check if user is super admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "super_admin") {
    return redirect("/dashboard");
  }

  const navItems = [
    { href: "/super-admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/super-admin/facilities", icon: Building2, label: "Facilities" },
    { href: "/super-admin/users", icon: Users, label: "All Users" },
    { href: "/super-admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E8E4DF] flex flex-col">
        <div className="p-6 border-b border-[#E8E4DF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7A9B8E] to-[#5A7B6E] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-[#2D2D2D]" style={{ fontFamily: 'Fraunces, serif' }}>
                Super Admin
              </h1>
              <p className="text-xs text-muted-foreground">Platform Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#2D2D2D] hover:bg-[#FAF8F5] transition-all duration-200 group"
            >
              <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-[#7A9B8E] transition-colors" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E8E4DF]">
          <div className="px-4 py-2 mb-3">
            <p className="text-sm font-medium text-[#2D2D2D] truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">Super Administrator</p>
          </div>
          <form action={signOutAction}>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-[#D4876F] hover:bg-[#D4876F]/10"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
