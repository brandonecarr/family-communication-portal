import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import MessageThread from "@/components/family/message-thread";
import MessageList from "@/components/family/message-list";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-1">
        <MessageList />
      </div>
      <div className="lg:col-span-2">
        <MessageThread patientId={patientId} currentUserId={user.id} />
      </div>
    </div>
  );
}
