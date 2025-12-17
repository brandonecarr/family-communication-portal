import { NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

// 17track webhook endpoint
// Register this URL in your 17track dashboard: https://verawaycare.com/api/webhooks/17track

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("17track webhook received:", JSON.stringify(body, null, 2));

    // Verify the webhook (17track sends a signature in headers)
    const signature = request.headers.get("sign");
    const webhookSecret = process.env.TRACKING_WEBHOOK_SECRET;
    
    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      // 17track uses MD5 hash for signature verification
      // signature = MD5(data + secret)
      // For now, we'll log and process - add verification if needed
      console.log("Webhook signature:", signature);
    }

    // 17track webhook payload structure
    const { event, data } = body;

    if (!data || !data.number) {
      return NextResponse.json({ success: true, message: "No tracking data" });
    }

    const trackingNumber = data.number;
    const trackInfo = data.track_info || data.track || {};
    
    // Determine delivery status from webhook data
    let newStatus = "shipped";
    const latestStatus = trackInfo.latest_status || {};
    const latestEvent = trackInfo.latest_event || {};
    const statusCode = latestStatus.status || 0;
    const eventDesc = (latestEvent.description || "").toLowerCase();

    // Status codes: 0=Not Found, 10=In Transit, 20=Expired, 30=Pick Up, 35=Undelivered, 40=Delivered, 50=Alert
    if (statusCode === 40 || eventDesc.includes("delivered")) {
      newStatus = "delivered";
    } else if (statusCode === 35 || eventDesc.includes("out for delivery")) {
      newStatus = "out_for_delivery";
    } else if (statusCode >= 10 && statusCode < 35) {
      newStatus = "in_transit";
    } else if (statusCode === 30) {
      newStatus = "shipped";
    }

    // Update delivery in database
    const supabase = await createClient();
    
    const { data: delivery, error: findError } = await supabase
      .from("deliveries")
      .select("id, status")
      .eq("tracking_number", trackingNumber)
      .single();

    if (findError || !delivery) {
      console.log("Delivery not found for tracking number:", trackingNumber);
      return NextResponse.json({ success: true, message: "Delivery not found" });
    }

    // Only update if status has changed
    if (delivery.status !== newStatus) {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", delivery.id);

      if (updateError) {
        console.error("Failed to update delivery:", updateError);
      } else {
        console.log(`Updated delivery ${delivery.id} status to ${newStatus}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Webhook processed",
      trackingNumber,
      status: newStatus 
    });

  } catch (error) {
    console.error("17track webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handle webhook verification (GET request)
export async function GET(request: Request) {
  // 17track may send a GET request to verify the webhook URL
  return NextResponse.json({ 
    status: "ok", 
    message: "17track webhook endpoint is active" 
  });
}
