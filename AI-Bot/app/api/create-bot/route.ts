import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_url, bot_name } = body;

    if (!meeting_url || !bot_name) {
      return NextResponse.json(
        { error: "Missing required fields: meeting_url, bot_name" },
        { status: 400 },
      );
    }

    const apiKey = process.env.MEETING_BAAS_API_KEY;
    const baseUrl = process.env.MEETING_BAAS_BASE_URL || "https://api.meetingbaas.com";
    const webpageUrl = process.env.WEBPAGE_URL || "http://localhost:3000";

    if (!apiKey) {
      return NextResponse.json(
        { error: "MEETING_BAAS_API_KEY is not configured in environment variables" },
        { status: 500 },
      );
    }

    // Call Meeting Baas v2 endpoint to dispatch bot
    const baasResponse = await fetch(`${baseUrl}/v2/bots`, {
      method: "POST",
      headers: {
        "x-meeting-baas-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url,
        bot_name: bot_name || "urBrief",
        recording_mode: "speaker_view",
        transcription_enabled: true,
        transcription_config: { provider: "gladia" },
        timeout_config: {
          silence_timeout: 300,
          no_one_joined_timeout: 300,
          waiting_room_timeout: 300,
        },
        webhook_url: `${webpageUrl}/api/webhook`,
      }),
    });

    if (!baasResponse.ok) {
      const errorText = await baasResponse.text();
      return NextResponse.json(
        { error: "Failed to create bot with Meeting Baas", details: errorText },
        { status: baasResponse.status },
      );
    }

    const baasData = await baasResponse.json();

    // Extract bot ID from response (v2 wraps it in data.bot_id)
    const botId = baasData.data?.bot_id || baasData.bot_id || baasData.id;
    if (!botId) {
      return NextResponse.json(
        { error: "Meeting Baas did not return a valid bot_id", details: baasData },
        { status: 500 },
      );
    }

    // Determine platform from URL
    let platform = "unknown";
    if (meeting_url.includes("google.com") || meeting_url.includes("meet.google")) {
      platform = "google_meet";
    } else if (meeting_url.includes("zoom.us")) {
      platform = "zoom";
    } else if (meeting_url.includes("teams")) {
      platform = "microsoft_teams";
    }

    const joinAt = new Date().toISOString();

    // Store bot information in Supabase
    const { data, error } = await supabase
      .from("bots")
      .insert({
        id: botId,
        name: bot_name,
        meeting_url: typeof meeting_url === "string" ? meeting_url : JSON.stringify(meeting_url),
        meeting_platform: platform,
        bot_status: "joining_call",
        joined_at: joinAt,
        webpage_url: webpageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error inserting bot:", error);
      // Still return success if Meeting Baas created the bot
      return NextResponse.json({
        success: true,
        bot_id: botId,
        platform,
        join_at: joinAt,
        data: baasData,
        db_warning: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      bot_id: botId,
      platform,
      join_at: joinAt,
      data: baasData,
      db_data: data,
    });
  } catch (error) {
    console.error("Create bot error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
