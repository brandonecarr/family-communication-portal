import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../../../supabase/server";
import FamilyMessagesClient from "./messages-client";

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

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-180px)]">Loading...</div>}>
      <FamilyMessagesClient 
        currentUserId={user.id}
        patientId={patientId}
      />
    </Suspense>
  );
}
