"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

// Types
export interface MessageThread {
  id: string;
  agency_id: string;
  category: "internal" | "family";
  subject: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  last_message_at: string;
  participants?: ThreadParticipant[];
  messages?: ThreadMessage[];
  unread_count?: number;
}

export interface ThreadParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_admin: boolean;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachments: any[];
  created_at: string;
  edited_at: string | null;
  sender?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  read_receipts?: MessageReadReceipt[];
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// Helper to get current user's agency_id
async function getUserAgencyId(supabase: any): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  return agencyUser?.agency_id || null;
}

// Helper to check if user is staff (not family member)
async function isStaffUser(supabase: any, userId: string): Promise<boolean> {
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("role")
    .eq("user_id", userId)
    .single();

  return !!agencyUser && ["agency_admin", "agency_staff", "super_admin"].includes(agencyUser?.role);
}

// Get all threads for the current user
export async function getMessageThreads(
  category?: "internal" | "family",
  includeArchived: boolean = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const agencyId = await getUserAgencyId(supabase);
  const isStaff = await isStaffUser(supabase, user.id);

  // Only get threads where user is a participant
  const { data: participantThreads } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("user_id", user.id);

  const threadIds = participantThreads?.map((p: any) => p.thread_id) || [];

  if (threadIds.length === 0) {
    return [];
  }

  // Build query
  let query = supabase
    .from("message_threads")
    .select("*")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false });

  // Filter by agency
  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  // Filter by category
  if (category) {
    query = query.eq("category", category);
  }

  // Filter internal messages - only staff can see them
  if (!isStaff) {
    query = query.neq("category", "internal");
  }

  // Filter archived
  if (!includeArchived) {
    query = query.is("archived_at", null);
  } else {
    query = query.not("archived_at", "is", null);
  }

  const { data: threads, error } = await query;

  if (error) throw error;

  if (!threads || threads.length === 0) {
    return [];
  }

  // Get all participants for these threads
  const { data: allParticipants } = await supabase
    .from("thread_participants")
    .select("*")
    .in("thread_id", threads.map((t: any) => t.id));

  // Get user details for all participants
  const allParticipantUserIds = Array.from(new Set((allParticipants || []).map((p: any) => p.user_id)));
  let participantUsers: any[] = [];
  
  if (allParticipantUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, role")
      .in("id", allParticipantUserIds);
    
    if (users) {
      participantUsers = users;
    }
  }

  const usersMap = new Map(participantUsers.map((u: any) => [u.id, u]));

  // Group participants by thread
  const participantsByThread = new Map<string, any[]>();
  (allParticipants || []).forEach((p: any) => {
    const existing = participantsByThread.get(p.thread_id) || [];
    existing.push({
      ...p,
      user: usersMap.get(p.user_id) || null,
    });
    participantsByThread.set(p.thread_id, existing);
  });

  // Get unread counts for each thread
  const threadsWithUnread = await Promise.all(
    threads.map(async (thread: any) => {
      // Get all messages in thread
      const { data: threadMessages } = await supabase
        .from("thread_messages")
        .select("id")
        .eq("thread_id", thread.id);

      // Get read receipts for this user
      const { data: readReceipts } = await supabase
        .from("message_read_receipts")
        .select("message_id")
        .eq("user_id", user.id);

      const readMessageIds = new Set(readReceipts?.map((r: any) => r.message_id) || []);
      const unreadCount = (threadMessages || []).filter(
        (m: any) => !readMessageIds.has(m.id)
      ).length;

      return {
        ...thread,
        participants: participantsByThread.get(thread.id) || [],
        unread_count: unreadCount,
      };
    })
  );

  return threadsWithUnread;
}

// Get a single thread with messages
export async function getThreadWithMessages(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get thread
  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadError) throw threadError;

  // Get participants
  const { data: participants, error: participantsError } = await supabase
    .from("thread_participants")
    .select("*")
    .eq("thread_id", threadId);

  if (participantsError) throw participantsError;

  // Get user details for participants
  const participantUserIds = (participants || []).map((p: any) => p.user_id);
  let participantUsers: any[] = [];
  
  if (participantUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url, role")
      .in("id", participantUserIds);
    
    if (users) {
      participantUsers = users;
    }
  }

  const usersMap = new Map(participantUsers.map((u: any) => [u.id, u]));
  const participantsWithUsers = (participants || []).map((p: any) => ({
    ...p,
    user: usersMap.get(p.user_id) || null,
  }));

  // Get messages
  const { data: messages, error: messagesError } = await supabase
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  // Get sender details for messages
  const senderIds = Array.from(new Set((messages || []).map((m: any) => m.sender_id)));
  let senderUsers: any[] = [];
  
  if (senderIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", senderIds);
    
    if (users) {
      senderUsers = users;
    }
  }

  const sendersMap = new Map(senderUsers.map((u: any) => [u.id, u]));
  const messagesWithSenders = (messages || []).map((m: any) => ({
    ...m,
    sender: sendersMap.get(m.sender_id) || null,
    read_receipts: [],
  }));

  return {
    ...thread,
    participants: participantsWithUsers,
    messages: messagesWithSenders,
  };
}

