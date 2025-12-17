import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  isCompleted: boolean;
}

export interface TrackingResponse {
  trackingNumber?: string;
  carrier?: string;
  currentStatus: string;
  estimatedDelivery?: string;
  shipTo?: string;
  events: TrackingEvent[];
  deliveryStatus?: "label_created" | "in_transit" | "out_for_delivery" | "delivered";
  error?: string;
}

// Use 17track API for reliable tracking across all carriers
const TRACKING_API_KEY = process.env.TRACKING_API_KEY;

export async function POST(request: Request) {
  try {
    const { trackingUrl, deliveryId } = await request.json();

    if (!trackingUrl) {
      return NextResponse.json(
        { error: "Tracking URL is required" },
        { status: 400 }
      );
    }

    const trackingNumber = extractTrackingNumber(trackingUrl);
    const carrier = detectCarrier(trackingUrl);
    const carrierCode = getCarrierCode(carrier);

    console.log("Tracking request:", { trackingNumber, carrier, carrierCode, hasApiKey: !!TRACKING_API_KEY });

    // Try to fetch from tracking API if we have an API key and tracking number
    if (TRACKING_API_KEY && trackingNumber) {
      try {
        console.log("Calling 17track API with tracking number:", trackingNumber);
        const apiResult = await fetchFromTrackingAPI(trackingNumber, carrierCode);
        console.log("17track API result:", JSON.stringify(apiResult, null, 2));
        if (apiResult && !apiResult.error) {
          // Update delivery status in database
          if (deliveryId && apiResult.deliveryStatus) {
            await updateDeliveryStatus(deliveryId, apiResult);
          }
          return NextResponse.json(apiResult);
        }
      } catch (apiError) {
        console.log("Tracking API failed, using database status:", apiError);
      }
    } else {
      console.log("Skipping API call - API key present:", !!TRACKING_API_KEY, "Tracking number:", trackingNumber);
    }

    // Fallback: Use database status but indicate that real-time tracking requires API key
    let deliveryData = null;
    if (deliveryId) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .eq("id", deliveryId)
        .single();
      deliveryData = data;
    }

    const trackingInfo = buildTrackingInfoFromDB(trackingUrl, deliveryData, carrier, trackingNumber);
    
    // Add note about real-time tracking
    if (!TRACKING_API_KEY) {
      trackingInfo.error = "Real-time tracking requires API configuration. Click 'View All Shipping Details' to see live status on the carrier website.";
    }
    
    return NextResponse.json(trackingInfo);

  } catch (error) {
    console.error("Error processing tracking info:", error);
    return NextResponse.json(
      { 
        error: "Unable to process tracking information",
        currentStatus: "Label Created",
        events: buildDefaultMilestones("label_created"),
        deliveryStatus: "label_created",
      },
      { status: 200 }
    );
  }
}

