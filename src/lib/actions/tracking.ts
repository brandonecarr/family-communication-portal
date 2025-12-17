"use server";

import { createClient } from "../../../supabase/server";
import { 
  CARRIER_CODES, 
  CARRIER_NAME_TO_CODE, 
  detectCarrierFromTrackingNumber 
} from "@/lib/tracking-utils";

const TRACKING_API_KEY = process.env.TRACKING_API_KEY;

function detectCarrierCode(trackingUrl: string, trackingNumber: string): number | undefined {
  const url = (trackingUrl || "").toLowerCase();
  
  if (url.includes("ups.com")) return CARRIER_CODES.ups;
  if (url.includes("fedex.com")) return CARRIER_CODES.fedex;
  if (url.includes("usps.com")) return CARRIER_CODES.usps;
  if (url.includes("dhl.com")) return CARRIER_CODES.dhl;
  if (url.includes("amazon.com")) return CARRIER_CODES.amazon;
  if (url.includes("ontrac.com")) return CARRIER_CODES.ontrac;
  if (url.includes("lasership.com")) return CARRIER_CODES.lasership;
  
  // Auto-detect based on tracking number format
  const detectedCarrier = detectCarrierFromTrackingNumber(trackingNumber);
  if (detectedCarrier && CARRIER_NAME_TO_CODE[detectedCarrier]) {
    return CARRIER_NAME_TO_CODE[detectedCarrier];
  }
  
  return undefined; // Let 17track auto-detect
}

function extractTrackingNumber(trackingUrl: string): string | null {
  // Try to extract from URL parameters
  const urlPatterns = [
    /tracknumbers=([A-Z0-9]+)/i,
    /tracknum=([A-Z0-9]+)/i,
    /tracking[_-]?number=([A-Z0-9]+)/i,
    /trackingId=([A-Z0-9]+)/i,
    /track\/([A-Z0-9]+)/i,
    /tracking\/([A-Z0-9]+)/i,
    /\?id=([A-Z0-9]+)/i,
  ];

  for (const pattern of urlPatterns) {
    const match = trackingUrl.match(pattern);
    if (match) return match[1];
  }

  // Try to find tracking number in URL path
  const pathMatch = trackingUrl.match(/\/([A-Z0-9]{10,30})(?:\/|\?|$)/i);
  if (pathMatch) return pathMatch[1];

  return null;
}

export interface TrackingRegistrationOptions {
  trackingNumber: string;
  trackingUrl?: string;
  deliveryId: string;
  carrierCode?: number;
  carrierName?: string;
  email?: string;
  orderNumber?: string;
  orderDate?: string;
  tag?: string;
  note?: string;
}

/**
 * Register a tracking number with 17track for push notifications
 * This should be called when a new delivery is created or updated with tracking info
 */
