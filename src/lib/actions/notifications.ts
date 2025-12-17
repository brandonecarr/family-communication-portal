"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";
import { sendStyledEmail, emailTemplates } from "@/lib/email";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { agencyId: null, isSuperAdmin: false };
  
  // Check if user is super_admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  
  const isSuperAdmin = userData?.role === 'super_admin';
  
  // Get agency_id from agency_users
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();
  
  return { 
    agencyId: agencyUser?.agency_id || null, 
    isSuperAdmin 
  };
}

export async function getNotificationPreferences() {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty notification preferences");
    return [];
  }
  
  let query = supabase
    .from("notification_preferences")
    .select("*")
    .order("notification_type", { ascending: true });
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function updateNotificationPreference(
  notificationType: string,
  preferences: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    push_enabled?: boolean;
  }
) {
  const supabase = await createClient();
  
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("notification_type", notificationType)
    .single();
  
  if (existing) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .update({ ...preferences, updated_at: new Date().toISOString() })
      .eq("notification_type", notificationType)
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath("/admin/notifications");
    
    return data;
  } else {
    const { data, error } = await supabase
      .from("notification_preferences")
      .insert({
        notification_type: notificationType,
        ...preferences,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath("/admin/notifications");
    
    return data;
  }
}

export async function sendNotification(notificationData: {
  type: string;
  recipient: string;
  subject?: string;
  message: string;
  channels?: string[];
}) {
  const preferences = await getNotificationPreferences();
  const typePreference = preferences?.find(
    (p: any) => p.notification_type === notificationData.type
  );
  
  const channels = notificationData.channels || [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  
  if (typePreference?.email_enabled && channels.includes("email")) {
    await sendStyledEmail({
      to: notificationData.recipient,
      subject: notificationData.subject || "Notification",
      template: emailTemplates.notification({
        message: notificationData.message,
        ctaText: "View in Portal",
        ctaUrl: baseUrl,
      }),
    });
  }
  
  if (typePreference?.sms_enabled && channels.includes("sms")) {
    console.log("Sending SMS notification:", notificationData);
  }
  
  if (typePreference?.push_enabled && channels.includes("push")) {
    console.log("Sending push notification:", notificationData);
  }
  
  return { success: true };
}

/**
 * Send a HIPAA-compliant message notification
 * IMPORTANT: This notification should NEVER include any message content
 * to comply with HIPAA regulations. Only notify that a message was received.
 */
export async function sendMessageNotification(recipientUserId: string) {
  const supabase = await createClient();
  
  // Get recipient's notification preferences
  const { data: userPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", recipientUserId)
    .eq("notification_type", "new_message")
    .single();
  
  // Get recipient's contact info
  const { data: user } = await supabase
    .from("users")
    .select("email, phone")
    .eq("id", recipientUserId)
    .single();
  
  if (!user) return { success: false, error: "User not found" };
  
  // HIPAA-compliant notification message - NO message content
  const notificationMessage = "You have received a new message. Please log in to view it.";
  const notificationSubject = "New Message Received";
  
  // Send notifications based on user preferences
  if (userPrefs?.email_enabled && user.email) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    await sendStyledEmail({
      to: user.email,
      subject: notificationSubject,
      template: emailTemplates.messageNotification({
        senderName: "Your Care Team",
        messagePreview: notificationMessage,
        portalUrl: `${baseUrl}/family/messages`,
      }),
    });
  }
  
  if (userPrefs?.sms_enabled && user.phone) {
    // In production, integrate with SMS service (Twilio, etc.)
    console.log(`[SMS] To: ${user.phone} - ${notificationMessage}`);
    // await sendSMS({ to: user.phone, message: notificationMessage });
  }
  
  if (userPrefs?.push_enabled) {
    // In production, integrate with push notification service (Firebase, etc.)
    console.log(`[PUSH] To user ${recipientUserId} - ${notificationSubject}`);
    // await sendPushNotification({ userId: recipientUserId, title: notificationSubject, body: notificationMessage });
  }
  
  // Create in-app notification record
  await supabase.from("notifications").insert({
    user_id: recipientUserId,
    type: "new_message",
    title: notificationSubject,
    message: notificationMessage,
    read: false,
  });
  
  return { success: true };
}

/**
 * Send message notifications to multiple recipients
 */
export async function sendMessageNotifications(recipientUserIds: string[]) {
  const results = await Promise.all(
    recipientUserIds.map((userId) => sendMessageNotification(userId))
  );
  
  return {
    success: results.every((r) => r.success),
    results,
  };
}
