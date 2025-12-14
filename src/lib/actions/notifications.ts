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
