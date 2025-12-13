import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const eventType = searchParams.get("event_type");
    
    let query = supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    
    if (eventType) {
      query = query.eq("event_type", eventType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const summary = {
      totalEvents: data?.length || 0,
      eventsByType: {} as Record<string, number>,
      eventsByDay: {} as Record<string, number>,
    };
    
    data?.forEach((event) => {
      summary.eventsByType[event.event_type] = 
        (summary.eventsByType[event.event_type] || 0) + 1;
      
      const day = new Date(event.created_at).toISOString().split("T")[0];
      summary.eventsByDay[day] = (summary.eventsByDay[day] || 0) + 1;
    });
    
    return NextResponse.json({ data, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("analytics_events")
      .insert(body)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
