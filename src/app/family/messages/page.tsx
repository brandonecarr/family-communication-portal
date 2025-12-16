import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../../../supabase/server";
import FamilyMessagesClient from "./messages-client";
import { getMessageThreads, getThreadWithMessages } from "@/lib/actions/internal-messages";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get family member's patient ID
  const { data: familyMember } = await supabase
    .from("family_members")
    .select("patient_id")
    .eq("user_id", user.id)
    .single();

  const patientId = familyMember?.patient_id;

  // Pre-fetch threads on the server for faster initial load
  const initialThreads = await getMessageThreads("family", false);
  
  // Pre-fetch messages for the first thread so they're ready instantly
  let initialThreadMessages: Record<string, any> = {};
  if (initialThreads.length > 0) {
    try {
      const firstThreadData = await getThreadWithMessages(initialThreads[0].id);
      initialThreadMessages[initialThreads[0].id] = firstThreadData.messages || [];
    } catch (e) {
      // Ignore errors, messages will be loaded on demand
    }
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-180px)]">Loading...</div>}>
      <FamilyMessagesClient 
        currentUserId={user.id}
        patientId={patientId}
        initialThreads={initialThreads}
        initialThreadMessages={initialThreadMessages}
      />
    </Suspense>
  );
}
