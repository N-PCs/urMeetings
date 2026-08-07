import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_id = searchParams.get("bot_id");

    if (!bot_id) {
      return NextResponse.json(
        { error: "Missing required query parameter: bot_id" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MEETING_BAAS_API_KEY;
    const baseUrl = process.env.MEETING_BAAS_BASE_URL || "https://api.meetingbaas.com";

    if (!apiKey) {
      return NextResponse.json(
        { error: "MEETING_BAAS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Call Meeting Baas API to fetch bot details
    const baasResponse = await fetch(`${baseUrl}/v2/bots/${bot_id}`, {
      method: "GET",
      headers: {
        "x-meeting-baas-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!baasResponse.ok) {
      const errorText = await baasResponse.text();
      return NextResponse.json(
        { error: "Failed to fetch bot from Meeting Baas", details: errorText },
        { status: baasResponse.status }
      );
    }

    const baasData = await baasResponse.json();
    const botInfo = baasData.bot_data?.bot || baasData.bot || baasData;

    // Extract recording and transcript URLs if available
    const recordingUrl = botInfo.mp4 || botInfo.recording_url || null;
    const transcriptUrl = botInfo.transcript || botInfo.transcript_url || null;
    const status = botInfo.status || baasData.status || "in_call";

    // Prepare Supabase update payload
    const updateData: Record<string, any> = {
      bot_status: status,
    };

    if (recordingUrl) {
      updateData.recording_url = recordingUrl;
      updateData.recording_status = "done";
    }

    if (transcriptUrl) {
      updateData.transcript_url = typeof transcriptUrl === "string" ? transcriptUrl : JSON.stringify(transcriptUrl);
      updateData.transcript_status = "done";
    }

    const { data, error } = await supabase
      .from("bots")
      .update(updateData)
      .eq("id", bot_id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error updating fetched bot:", error);
    }

    return NextResponse.json({
      success: true,
      bot_data: data || updateData,
      meeting_baas_data: baasData,
      recording_url: recordingUrl,
      transcript_url: transcriptUrl,
    });
  } catch (error) {
    console.error("Fetch bot error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}