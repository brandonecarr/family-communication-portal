import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const deliveryId = params.id;

    // Get the delivery to verify access
    const { data: existingDelivery } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        patient:patient_id (
          agency_id
        )
      `
      )
      .eq("id", deliveryId)
      .single();

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    // Verify the user has access to this delivery's patient
    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    if (
      !agencyUser ||
      existingDelivery.patient?.agency_id !== agencyUser.agency_id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the delivery
    const updateData: any = {};
    if (body.item_name !== undefined) updateData.item_name = body.item_name;
    if (body.carrier !== undefined) updateData.carrier = body.carrier || null;
    if (body.tracking_number !== undefined)
      updateData.tracking_number = body.tracking_number || null;
    if (body.tracking_url !== undefined)
      updateData.tracking_url = body.tracking_url || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.estimated_delivery !== undefined)
      updateData.estimated_delivery = body.estimated_delivery || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    // Add last_update timestamp when status changes
    if (body.status !== undefined && body.status !== existingDelivery.status) {
      updateData.last_update = new Date().toISOString();
      // Set delivered_at when status changes to delivered
      if (body.status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }
    }

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
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
      console.error("Error updating delivery:", error);
      return NextResponse.json(
        { error: "Failed to update delivery" },
        { status: 500 }
      );
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Error in PATCH /api/deliveries/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deliveryId = params.id;

    // Get the delivery to verify access
    const { data: existingDelivery } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        patient:patient_id (
          agency_id
        )
      `
      )
      .eq("id", deliveryId)
      .single();

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    // Verify the user has access to this delivery's patient
    const { data: agencyUser } = await supabase
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .single();

    if (
      !agencyUser ||
      existingDelivery.patient?.agency_id !== agencyUser.agency_id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the delivery
    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", deliveryId);

    if (error) {
      console.error("Error deleting delivery:", error);
      return NextResponse.json(
        { error: "Failed to delete delivery" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/deliveries/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