// Create a new thread
export async function createMessageThread(data: {
  category: "internal" | "family";
  subject?: string;
  participantIds: string[];
  initialMessage?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const agencyId = await getUserAgencyId(supabase);
  if (!agencyId) throw new Error("User not associated with an agency");

  // For internal messages, verify all participants are staff
  if (data.category === "internal") {
    for (const participantId of data.participantIds) {
      const isStaff = await isStaffUser(supabase, participantId);
      if (!isStaff) {
        throw new Error("Internal messages can only be sent to staff members");
      }
    }
  }

  const isGroup = data.participantIds.length > 1;

  // Create thread
  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .insert({
      agency_id: agencyId,
      category: data.category,
      subject: data.subject || null,
      is_group: isGroup,
      created_by: user.id,
    })
    .select()
    .single();

  if (threadError) throw threadError;

  // Add creator as participant and admin
  const { error: creatorError } = await supabase
    .from("thread_participants")
    .insert({
      thread_id: thread.id,
      user_id: user.id,
      is_admin: true,
    });

  if (creatorError) throw creatorError;

  // Add other participants
  const participantInserts = data.participantIds
    .filter((id) => id !== user.id)
    .map((participantId) => ({
      thread_id: thread.id,
      user_id: participantId,
      is_admin: false,
    }));

  if (participantInserts.length > 0) {
    const { error: participantsError } = await supabase
      .from("thread_participants")
      .insert(participantInserts);

    if (participantsError) throw participantsError;
  }

  // Send initial message if provided
  if (data.initialMessage) {
    await sendThreadMessage(thread.id, data.initialMessage);
  }

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");

  return thread;
}

// Send a message to a thread
export async function sendThreadMessage(
  threadId: string,
  body: string,
  attachments: any[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify user is a participant
  const { data: participant } = await supabase
    .from("thread_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single();

  if (!participant) throw new Error("Not a participant of this thread");

  // Insert message
  const { data: message, error } = await supabase
    .from("thread_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      body,
      attachments,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Mark as read by sender
  await markMessageAsRead(message.id);

  // Get all other participants to notify them
  const { data: participants } = await supabase
    .from("thread_participants")
    .select("user_id")
    .eq("thread_id", threadId)
    .neq("user_id", user.id);

  // Send HIPAA-compliant notifications (no message content)
  if (participants && participants.length > 0) {
    const recipientIds = participants.map((p: any) => p.user_id);
    // Import dynamically to avoid circular dependencies
    try {
      const { sendMessageNotifications } = await import("./notifications");
      await sendMessageNotifications(recipientIds);
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
    }
  }

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");

  return message;
}

// Mark a message as read
export async function markMessageAsRead(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("message_read_receipts").upsert(
    {
      message_id: messageId,
      user_id: user.id,
      read_at: new Date().toISOString(),
    },
    {
      onConflict: "message_id,user_id",
    }
  );

  if (error && !error.message.includes("duplicate")) throw error;
}

// Mark all messages in a thread as read
export async function markThreadAsRead(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get all unread messages in thread
  const { data: messages } = await supabase
    .from("thread_messages")
    .select("id")
    .eq("thread_id", threadId);

  if (messages && messages.length > 0) {
    const receipts = messages.map((m: any) => ({
      message_id: m.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));

    await supabase.from("message_read_receipts").upsert(receipts, {
      onConflict: "message_id,user_id",
    });
  }

  // Update last_read_at for participant
  await supabase
    .from("thread_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
}

// Get users available for messaging
export async function getAvailableRecipients(category: "internal" | "family") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const agencyId = await getUserAgencyId(supabase);
  if (!agencyId) return [];

  try {
    if (category === "internal") {
      // Get all staff members in the agency
      const { data: staffUsers, error } = await supabase
        .from("agency_users")
        .select("user_id, role")
        .eq("agency_id", agencyId)
        .in("role", ["agency_admin", "agency_staff"])
        .neq("user_id", user.id);

      if (error) {
        console.error("Error fetching staff users:", error);
        return [];
      }

      // Get user details separately
      const userIds = (staffUsers || []).map((su: any) => su.user_id);
      if (userIds.length === 0) return [];

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, name, email, avatar_url")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching user details:", usersError);
        return [];
      }

      const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

      return (staffUsers || []).map((su: any) => {
        const userData: any = usersMap.get(su.user_id) || {};
        return {
          id: su.user_id,
          full_name: userData.full_name || userData.name || null,
          email: userData.email || null,
          avatar_url: userData.avatar_url || null,
          role: su.role,
        };
      });
    } else {
      // Get all staff users in the agency
      const { data: agencyUsers, error: agencyError } = await supabase
        .from("agency_users")
        .select("user_id, role")
        .eq("agency_id", agencyId)
        .neq("user_id", user.id);

      if (agencyError) {
        console.error("Error fetching agency users:", agencyError);
        return [];
      }

      // Get user details for staff
      const staffUserIds = (agencyUsers || []).map((au: any) => au.user_id);
      let staffUsersData: any[] = [];
      
      if (staffUserIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, name, email, avatar_url")
          .in("id", staffUserIds);

        if (!usersError && users) {
          staffUsersData = users;
        }
      }

      const staffUsersMap = new Map(staffUsersData.map((u: any) => [u.id, u]));

      const staffUsers = (agencyUsers || []).map((au: any) => {
        const userData = staffUsersMap.get(au.user_id) || {};
        return {
          id: au.user_id,
          full_name: userData.full_name || userData.name || null,
          email: userData.email || null,
          avatar_url: userData.avatar_url || null,
          role: au.role,
        };
      });

      // Get family members
      const { data: familyMembers, error: familyError } = await supabase
        .from("family_members")
        .select("user_id, name, email, patient_id")
        .not("user_id", "is", null)
        .neq("user_id", user.id);

      if (familyError) {
        console.error("Error fetching family members:", familyError);
        return staffUsers;
      }

      // Get patients to filter by agency
      const patientIds = (familyMembers || []).map((fm: any) => fm.patient_id).filter(Boolean);
      let patientsData: any[] = [];
      
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from("patients")
          .select("id, agency_id")
          .in("id", patientIds);
        
        if (patients) {
          patientsData = patients;
        }
      }

      const patientsMap = new Map(patientsData.map((p: any) => [p.id, p]));

      // Filter family members by agency
      const agencyFamilyMembers = (familyMembers || [])
        .filter((fm: any) => {
          const patient = patientsMap.get(fm.patient_id);
          return patient?.agency_id === agencyId;
        })
        .map((fm: any) => ({
          id: fm.user_id,
          full_name: fm.name,
          email: fm.email,
          avatar_url: null,
          role: "family_member",
        }));

      return [...staffUsers, ...agencyFamilyMembers];
    }
  } catch (error) {
    console.error("Error in getAvailableRecipients:", error);
    return [];
  }
}

// Add participant to existing thread
export async function addThreadParticipant(threadId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify current user is admin of thread
  const { data: currentParticipant } = await supabase
    .from("thread_participants")
    .select("is_admin")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single();

  if (!currentParticipant?.is_admin) {
    throw new Error("Only thread admins can add participants");
  }

  // Get thread to check category
  const { data: thread } = await supabase
    .from("message_threads")
    .select("category")
    .eq("id", threadId)
    .single();

  // For internal threads, verify new participant is staff
  if (thread?.category === "internal") {
    const isStaff = await isStaffUser(supabase, userId);
    if (!isStaff) {
      throw new Error("Internal messages can only include staff members");
    }
  }

  const { error } = await supabase.from("thread_participants").insert({
    thread_id: threadId,
    user_id: userId,
    is_admin: false,
  });

  if (error) throw error;

  // Update thread to be a group if it wasn't already
  await supabase
    .from("message_threads")
    .update({ is_group: true })
    .eq("id", threadId);

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
}

// Get archived threads
export async function getArchivedThreads(category?: "internal" | "family") {
  return getMessageThreads(category, true);
}

// Manually archive a thread (admin only)
export async function archiveThread(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify user is admin
  const { data: participant } = await supabase
    .from("thread_participants")
    .select("is_admin")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single();

  if (!participant?.is_admin) {
    throw new Error("Only thread admins can archive threads");
  }

  const { error } = await supabase
    .from("message_threads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) throw error;

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
}

// Unarchive a thread
export async function unarchiveThread(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("message_threads")
    .update({ archived_at: null })
    .eq("id", threadId);

  if (error) throw error;

  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
}
