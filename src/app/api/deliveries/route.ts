import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";
import { registerTrackingNumber } from "@/lib/actions/tracking";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Delivery API received body:", JSON.stringify(body, null, 2));
    
    const {
      patient_id,
      item_name,
      carrier,
      tracking_number,
      tracking_url,
      status,
      estimated_delivery,
      notes,
      supply_request_id,
    } = body;

    console.log("Parsed values:", {
      patient_id,
      item_name,
      carrier,
      tracking_number,
      supply_request_id,
      estimated_delivery,
    });

    // Validate required fields
    if (!patient_id || !item_name) {
      return NextResponse.json(
        { error: "Missing required fields: patient_id and item_name are required" },
        { status: 400 }
      );
    }

    // Validate UUID format for patient_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patient_id)) {
      return NextResponse.json(
        { error: "Invalid patient_id format" },
        { status: 400 }
      );
    }

    // Verify the patient belongs to the user's agency
    const { data: agencyUser, error: agencyError } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    if (agencyError) {
      console.error("Error fetching agency user:", agencyError);
      return NextResponse.json({ error: "Failed to verify user agency", details: agencyError.message, code: agencyError.code }, { status: 500 });
    }

    if (!agencyUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("agency_id")
      .eq("id", patient_id)
      .single();

    if (patientError) {
      console.error("Error fetching patient:", patientError);
      return NextResponse.json({ error: "Failed to verify patient", details: patientError.message, code: patientError.code }, { status: 500 });
    }

    if (!patient || patient.agency_id !== agencyUser.agency_id) {
      return NextResponse.json(
        { error: "Patient not found or unauthorized" },
        { status: 403 }
      );
    }

    // Verify supply_request_id exists if provided (and is a valid UUID format)
    let validSupplyRequestId: string | null = null;
    
    console.log("Checking supply_request_id:", supply_request_id, "type:", typeof supply_request_id);
    
    if (supply_request_id && typeof supply_request_id === 'string' && supply_request_id.trim() !== '' && uuidRegex.test(supply_request_id)) {
      console.log("Valid UUID format for supply_request_id, querying database...");
      const { data: supplyRequest, error: supplyError } = await supabase
        .from("supply_requests")
        .select("id")
        .eq("id", supply_request_id)
        .single();
      
      if (supplyError) {
        console.error("Supply request query error:", supplyError.code, supplyError.message);
        // Continue without the supply_request_id rather than failing
      } else if (!supplyRequest) {
        console.error("Supply request not found:", supply_request_id);
      } else {
        validSupplyRequestId = supply_request_id;
        console.log("Valid supply request found:", validSupplyRequestId);
      }
    } else {
      console.log("Skipping supply_request_id validation (empty or invalid format)");
    }

    // Create the delivery
    // Handle estimated_delivery - empty strings should be null for TIMESTAMPTZ column
    let parsedEstimatedDelivery: string | null = null;
    if (estimated_delivery && typeof estimated_delivery === 'string' && estimated_delivery.trim() !== '') {
      // Validate it's a valid date format
      const parsedDate = new Date(estimated_delivery);
      if (!isNaN(parsedDate.getTime())) {
        parsedEstimatedDelivery = parsedDate.toISOString();
      }
    }

    // Build the insert object, only including fields that have values
    const insertData: Record<string, any> = {
      patient_id,
      item_name,
      status: status || "ordered",
    };
    
    // Only add optional fields if they have actual values (not empty strings)
    if (carrier && typeof carrier === 'string' && carrier.trim() !== '') {
      insertData.carrier = carrier.trim();
    }
    if (tracking_number && typeof tracking_number === 'string' && tracking_number.trim() !== '') {
      insertData.tracking_number = tracking_number.trim();
    }
    if (tracking_url && typeof tracking_url === 'string' && tracking_url.trim() !== '') {
      insertData.tracking_url = tracking_url.trim();
    }
    if (parsedEstimatedDelivery) {
      insertData.estimated_delivery = parsedEstimatedDelivery;
    }
    if (notes && typeof notes === 'string' && notes.trim() !== '') {
      insertData.notes = notes.trim();
    }
    if (validSupplyRequestId) {
      insertData.supply_request_id = validSupplyRequestId;
    }
    
    console.log("Final insert data:", JSON.stringify(insertData, null, 2));
    
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .insert(insertData)
      .select("*, patients(first_name, last_name)")
      .single();

    if (error) {
      console.error("Error creating delivery:", JSON.stringify(error, null, 2));
      console.error("Insert data was:", JSON.stringify(insertData, null, 2));
      return NextResponse.json(
        { error: "Failed to create delivery", details: error.message, code: error.code },
        { status: 500 }
      );
    }

    // Register tracking number with 17track if tracking info was provided
    if (delivery && (tracking_number || tracking_url)) {
      try {
        // Get family member email for notifications
        let familyEmail: string | undefined;
        const { data: familyMembers } = await supabase
          .from("family_members")
          .select("email")
          .eq("patient_id", patient_id)
          .not("email", "is", null)
          .limit(1);
        
        if (familyMembers && familyMembers.length > 0 && familyMembers[0].email) {
          familyEmail = familyMembers[0].email;
        }
        
        console.log("Registering tracking with 17track for new delivery:", { 
          trackingNumber: tracking_number, 
          carrier,
          deliveryId: delivery.id,
          familyEmail,
        });
        
        const result = await registerTrackingNumber({
          trackingNumber: tracking_number || "",
          trackingUrl: tracking_url || "",
          deliveryId: delivery.id,
          carrierName: carrier || undefined,
          email: familyEmail,
          tag: delivery.id,
          note: item_name || undefined,
        });
        console.log("17track registration result:", result);
      } catch (trackingError) {
        // Log but don't fail the request if tracking registration fails
        console.error("Failed to register tracking with 17track:", trackingError);
      }
    }

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/deliveries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
