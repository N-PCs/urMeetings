import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bot_id } = body;

    if (!bot_id) {
      return NextResponse.json(
        { error: "Missing required field: bot_id" },
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

    // Call Meeting Baas v2 leave bot endpoint
    const baasResponse = await fetch(`${baseUrl}/v2/bots/${bot_id}/leave`, {
      method: "POST",
      headers: {
        "x-meeting-baas-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!baasResponse.ok && baasResponse.status !== 409) {
      const errorText = await baasResponse.text();
      return NextResponse.json(
        { error: "Failed to remove bot from Meeting Baas call", details: errorText },
        { status: baasResponse.status }
      );
    }

    let baasData = {};
    try {
      baasData = await baasResponse.json();
    } catch {
      // Body may be empty on DELETE
    }

    // Update bot status in Supabase to leaving_call
    const { error } = await supabase
      .from("bots")
      .update({
        bot_status: "leaving_call",
      })
      .eq("id", bot_id);

    if (error) {
      console.warn(`Bot ${bot_id} removed but database update warning:`, error.message);
    }

    return NextResponse.json({
      success: true,
      message: "Bot successfully requested to leave call",
      bot_id: bot_id,
      current_status: "leaving_call",
      meeting_baas_response: baasData,
    });
  } catch (error) {
    console.error("Remove bot error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}