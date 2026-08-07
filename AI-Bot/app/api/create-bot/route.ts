import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_url, bot_name } = body;

    if (!meeting_url || !bot_name) {
      return NextResponse.json(
        { error: "Missing required fields: meeting_url, bot_name" },
        { status: 400 }
      );
    }

    // Get webpage URL from environment variables
    const webpage_url = process.env.WEBPAGE_URL;
    if (!webpage_url) {
      return NextResponse.json(
        { error: "WEBPAGE_URL not configured in environment variables" },
        { status: 500 }
      );
    }

    // Call Recall AI's create bot endpoint
    const recallResponse = await fetch(
      `${process.env.RECALL_AI_BASE_URL}/api/v1/bot`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.RECALL_AI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_url,
          bot_name,
          output_media: {
            screenshare: {
              kind: "webpage",
              config: {
                url: webpage_url,
              },
            },
          },
          variant: {
            zoom: "web_4_core",
            google_meet: "web_4_core",
            microsoft_teams: "web_4_core",
          },
          recording_config: {
            transcript: {
              provider: {
                recallai_streaming: {
                  language_code: "auto",
                  mode: "prioritize_accuracy",
                },
              },
            },
          },
        }),
      }
    );

    if (!recallResponse.ok) {
      const errorText = await recallResponse.text();
      return NextResponse.json(
        { error: "Failed to create bot with Recall AI", details: errorText },
        { status: 500 }
      );
    }

    const recallData = await recallResponse.json();

    // Extract data from Recall AI response
    const botId = recallData.id;
    const platform = recallData.meeting_url?.platform || "unknown";
    const joinAt = recallData.join_at;

    // Store bot information in Supabase
    const { data, error } = await supabase
      .from("bots")
      .insert({
        id: botId,
        name: bot_name,
        meeting_url:
          typeof meeting_url === "string"
            ? meeting_url
            : JSON.stringify(meeting_url),
        meeting_platform: platform,
        bot_status: "creating",
        joined_at: joinAt,
        webpage_url: webpage_url,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to store bot data", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bot_id: botId,
      platform: platform,
      join_at: joinAt,
      data: recallData,
    });
  } catch (error) {
    console.error("Create bot error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
