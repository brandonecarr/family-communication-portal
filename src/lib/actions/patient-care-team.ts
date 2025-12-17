"use server";

import { createServiceClient } from "../../../supabase/server";
import { createClient } from "../../../supabase/server";

export interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  job_role: string;
  care_team_member_id?: string; // ID in care_team_members table
}

export interface PatientCareTeamAssignment {
  id: string;
  patient_id: string;
  care_team_member_id: string;
  assigned_at: string;
}

export async function getStaffByAgency(agencyId: string): Promise<StaffMember[]> {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  const { data: agencyUsers, error: agencyError } = await supabase
    .from("agency_users")
    .select("user_id, job_role")
    .eq("agency_id", agencyId)
    .not("job_role", "is", null);

  if (agencyError) {
    console.error("Error fetching agency users:", agencyError);
    throw new Error("Failed to fetch staff members");
  }

  if (!agencyUsers || agencyUsers.length === 0) {
    return [];
  }

  const userIds = agencyUsers.map((au) => au.user_id);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds);

  if (usersError) {
    console.error("Error fetching users:", usersError);
    throw new Error("Failed to fetch user details");
  }

  // Get care_team_members for this agency to find existing entries
  const { data: careTeamMembers } = await supabase
    .from("care_team_members")
    .select("id, user_id")
    .eq("agency_id", agencyId);

  const staffMembers: StaffMember[] = agencyUsers.map((au) => {
    const user = users?.find((u) => u.id === au.user_id);
    const careTeamMember = careTeamMembers?.find((ctm) => ctm.user_id === au.user_id);
    return {
      id: au.user_id,
      user_id: au.user_id,
      full_name: user?.full_name || "Unknown",
      job_role: au.job_role,
      care_team_member_id: careTeamMember?.id,
    };
  });

  return staffMembers;
}

export async function getPatientCareTeam(patientId: string) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  // Get patient care team with care_team_members details
  const { data, error } = await supabase
    .from("patient_care_team")
    .select(`
      id,
      patient_id,
      care_team_member_id,
      assigned_at,
      care_team_members (
        id,
        user_id,
        role
      )
    `)
    .eq("patient_id", patientId);

  if (error) {
    console.error("Error fetching patient care team:", error);
    throw new Error("Failed to fetch patient care team");
  }

  return data || [];
}

