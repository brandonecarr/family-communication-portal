import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import FamilyNavbar from "@/components/family/family-navbar";
import MobileLayout from "./mobile-layout";
import { NotificationProvider } from "@/components/notification-provider";

export const dynamic = "force-dynamic";

export default async function FamilyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <NotificationProvider>
      <div className="hidden md:block min-h-screen bg-background">
        <FamilyNavbar />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </div>
      <div className="md:hidden">
        <MobileLayout>{children}</MobileLayout>
      </div>
    </NotificationProvider>
  );
}
