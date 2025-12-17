import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { SuppliesClient } from "./supplies-client";

type SupplyRequest = {
  id: string;
  patient_id: string;
  items: Record<string, number>;
  status: string;
  notes?: string | null;
  created_at: string;
  requested_by?: string | null;
  requested_by_name?: string | null;
  patient?: { first_name: string; last_name: string } | null;
  requester?: { name: string } | null;
};

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
};

export const dynamic = "force-dynamic";

export default async function AdminSuppliesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's agency_id
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = agencyUser?.agency_id;

  // Get user's name for approval/rejection
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();
  
  const userName = userData?.name || user.email || "Admin";

  // Fetch supply requests for patients in this agency
  let requests: SupplyRequest[] = [];
  let patients: Patient[] = [];
  
  if (agencyId) {
    // First get all patients for this agency
    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("agency_id", agencyId);
    
    patients = patientsData || [];
    const patientIds = patients.map((p) => p.id);
    
    if (patientIds.length > 0) {
      const { data } = await supabase
        .from("supply_requests")
        .select(`
          *,
          patient:patient_id (
            first_name,
            last_name
          )
        `)
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });
      
      // Use service role client to bypass RLS
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
      
      // Get all family members for these patients to look up names
      const { data: familyMembersData } = await serviceClient
        .from("family_members")
        .select("user_id, name, patient_id")
        .in("patient_id", patientIds);
      
      // Create maps for lookup
      const userIdToNameMap = new Map<string, string>();
      const patientIdToFamilyNameMap = new Map<string, string>();
      
      (familyMembersData || []).forEach((fm: any) => {
        if (fm.name) {
          if (fm.user_id) {
            userIdToNameMap.set(fm.user_id, fm.name);
          }
          if (fm.patient_id) {
            // Store first family member name for each patient as fallback
            if (!patientIdToFamilyNameMap.has(fm.patient_id)) {
              patientIdToFamilyNameMap.set(fm.patient_id, fm.name);
            }
          }
        }
      });
      
      // Map requester names from family_members table
      requests = (data || []).map((request: any) => {
        let requesterName: string | null = null;
        
        // Priority 1: Look up by user_id (requested_by)
        if (request.requested_by && userIdToNameMap.has(request.requested_by)) {
          requesterName = userIdToNameMap.get(request.requested_by)!;
        }
        // Priority 2: Look up by patient_id
        else if (request.patient_id && patientIdToFamilyNameMap.has(request.patient_id)) {
          requesterName = patientIdToFamilyNameMap.get(request.patient_id)!;
        }
        
        return {
          ...request,
          requester: requesterName ? { name: requesterName } : null,
        };
      }) as SupplyRequest[];
    }
  }

  return <SuppliesClient requests={requests} userName={userName} patients={patients} />;
}
