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

    // Try to fetch from tracking API if we have an API key and tracking number
    if (TRACKING_API_KEY && trackingNumber) {
      try {
        const apiResult = await fetchFromTrackingAPI(trackingNumber, carrierCode);
        if (apiResult && !apiResult.error) {
          // Update delivery status in database
          if (deliveryId && apiResult.deliveryStatus) {
            await updateDeliveryStatus(deliveryId, apiResult);
          }
          return NextResponse.json(apiResult);
        }
      } catch (apiError) {
        console.log("Tracking API failed, falling back to scraping:", apiError);
      }
    }

    // Fallback: Try to scrape the carrier page directly with retries
    try {
      const scrapedResult = await scrapeCarrierPage(trackingUrl, carrier, trackingNumber);
      if (scrapedResult && !scrapedResult.error) {
        if (deliveryId && scrapedResult.deliveryStatus) {
          await updateDeliveryStatus(deliveryId, scrapedResult);
        }
        return NextResponse.json(scrapedResult);
      }
    } catch (scrapeError) {
      console.log("Scraping failed:", scrapeError);
    }

    // Final fallback: Use database status
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

    const trackingInfo = buildTrackingInfoFromDB(trackingUrl, deliveryData);
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
  // Using 17track API - a reliable multi-carrier tracking API
  const response = await fetch("https://api.17track.net/track/v2.2/gettrackinfo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": TRACKING_API_KEY!,
    },
    body: JSON.stringify({
      data: [{
        number: trackingNumber,
        carrier: carrierCode ? parseInt(carrierCode) : undefined,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error("Tracking API request failed");
  }

  const result = await response.json();
  
  if (result.data && result.data[0] && result.data[0].track) {
    const trackData = result.data[0].track;
    return parseTrackingAPIResponse(trackData, trackingNumber);
  }

  return null;
}

function parseTrackingAPIResponse(trackData: any, trackingNumber: string): TrackingResponse {
  const events = trackData.z0?.z || [];
  const latestEvent = events[0];
  
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

async function scrapeCarrierPage(trackingUrl: string, carrier: string, trackingNumber?: string): Promise<TrackingResponse | null> {
  // Use multiple proxy/scraping strategies
  const strategies = [
    () => fetchWithBrowserHeaders(trackingUrl),
    () => fetchViaAllOrigins(trackingUrl),
    () => fetchViaCorsProxy(trackingUrl),
  ];

  for (const strategy of strategies) {
    try {
      const html = await strategy();
      if (html) {
        return parseCarrierHTML(html, carrier, trackingNumber, trackingUrl);
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

async function fetchWithBrowserHeaders(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function fetchViaAllOrigins(url: string): Promise<string | null> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function fetchViaCorsProxy(url: string): Promise<string | null> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

function parseCarrierHTML(html: string, carrier: string, trackingNumber?: string, url?: string): TrackingResponse {
  const htmlLower = html.toLowerCase();
  
  let deliveryStatus: TrackingResponse["deliveryStatus"] = "label_created";
  let currentStatus = "Label Created";
  let estimatedDelivery = "";

  // Check for delivered status
  if (
    (htmlLower.includes("delivered") && !htmlLower.includes("out for delivery") && !htmlLower.includes("estimated delivery")) ||
    htmlLower.includes("was delivered") ||
    htmlLower.includes("has been delivered") ||
    htmlLower.includes("package delivered")
  ) {
    deliveryStatus = "delivered";
    currentStatus = "Delivered";
  }
  // Check for out for delivery
  else if (
    htmlLower.includes("out for delivery") ||
    htmlLower.includes("on vehicle for delivery") ||
    htmlLower.includes("with delivery courier")
  ) {
    deliveryStatus = "out_for_delivery";
    currentStatus = "Out for Delivery";
  }
  // Check for in transit
  else if (
    htmlLower.includes("in transit") ||
    htmlLower.includes("on the way") ||
    htmlLower.includes("departed") ||
    htmlLower.includes("arrived at") ||
    htmlLower.includes("processing at") ||
    htmlLower.includes("in movement")
  ) {
    deliveryStatus = "in_transit";
    currentStatus = "On the Way";
  }
  // Check for picked up / origin scan
  else if (
    htmlLower.includes("origin scan") ||
    htmlLower.includes("picked up") ||
    htmlLower.includes("shipment picked up") ||
    htmlLower.includes("package received") ||
    htmlLower.includes("accepted")
  ) {
    deliveryStatus = "in_transit";
    currentStatus = "We Have Your Package";
  }
  // Check for label created
  else if (
    htmlLower.includes("label created") ||
    htmlLower.includes("shipping label created") ||
    htmlLower.includes("shipment information sent") ||
    htmlLower.includes("order processed") ||
    htmlLower.includes("ready for ups")
  ) {
    deliveryStatus = "label_created";
    currentStatus = "Label Created";
  }

  // Extract estimated delivery date
  const estPatterns = [
    /scheduled delivery[:\s]*([^<\n]+)/i,
    /estimated delivery[:\s]*([^<\n]+)/i,
    /expected delivery[:\s]*([^<\n]+)/i,
    /delivery by[:\s]*([^<\n]+)/i,
    /arriving[:\s]*([^<\n]+)/i,
  ];

  for (const pattern of estPatterns) {
    const match = html.match(pattern);
    if (match) {
      estimatedDelivery = match[1].trim().replace(/\s+/g, ' ').substring(0, 100);
      break;
    }
  }

  // If no estimated delivery found and status is label_created
  if (!estimatedDelivery && deliveryStatus === "label_created") {
    estimatedDelivery = `Estimated delivery date will be available when ${carrier} receives the package.`;
  }

  return {
    trackingNumber: trackingNumber || extractTrackingNumber(url || ""),
    carrier,
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

function buildTrackingInfoFromDB(trackingUrl: string, deliveryData: any): TrackingResponse {
  const trackingNumber = deliveryData?.tracking_number || extractTrackingNumber(trackingUrl);
  const carrier = detectCarrier(trackingUrl);
  
  let deliveryStatus: TrackingResponse["deliveryStatus"] = "label_created";
  if (deliveryData?.status) {
    switch (deliveryData.status) {
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
    estimatedDelivery = `Estimated delivery date will be available when ${carrier} receives the package.`;
  } else if (deliveryStatus === "delivered" && deliveryData?.delivered_at) {
    estimatedDelivery = `Delivered on ${new Date(deliveryData.delivered_at).toLocaleDateString()}`;
  } else {
    estimatedDelivery = "Check carrier website for estimated delivery.";
  }

  return {
    trackingNumber,
    carrier,
    currentStatus: statusLabels[deliveryStatus] || "Label Created",
    estimatedDelivery,
    events: buildDefaultMilestones(deliveryStatus),
    deliveryStatus,
  };
}
