"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

export async function getNotificationPreferences() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .order("notification_type", { ascending: true });
  
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
  
  if (typePreference?.email_enabled && channels.includes("email")) {
    console.log("Sending email notification:", notificationData);
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
    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log(`[EMAIL] To: ${user.email} - ${notificationSubject}`);
    // await sendEmail({ to: user.email, subject: notificationSubject, body: notificationMessage });
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