export async function assignStaffToPatient(
  patientId: string,
  staffUserId: string,
  jobRole: string,
  agencyId: string
) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  // Get the staff member's details
  const { data: staffData } = await supabase
    .from("agency_users")
    .select("job_role")
    .eq("user_id", staffUserId)
    .single();

  if (staffData?.job_role !== jobRole) {
    throw new Error("Staff member does not have the required role");
  }

  // Get user details
  const { data: userData } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", staffUserId)
    .single();

  // Check if care_team_member already exists for this user
  let { data: existingMember } = await supabase
    .from("care_team_members")
    .select("id")
    .eq("user_id", staffUserId)
    .eq("agency_id", agencyId)
    .single();

  let careTeamMemberId: string;

  if (!existingMember) {
    // Create a care_team_member entry
    const nameParts = (userData?.full_name || "Unknown").split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    const { data: newMember, error: createError } = await supabase
      .from("care_team_members")
      .insert({
        agency_id: agencyId,
        user_id: staffUserId,
        first_name: firstName,
        last_name: lastName,
        role: jobRole,
        email: userData?.email,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating care team member:", createError);
      throw new Error("Failed to create care team member");
    }

    careTeamMemberId = newMember.id;
  } else {
    careTeamMemberId = existingMember.id;
  }

  // Remove any existing assignment for this role
  const { data: existingAssignments } = await supabase
    .from("patient_care_team")
    .select(`
      id,
      care_team_member_id,
      care_team_members (
        id,
        role
      )
    `)
    .eq("patient_id", patientId);

  if (existingAssignments && existingAssignments.length > 0) {
    for (const assignment of existingAssignments) {
      const member = assignment.care_team_members as any;
      if (member?.role === jobRole) {
        await supabase
          .from("patient_care_team")
          .delete()
          .eq("id", assignment.id);
      }
    }
  }

  // Insert new assignment
  const { data, error } = await supabase
    .from("patient_care_team")
    .insert({
      patient_id: patientId,
      care_team_member_id: careTeamMemberId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error assigning staff to patient:", error);
    throw new Error("Failed to assign staff to patient");
  }

  return data;
}

export async function removeStaffFromPatient(
  patientId: string,
  careTeamMemberId: string
) {
  const supabase = createServiceClient();
  
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  const { error } = await supabase
    .from("patient_care_team")
    .delete()
    .eq("patient_id", patientId)
    .eq("care_team_member_id", careTeamMemberId);

  if (error) {
    console.error("Error removing staff from patient:", error);
    throw new Error("Failed to remove staff from patient");
  }

  return { success: true };
}

export interface CareTeamMemberForFamily {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  description: string;
  initials: string;
}

export async function getFamilyPatientCareTeam(): Promise<CareTeamMemberForFamily[]> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  // Get family member's patient_id
  const { data: familyMember, error: familyError } = await supabase
    .from("family_members")
    .select("patient_id")
    .eq("user_id", user.id)
    .single();

  if (familyError || !familyMember) {
    throw new Error("Family member not found");
  }

  const patientId = familyMember.patient_id;

  // Get patient care team with care_team_members and user details
  const serviceSupabase = createServiceClient();
  
  if (!serviceSupabase) {
    throw new Error("Failed to create service client");
  }

  const { data: careTeamAssignments, error: careTeamError } = await serviceSupabase
    .from("patient_care_team")
    .select(`
      id,
      care_team_member_id,
      care_team_members (
        id,
        user_id,
        role,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("patient_id", patientId);

  if (careTeamError) {
    console.error("Error fetching care team:", careTeamError);
    throw new Error("Failed to fetch care team");
  }

  if (!careTeamAssignments || careTeamAssignments.length === 0) {
    return [];
  }

  // Get user details for phone numbers if not in care_team_members
  const userIds = careTeamAssignments
    .map((a: any) => a.care_team_members?.user_id)
    .filter(Boolean);

  const { data: users } = await serviceSupabase
    .from("users")
    .select("id, full_name, phone")
    .in("id", userIds);

  // Role descriptions mapping
  const roleDescriptions: Record<string, string> = {
    "Registered Nurse": "Provides skilled nursing care, medication management, and symptom assessment",
    "RN": "Provides skilled nursing care, medication management, and symptom assessment",
    "Home Health Aide": "Assists with personal care, bathing, and daily living activities",
    "HHA": "Assists with personal care, bathing, and daily living activities",
    "Physical Therapist": "Helps maintain mobility and provides therapeutic exercises",
    "PT": "Helps maintain mobility and provides therapeutic exercises",
    "Medical Director": "Oversees medical care and coordinates treatment plans",
    "MD": "Oversees medical care and coordinates treatment plans",
    "Social Worker": "Provides emotional support and connects families with resources",
    "SW": "Provides emotional support and connects families with resources",
    "Chaplain": "Offers spiritual support and guidance during difficult times",
    "Occupational Therapist": "Helps with daily activities and adaptive equipment",
    "OT": "Helps with daily activities and adaptive equipment",
    "Speech Therapist": "Assists with communication and swallowing difficulties",
    "ST": "Assists with communication and swallowing difficulties",
    "Nurse Practitioner": "Provides advanced nursing care and can prescribe medications",
    "NP": "Provides advanced nursing care and can prescribe medications",
    "Administrator": "Manages agency operations and coordinates care services",
  };

  const careTeamMembers: CareTeamMemberForFamily[] = careTeamAssignments.map((assignment: any) => {
    const member = assignment.care_team_members;
    const user = users?.find((u: any) => u.id === member?.user_id);
    
    const firstName = member?.first_name || "";
    const lastName = member?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || user?.full_name || "Unknown";
    const role = member?.role || "Care Team Member";
    
    // Generate initials
    const nameParts = fullName.split(" ");
    const initials = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase();

    return {
      id: member?.id || assignment.care_team_member_id,
      name: fullName,
      role: role,
      email: member?.email || null,
      phone: member?.phone || user?.phone || null,
      description: roleDescriptions[role] || `Provides ${role.toLowerCase()} services for your loved one`,
      initials: initials,
    };
  });

  return careTeamMembers;
}