async function fetchFromTrackingAPI(trackingNumber: string, carrierCode: string): Promise<TrackingResponse | null> {
  // Using 17track API v2.4 - a reliable multi-carrier tracking API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // v2.4 API format
    const requestBody = [{
      number: trackingNumber,
      carrier: carrierCode ? parseInt(carrierCode) : undefined,
    }];
    
    console.log("17track v2.4 request body:", JSON.stringify(requestBody));
    
    const response = await fetch("https://api.17track.net/track/v2.4/gettrackinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACKING_API_KEY!,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log("17track v2.4 raw response:", responseText);

    if (!response.ok) {
      console.error("17track API error - status:", response.status, "body:", responseText);
      throw new Error(`Tracking API request failed: ${response.status}`);
    }

    const result = JSON.parse(responseText);
    console.log("17track v2.4 parsed response:", JSON.stringify(result, null, 2));
    
    // v2.4 response format - check for accepted array
    if (result.data?.accepted && result.data.accepted.length > 0) {
      const trackData = result.data.accepted[0];
      return parseTrackingAPIResponseV24(trackData, trackingNumber);
    }
    
    // Fallback to v2.2 format if present
    if (result.data && result.data[0] && result.data[0].track) {
      const trackData = result.data[0].track;
      return parseTrackingAPIResponse(trackData, trackingNumber);
    }
    
    // Check for rejected items
    if (result.data?.rejected && result.data.rejected.length > 0) {
      console.log("17track rejected:", JSON.stringify(result.data.rejected, null, 2));
    }

    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseTrackingAPIResponseV24(trackData: any, trackingNumber: string): TrackingResponse {
  let deliveryStatus: TrackingResponse["deliveryStatus"] = "label_created";
  let currentStatus = "Label Created";
  
  // v2.4 uses track_info object with latest_status and latest_event
  const trackInfo = trackData.track_info || trackData;
  const latestStatus = trackInfo.latest_status || {};
  const latestEvent = trackInfo.latest_event || {};
  
  // Status codes in v2.4
  // 0: Not Found, 10: In Transit, 20: Expired, 30: Pick Up, 35: Undelivered, 40: Delivered, 50: Alert
  const statusCode = latestStatus.status || trackInfo.e || 0;
  
  if (statusCode === 40 || statusCode === 50) { // Delivered
    deliveryStatus = "delivered";
    currentStatus = "Delivered";
  } else if (statusCode === 35 || latestEvent.description?.toLowerCase().includes("out for delivery")) { // Out for delivery
    deliveryStatus = "out_for_delivery";
    currentStatus = "Out for Delivery";
  } else if (statusCode >= 10 && statusCode < 35) { // In transit
    deliveryStatus = "in_transit";
    currentStatus = "On the Way";
  } else if (statusCode === 30) { // Picked up
    deliveryStatus = "in_transit";
    currentStatus = "We Have Your Package";
  }

  // Check event description for more accurate status
  const eventDesc = (latestEvent.description || "").toLowerCase();
  if (eventDesc.includes("delivered")) {
    deliveryStatus = "delivered";
    currentStatus = "Delivered";
  } else if (eventDesc.includes("out for delivery")) {
    deliveryStatus = "out_for_delivery";
    currentStatus = "Out for Delivery";
  } else if (eventDesc.includes("in transit") || eventDesc.includes("departed") || eventDesc.includes("arrived")) {
    deliveryStatus = "in_transit";
    currentStatus = "On the Way";
  }

  // Extract estimated delivery if available
  let estimatedDelivery = "";
  if (trackInfo.time_metrics?.estimated_delivery_date) {
    const estDate = new Date(trackInfo.time_metrics.estimated_delivery_date.from || trackInfo.time_metrics.estimated_delivery_date);
    estimatedDelivery = estDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  // Build events from tracking history
  const events: TrackingEvent[] = [];
  if (trackInfo.tracking?.providers?.[0]?.events) {
    trackInfo.tracking.providers[0].events.slice(0, 10).forEach((event: any) => {
      events.push({
        status: event.description || event.status || "Update",
        location: event.location || event.address || "",
        timestamp: event.time_utc || event.time || "",
        isCompleted: true,
      });
    });
  }

  return {
    trackingNumber,
    carrier: trackData.carrier?.name || trackInfo.carrier_name || "Carrier",
    currentStatus,
    estimatedDelivery: estimatedDelivery || undefined,
    events: events.length > 0 ? events : buildDefaultMilestones(deliveryStatus),
    deliveryStatus,
  };
}

function parseTrackingAPIResponse(trackData: any, trackingNumber: string): TrackingResponse {
  let deliveryStatus: TrackingResponse["deliveryStatus"] = "label_created";
  let currentStatus = "Label Created";
  
  // Parse status from tracking events
  if (trackData.e === 40 || trackData.e === 50) { // Delivered
    deliveryStatus = "delivered";
    currentStatus = "Delivered";
  } else if (trackData.e === 35) { // Out for delivery
    deliveryStatus = "out_for_delivery";
    currentStatus = "Out for Delivery";
  } else if (trackData.e >= 20 && trackData.e < 35) { // In transit
    deliveryStatus = "in_transit";
    currentStatus = "On the Way";
  } else if (trackData.e >= 10) { // Picked up
    deliveryStatus = "in_transit";
    currentStatus = "We Have Your Package";
  }

  // Extract estimated delivery if available
  let estimatedDelivery = "";
  if (trackData.z1) {
    estimatedDelivery = trackData.z1;
  }

  return {
    trackingNumber,
    carrier: trackData.w1 || "Carrier",
    currentStatus,
    estimatedDelivery: estimatedDelivery || undefined,
    events: buildDefaultMilestones(deliveryStatus),
    deliveryStatus,
  };
}

async function updateDeliveryStatus(deliveryId: string, trackingInfo: TrackingResponse) {
  try {
    const supabase = await createClient();
    
    let newStatus = "shipped";
    if (trackingInfo.deliveryStatus === "out_for_delivery") {
      newStatus = "out_for_delivery";
    } else if (trackingInfo.deliveryStatus === "delivered") {
      newStatus = "delivered";
    } else if (trackingInfo.deliveryStatus === "in_transit") {
      newStatus = "in_transit";
    }

    const updateData: Record<string, any> = {
      status: newStatus,
      last_update: new Date().toISOString(),
    };

    if (trackingInfo.estimatedDelivery && !trackingInfo.estimatedDelivery.includes("will be available")) {
      updateData.estimated_delivery = trackingInfo.estimatedDelivery;
    }

    if (newStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId);
  } catch (error) {
    console.error("Error updating delivery status:", error);
  }
}

function extractTrackingNumber(url: string): string | undefined {
  // UPS
  let match = url.match(/tracknum=([A-Z0-9]+)/i);
  if (match) return match[1];
  
  // UPS alternative
  match = url.match(/InquiryNumber1=([A-Z0-9]+)/i);
  if (match) return match[1];
  
  // FedEx
  match = url.match(/trknbr=([0-9]+)/i);
  if (match) return match[1];
  
  match = url.match(/trackingnumber=([0-9]+)/i);
  if (match) return match[1];
  
  // USPS
  match = url.match(/tLabels=([A-Z0-9]+)/i);
  if (match) return match[1];

  // Generic tracking number patterns
  match = url.match(/tracking[=\/]([A-Z0-9]+)/i);
  if (match) return match[1];
  
  match = url.match(/track[=\/]([A-Z0-9]+)/i);
  if (match) return match[1];
  
  return undefined;
}

function detectCarrier(url: string): string {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("ups.com")) return "UPS";
  if (urlLower.includes("usps.com")) return "USPS";
  if (urlLower.includes("fedex.com")) return "FedEx";
  if (urlLower.includes("dhl.com")) return "DHL";
  if (urlLower.includes("amazon.com")) return "Amazon";
  if (urlLower.includes("ontrac.com")) return "OnTrac";
  if (urlLower.includes("lasership.com")) return "LaserShip";
  if (urlLower.includes("purolator.com")) return "Purolator";
  if (urlLower.includes("canadapost")) return "Canada Post";
  return "Carrier";
}

function getCarrierCode(carrier: string): string {
  // 17track carrier codes
  const codes: Record<string, string> = {
    "UPS": "100002",
    "USPS": "100001",
    "FedEx": "100003",
    "DHL": "100004",
    "Amazon": "100143",
    "OnTrac": "100049",
    "LaserShip": "100050",
  };
  return codes[carrier] || "";
}

function buildDefaultMilestones(deliveryStatus: TrackingResponse["deliveryStatus"]): TrackingEvent[] {
  return [
    { 
      status: "Label Created", 
      isCompleted: true, 
      timestamp: "" 
    },
    { 
      status: "We Have Your Package", 
      isCompleted: deliveryStatus === "in_transit" || deliveryStatus === "out_for_delivery" || deliveryStatus === "delivered", 
      timestamp: "" 
    },
    { 
      status: "On the Way", 
      isCompleted: deliveryStatus === "in_transit" || deliveryStatus === "out_for_delivery" || deliveryStatus === "delivered", 
      timestamp: "" 
    },
    { 
      status: "Out for Delivery", 
      isCompleted: deliveryStatus === "out_for_delivery" || deliveryStatus === "delivered", 
      timestamp: "" 
    },
    { 
      status: "Delivered", 
      isCompleted: deliveryStatus === "delivered", 
      timestamp: "" 
    },
  ];
}

function buildTrackingInfoFromDB(trackingUrl: string, deliveryData: any, carrier?: string, trackingNum?: string): TrackingResponse {
  const trackingNumber = trackingNum || deliveryData?.tracking_number || extractTrackingNumber(trackingUrl);
  const detectedCarrier = carrier || detectCarrier(trackingUrl);
  
  let deliveryStatus: TrackingResponse["deliveryStatus"] = "label_created";
  if (deliveryData?.status) {
    switch (deliveryData.status) {
      case "shipped":
      case "in_transit":
        deliveryStatus = "in_transit";
        break;
      case "out_for_delivery":
        deliveryStatus = "out_for_delivery";
        break;
      case "delivered":
        deliveryStatus = "delivered";
        break;
      default:
        deliveryStatus = "label_created";
    }
  }

  const statusLabels: Record<string, string> = {
    "label_created": "Label Created",
    "in_transit": "On the Way",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
  };

  let estimatedDelivery: string;
  if (deliveryData?.estimated_delivery) {
    estimatedDelivery = deliveryData.estimated_delivery;
  } else if (deliveryStatus === "label_created") {
    estimatedDelivery = `Estimated delivery date will be available when ${detectedCarrier} receives the package.`;
  } else if (deliveryStatus === "delivered" && deliveryData?.delivered_at) {
    estimatedDelivery = `Delivered on ${new Date(deliveryData.delivered_at).toLocaleDateString()}`;
  } else {
    estimatedDelivery = "Check carrier website for estimated delivery.";
  }

  return {
    trackingNumber,
    carrier: detectedCarrier,
    currentStatus: statusLabels[deliveryStatus] || "Label Created",
    estimatedDelivery,
    events: buildDefaultMilestones(deliveryStatus),
    deliveryStatus,
  };
}
