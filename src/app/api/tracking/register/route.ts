import { NextResponse } from "next/server";
import { registerAllTrackingNumbers, refreshTrackingInfo } from "@/lib/actions/tracking";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // If a specific delivery ID is provided, refresh just that one
    if (body.deliveryId) {
      const result = await refreshTrackingInfo(body.deliveryId);
      return NextResponse.json(result);
    }
    
    // Otherwise, register all tracking numbers
    const results = await registerAllTrackingNumbers();
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error registering tracking numbers:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
