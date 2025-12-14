import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "../../../../supabase/server";
import AdminMessagesClient from "./messages-client";
import { Database } from "@/types/supabase";

type FamilyMember = Database["public"]["Tables"]["family_members"]["Row"] & {
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    agency_id: string | null;
  } | null;
};

type Message = Database["public"]["Tables"]["messages"]["Row"];

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }> | { patient?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Handle both sync and async searchParams (Next.js 14/15 compatibility)
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Get user's agency_id
  const { data: userData } = await supabase
    .from("users")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const agencyId = userData?.agency_id;

  // Fetch all family members with their patient info for the conversation list
  const { data: familyMembers, error: familyError } = await supabase
    .from("family_members")
    .select(`
      id,
      name,
      email,
      phone,
      relationship,
      status,
      patient_id,
      user_id,
      patient:patients!patient_id (
        id,
        first_name,
        last_name,
        agency_id
      )
    `)
    .order("created_at", { ascending: false });

  if (familyError) {
    console.error("Error fetching family members:", familyError);
  }

  // Filter out family members without valid patient data and filter by agency
  // Also normalize the patient field from array to single object
  const validFamilyMembers = familyMembers?.filter((fm: FamilyMember) => {
    if (!fm.patient) return false;
    const patient = Array.isArray(fm.patient) ? fm.patient[0] : fm.patient;
    if (agencyId && patient?.agency_id !== agencyId) return false;
    return true;
  }).map((fm: FamilyMember) => ({
    ...fm,
    patient: Array.isArray(fm.patient) ? fm.patient[0] : fm.patient
  })) || [];

  // Fetch all messages to get unread counts and last message per family member
  let messagesQuery = supabase
    .from("messages")
    .select(`
      id,
      patient_id,
      sender_id,
      sender_type,
      body,
      read,
      created_at,
      status
    `)
    .order("created_at", { ascending: false });

  const { data: allMessages, error: messagesError } = await messagesQuery;

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
  }

  // Group messages by patient_id to get conversation metadata
  const conversationMetadata: Record<string, { lastMessage: any; unreadCount: number }> = {};
  
  allMessages?.forEach((msg: Message) => {
    if (!conversationMetadata[msg.patient_id!]) {
      conversationMetadata[msg.patient_id!] = {
        lastMessage: msg,
        unreadCount: 0
      };
    }
    // Count unread messages from family members
    if (!msg.read && msg.sender_type === "family") {
      conversationMetadata[msg.patient_id!].unreadCount++;
    }
  });

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-180px)]">Loading...</div>}>
      <AdminMessagesClient 
        familyMembers={validFamilyMembers}
        conversationMetadata={conversationMetadata}
        currentUserId={user.id}
        initialPatientId={resolvedSearchParams.patient}
      />
    </Suspense>
  );
}
