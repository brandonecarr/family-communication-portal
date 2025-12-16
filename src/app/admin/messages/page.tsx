import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../../../supabase/server";
import MessagesClientNew from "./messages-client-new";
import { getMessageThreads, getThreadWithMessages } from "@/lib/actions/internal-messages";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Also check agency_users for role
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const userRole = agencyUser?.role || userData?.role || "family_member";

  // Pre-fetch threads on the server for faster initial load
  const initialThreads = await getMessageThreads(undefined, false);
  
  // Pre-fetch messages for the first thread
  let initialThreadMessages: Record<string, any> = {};
  if (initialThreads.length > 0) {
    try {
      const firstThreadData = await getThreadWithMessages(initialThreads[0].id);
      initialThreadMessages[initialThreads[0].id] = firstThreadData.messages || [];
    } catch (e) {
      // Ignore errors
    }
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-180px)]">Loading...</div>}>
      <MessagesClientNew 
        currentUserId={user.id}
        userRole={userRole}
        initialThreads={initialThreads}
        initialThreadMessages={initialThreadMessages}
      />
    </Suspense>
  );
}
