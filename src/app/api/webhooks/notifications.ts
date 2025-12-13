import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    const supabase = await createClient();

    // Handle different notification events
    switch (event) {
      case "visit_scheduled":
        await handleVisitScheduled(supabase, data);
        break;
      case "visit_completed":
        await handleVisitCompleted(supabase, data);
        break;
      case "message_received":
        await handleMessageReceived(supabase, data);
        break;
      case "delivery_updated":
        await handleDeliveryUpdated(supabase, data);
        break;
      case "supply_fulfilled":
        await handleSupplyFulfilled(supabase, data);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown event type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleVisitScheduled(supabase: any, data: any) {
  // Send notification to family members
  const { patient_id, visit_date, discipline } = data;

  // Create notification record
  await supabase.from("notifications").insert({
    patient_id,
    type: "visit_scheduled",
    title: "Visit Scheduled",
    message: `A ${discipline} visit has been scheduled for ${visit_date}`,
    read: false,
  });
}

async function handleVisitCompleted(supabase: any, data: any) {
  const { patient_id, staff_name } = data;

  await supabase.from("notifications").insert({
    patient_id,
    type: "visit_completed",
    title: "Visit Completed",
    message: `${staff_name} has completed the visit`,
    read: false,
  });
}

async function handleMessageReceived(supabase: any, data: any) {
  const { patient_id, sender_name } = data;

  await supabase.from("notifications").insert({
    patient_id,
    type: "message_received",
    title: "New Message",
    message: `You have a new message from ${sender_name}`,
    read: false,
  });
}

async function handleDeliveryUpdated(supabase: any, data: any) {
  const { patient_id, item_name, status } = data;

  await supabase.from("notifications").insert({
    patient_id,
    type: "delivery_updated",
    title: "Delivery Update",
    message: `${item_name} delivery status: ${status}`,
    read: false,
  });
}

async function handleSupplyFulfilled(supabase: any, data: any) {
  const { patient_id, request_id } = data;

  await supabase.from("notifications").insert({
    patient_id,
    type: "supply_fulfilled",
    title: "Supply Request Fulfilled",
    message: "Your supply request has been fulfilled and is ready for pickup",
    read: false,
  });
}
