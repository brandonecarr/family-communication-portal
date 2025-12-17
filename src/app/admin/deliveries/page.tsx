import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { DeliveryManagementClient } from "@/components/admin/delivery-management-client";

type Delivery = {
  id: string;
  patient_id: string;
  item_name: string;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  status: string;
  estimated_delivery?: string | null;
  last_update?: string | null;
  notes?: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
  } | null;
};

export const dynamic = "force-dynamic";

export default async function AdminDeliveriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Get user's agency_id
  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", user.id)
    .single();

  const agencyId = agencyUser?.agency_id;

  // Fetch patients for this agency
  let patients: { id: string; first_name: string; last_name: string }[] = [];
  
  if (agencyId) {
    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("agency_id", agencyId)
      .order("last_name", { ascending: true });
    
    patients = patientsData || [];
  }

  // Fetch deliveries for patients in this agency
  let deliveries: Delivery[] = [];
  
  if (agencyId) {
    // First get all patients for this agency
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .eq("agency_id", agencyId);
    
    const patientIds = patients?.map((p: { id: string }) => p.id) || [];
    
    if (patientIds.length > 0) {
      const { data } = await supabase
        .from("deliveries")
        .select(`
          *,
          patient:patient_id (
            first_name,
            last_name
          )
        `)
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });
      
      deliveries = ((data || []).filter((d: any) => d.patient_id) as Delivery[]);
    }
  }

  return <DeliveryManagementClient initialDeliveries={deliveries} patients={patients} />;
}
