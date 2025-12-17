import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

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
    const {
      patient_id,
      item_name,
      carrier,
      tracking_number,
      tracking_url,
      status,
      estimated_delivery,
      notes,
    } = body;

    // Verify the patient belongs to the user's agency
    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    if (!agencyUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("agency_id")
      .eq("id", patient_id)
      .single();

    if (!patient || patient.agency_id !== agencyUser.agency_id) {
      return NextResponse.json(
        { error: "Patient not found or unauthorized" },
        { status: 403 }
      );
    }

    // Create the delivery
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .insert({
        patient_id,
        item_name,
        carrier: carrier || null,
        tracking_number: tracking_number || null,
        tracking_url: tracking_url || null,
        status: status || "ordered",
        estimated_delivery: estimated_delivery || null,
        notes: notes || null,
      })
      .select(
        `
        *,
        patient:patient_id (
          first_name,
          last_name
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating delivery:", error);
      return NextResponse.json(
        { error: "Failed to create delivery" },
        { status: 500 }
      );
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
