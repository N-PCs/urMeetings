import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract bot ID from payload
    const botId =
      body.bot_id ||
      body.bot?.id ||
      body.data?.bot_id ||
      body.data?.bot?.id;

    if (!botId) {
      return NextResponse.json(
        { error: "Invalid webhook payload - missing bot ID" },
        { status: 400 }
      );
    }

    const eventType = body.event || body.event_type || body.type || "status_update";
    const rawStatus =
      body.status?.code ||
      body.status ||
      body.data?.status ||
      eventType;

    const updateData: Record<string, unknown> = {
      bot_status: typeof rawStatus === "string" ? rawStatus : JSON.stringify(rawStatus),
    };

    // Check for recording MP4 URL
    const mp4Url = body.mp4 || body.bot?.mp4 || body.data?.mp4;
    if (mp4Url) {
      updateData.recording_url = mp4Url;
      updateData.recording_status = "done";
    }

    // Check for transcript data/url
    const transcript = body.transcript || body.bot?.transcript || body.data?.transcript;
    if (transcript) {
      updateData.transcript_url = typeof transcript === "string" ? transcript : JSON.stringify(transcript);
      updateData.transcript_status = "done";
    }

    // Update Supabase
    const { error } = await supabase
      .from("bots")
      .update(updateData)
      .eq("id", botId);

    if (error) {
      console.error("Supabase webhook update error:", error);
      return NextResponse.json(
        { error: "Failed to update bot in Supabase", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bot_id: botId,
      event: eventType,
      updated_fields: updateData,
    });
  } catch (error) {
    console.error("Webhook route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}