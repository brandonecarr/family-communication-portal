import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";
import { registerTrackingNumber } from "@/lib/actions/tracking";

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

    // Register tracking number with 17track if tracking info was added or updated
    const trackingNumber = delivery.tracking_number || body.tracking_number;
    const trackingUrl = delivery.tracking_url || body.tracking_url;
    
    if (trackingNumber || trackingUrl) {
      // Check if tracking info was newly added or changed
      const trackingChanged = 
        (body.tracking_number !== undefined && body.tracking_number !== existingDelivery.tracking_number) ||
        (body.tracking_url !== undefined && body.tracking_url !== existingDelivery.tracking_url);
      
      if (trackingChanged && (trackingNumber || trackingUrl)) {
        try {
          // Get family member email for notifications
          let familyEmail: string | undefined;
          if (existingDelivery.patient_id) {
            const { data: familyMembers } = await supabase
              .from("family_members")
              .select("email")
              .eq("patient_id", existingDelivery.patient_id)
              .not("email", "is", null)
              .limit(1);
            
            if (familyMembers && familyMembers.length > 0 && familyMembers[0].email) {
              familyEmail = familyMembers[0].email;
            }
          }
          
          console.log("Registering tracking with 17track:", { 
            trackingNumber, 
            trackingUrl, 
            deliveryId,
            carrier: body.carrier || delivery.carrier,
            familyEmail,
          });
          
          const result = await registerTrackingNumber({
            trackingNumber: trackingNumber || "",
            trackingUrl: trackingUrl || "",
            deliveryId,
            carrierName: body.carrier || delivery.carrier || undefined,
            email: familyEmail,
            tag: deliveryId,
            note: delivery.item_name || undefined,
          });
          console.log("17track registration result:", result);
        } catch (trackingError) {
          // Log but don't fail the request if tracking registration fails
          console.error("Failed to register tracking with 17track:", trackingError);
        }
      }
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
