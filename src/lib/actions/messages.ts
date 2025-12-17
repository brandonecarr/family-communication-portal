"use server";

import { createClient } from "../../../supabase/server";
import { revalidatePath } from "next/cache";

// Helper to get current user's agency_id and role
async function getUserAgencyAndRole(supabase: any): Promise<{ agencyId: string | null; isSuperAdmin: boolean }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Handle auth errors (invalid/expired refresh token)
    if (authError || !user) {
      console.warn("Auth error or no user:", authError?.message);
      return { agencyId: null, isSuperAdmin: false };
    }
    
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
  } catch (error: any) {
    // Handle refresh token errors gracefully
    console.warn("Error getting user agency and role:", error?.message);
    return { agencyId: null, isSuperAdmin: false };
  }
}

export async function getMessages(patientId?: string) {
  const supabase = await createClient();
  
  // Get user's agency_id and role for filtering
  const { agencyId, isSuperAdmin } = await getUserAgencyAndRole(supabase);
  
  // CRITICAL: If user has no agency AND is not super_admin, return empty array
  if (!agencyId && !isSuperAdmin) {
    console.warn("User has no agency_id and is not super_admin - returning empty messages list");
    return [];
  }
  
  let query = supabase
    .from("messages")
    .select(`
      *,
      patient:patient_id (
        id,
        first_name,
        last_name,
        agency_id
      )
    `)
    .order("created_at", { ascending: false });
  
  if (patientId) {
    query = query.eq("patient_id", patientId);
  }
  
  // Filter by agency unless user is super_admin
  if (agencyId && !isSuperAdmin) {
    query = query.eq("patient.agency_id", agencyId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function sendMessage(messageData: {
  patient_id: string;
  sender_name: string;
  sender_type: string;
  recipient_name?: string;
  subject?: string;
  message: string;
  topic?: string;
  attachments?: any[];
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("messages")
    .insert(messageData)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
  
  return data;
}

export async function markMessageAsRead(messageId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("messages")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
  
  return data;
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);
  
  if (error) throw error;
  
  revalidatePath("/admin/messages");
  revalidatePath("/family/messages");
}