export async function registerTrackingNumber(
  trackingNumberOrOptions: string | TrackingRegistrationOptions,
  trackingUrl?: string,
  deliveryId?: string
): Promise<{ success: boolean; error?: string; detectedCarrier?: string }> {
  if (!TRACKING_API_KEY) {
    console.log("No TRACKING_API_KEY configured, skipping registration");
    return { success: false, error: "Tracking API not configured" };
  }

  // Handle both old signature and new options object
  let options: TrackingRegistrationOptions;
  if (typeof trackingNumberOrOptions === "string") {
    options = {
      trackingNumber: trackingNumberOrOptions,
      trackingUrl: trackingUrl || "",
      deliveryId: deliveryId || "",
    };
  } else {
    options = trackingNumberOrOptions;
  }

  let { trackingNumber } = options;
  const { trackingUrl: url, deliveryId: delId, carrierCode, carrierName, email, orderNumber, orderDate, tag, note } = options;

  if (!trackingNumber) {
    // Try to extract from URL
    trackingNumber = extractTrackingNumber(url || "") || "";
    if (!trackingNumber) {
      return { success: false, error: "Could not extract tracking number" };
    }
  }

  // Determine carrier code - use provided code, or detect from name, or auto-detect
  let finalCarrierCode = carrierCode;
  let detectedCarrier: string | undefined;
  
  if (!finalCarrierCode && carrierName) {
    finalCarrierCode = CARRIER_NAME_TO_CODE[carrierName];
    detectedCarrier = carrierName;
  }
  
  if (!finalCarrierCode) {
    detectedCarrier = detectCarrierFromTrackingNumber(trackingNumber) || undefined;
    if (detectedCarrier) {
      finalCarrierCode = CARRIER_NAME_TO_CODE[detectedCarrier];
    }
  }
  
  if (!finalCarrierCode && url) {
    finalCarrierCode = detectCarrierCode(url, trackingNumber);
  }

  try {
    console.log("Registering tracking number with 17track:", {
      trackingNumber,
      carrierCode: finalCarrierCode,
      email,
      orderNumber,
      deliveryId: delId,
    });
    
    // Build the request body according to 17track API v2.4
    const trackingItem: Record<string, any> = {
      number: trackingNumber,
      tag: tag || delId, // Use delivery ID as tag for reference
    };
    
    // Add carrier if detected
    if (finalCarrierCode) {
      trackingItem.carrier = finalCarrierCode;
    }
    
    // Add email for notifications (17track will send updates to this email)
    if (email) {
      trackingItem.email = email;
    }
    
    // Add order number if provided
    if (orderNumber) {
      trackingItem.order_no = orderNumber;
    }
    
    // Add order date if provided (format: YYYY-MM-DD)
    if (orderDate) {
      trackingItem.order_time = orderDate;
    }
    
    // Add note if provided
    if (note) {
      trackingItem.note = note;
    }

    const requestBody = [trackingItem];

    const response = await fetch("https://api.17track.net/track/v2.4/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACKING_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("17track registration response:", JSON.stringify(result, null, 2));

    if (result.data?.accepted && result.data.accepted.length > 0) {
      // Update delivery with tracking number and carrier if not already set
      const supabase = await createClient();
      const updateData: Record<string, any> = { tracking_number: trackingNumber };
      if (detectedCarrier) {
        updateData.carrier = detectedCarrier;
      }
      await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", delId);
      
      return { success: true, detectedCarrier };
    }

    if (result.data?.rejected && result.data.rejected.length > 0) {
      const rejection = result.data.rejected[0];
      // Error code 0 means already registered, which is fine
      if (rejection.error?.code === 0) {
        return { success: true, detectedCarrier };
      }
      return { success: false, error: rejection.error?.message || "Registration rejected", detectedCarrier };
    }

    return { success: false, error: "Unknown registration response", detectedCarrier };
  } catch (error) {
    console.error("Error registering tracking number:", error);
    return { success: false, error: error instanceof Error ? error.message : "Registration failed" };
  }
}

/**
 * Register all existing deliveries with tracking URLs
 * Useful for initial setup or re-registration
 */
export async function registerAllTrackingNumbers(): Promise<{
  total: number;
  registered: number;
  failed: number;
  errors: string[];
}> {
  const supabase = await createClient();
  
  const { data: deliveries, error } = await supabase
    .from("deliveries")
    .select("id, tracking_url, tracking_number")
    .not("tracking_url", "is", null)
    .neq("status", "delivered");

  if (error || !deliveries) {
    return { total: 0, registered: 0, failed: 0, errors: [error?.message || "Failed to fetch deliveries"] };
  }

  const results = {
    total: deliveries.length,
    registered: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const delivery of deliveries) {
    if (!delivery.tracking_url) continue;
    
    const trackingNumber = delivery.tracking_number || extractTrackingNumber(delivery.tracking_url);
    if (!trackingNumber) {
      results.failed++;
      results.errors.push(`Delivery ${delivery.id}: Could not extract tracking number`);
      continue;
    }

    const result = await registerTrackingNumber(trackingNumber, delivery.tracking_url, delivery.id);
    if (result.success) {
      results.registered++;
    } else {
      results.failed++;
      results.errors.push(`Delivery ${delivery.id}: ${result.error}`);
    }

    // Rate limiting - 17track has limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Manually fetch and update tracking info for a delivery
 */
export async function refreshTrackingInfo(deliveryId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("tracking_url, tracking_number")
    .eq("id", deliveryId)
    .single();

  if (error || !delivery?.tracking_url) {
    return { success: false, error: "Delivery not found or no tracking URL" };
  }

  const trackingNumber = delivery.tracking_number || extractTrackingNumber(delivery.tracking_url);
  if (!trackingNumber) {
    return { success: false, error: "Could not extract tracking number" };
  }

  // First ensure it's registered
  await registerTrackingNumber(trackingNumber, delivery.tracking_url, deliveryId);

  // Then fetch current status
  if (!TRACKING_API_KEY) {
    return { success: false, error: "Tracking API not configured" };
  }

  try {
    const response = await fetch("https://api.17track.net/track/v2.4/gettrackinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACKING_API_KEY,
      },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    const result = await response.json();
    
    if (result.data?.accepted && result.data.accepted.length > 0) {
      const trackData = result.data.accepted[0];
      const trackInfo = trackData.track_info || {};
      const latestStatus = trackInfo.latest_status || {};
      const statusCode = latestStatus.status || 0;

      let newStatus = "shipped";
      if (statusCode === 40) newStatus = "delivered";
      else if (statusCode === 35) newStatus = "out_for_delivery";
      else if (statusCode >= 10 && statusCode < 35) newStatus = "in_transit";

      const updateData: Record<string, any> = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", deliveryId);

      return { success: true };
    }

    return { success: false, error: "No tracking data returned" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch tracking" };
  }
}
