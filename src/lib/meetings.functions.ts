import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGemini, summarizeTranscript } from "@/lib/gemini";

const SaveInput = z.object({
  transcript: z.string().min(1).max(200000),
  source: z.enum(["live", "manual", "google_meet", "bot"]).default("live"),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 24)
    .optional(),
  title: z.string().max(200).optional(),
});

export const saveMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const summary = await summarizeTranscript(data.transcript, data.title);
    const dbSource = data.source === "bot" ? "google_meet" : data.source;
    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        user_id: context.userId,
        title: summary.title,
        source: dbSource,
        transcript: data.transcript,
        summary: summary.summary,
        action_items: summary.action_items,
        duration_seconds: data.durationSeconds ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, ...summary };
  });

export const listMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meetings")
      .select("id,title,source,summary,action_items,duration_seconds,started_at,created_at")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMeeting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meetings")
      .select(
        "id,user_id,title,source,transcript,summary,action_items,duration_seconds,started_at,created_at,updated_at",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meetings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().max(200).optional(),
  summary: z.string().max(4000).optional(),
  transcript: z.string().max(200000).optional(),
  action_items: z.array(z.string()).max(20).optional(),
});

export const updateMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meetings")
      .update({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.transcript !== undefined && { transcript: data.transcript }),
        ...(data.action_items !== undefined && { action_items: data.action_items }),
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const searchMeetings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    if (!q) {
      const { data: rows } = await context.supabase
        .from("meetings")
        .select("id,title,summary,started_at")
        .eq("user_id", context.userId)
        .order("started_at", { ascending: false })
        .limit(50);
      return rows ?? [];
    }
    // Simple text search via ilike on title+summary — reliable across
    // websearch_to_tsquery quirks. FTS index still helps ordering later.
    const like = `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;
    const { data: rows, error } = await context.supabase
      .from("meetings")
      .select("id,title,summary,started_at")
      .eq("user_id", context.userId)
      .or(`title.ilike.${like},summary.ilike.${like},transcript.ilike.${like}`)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const AskInput = z.object({ query: z.string().min(1).max(1000) });

export const askMeetingNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    // Pull the most recent meetings — summary only, budgeted.
    const { data: meetings, error } = await context.supabase
      .from("meetings")
      .select("id,title,summary,action_items,started_at")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    if (!meetings || meetings.length === 0) {
      return {
        answer:
          "You don't have any saved meetings yet. Record or save a meeting first, then ask me about it.",
        citations: [] as { meeting_id: string; title: string }[],
      };
    }

    // Build context with a rough token budget (~8k chars).
    const parts: string[] = [];
    let used = 0;
    const BUDGET = 8000;
    const citations: { meeting_id: string; title: string }[] = [];
    for (const m of meetings) {
      const chunk =
        `--- Meeting: ${m.title} (${new Date(m.started_at).toDateString()}) ---\n` +
        `Summary: ${m.summary ?? "(none)"}\n` +
        (Array.isArray(m.action_items) && m.action_items.length
          ? `Action items: ${(m.action_items as string[]).join("; ")}\n`
          : "");
      if (used + chunk.length > BUDGET) break;
      parts.push(chunk);
      used += chunk.length;
      citations.push({ meeting_id: m.id, title: m.title });
    }

    const answer = await callGemini([
      {
        role: "system",
        content:
          "You answer questions about the user's meeting notes. Use only the CONTEXT below. " +
          "If the answer isn't in the context, say so plainly. Keep answers concise and cite meetings by title.",
      },
      {
        role: "user",
        content: `CONTEXT:\n${parts.join("\n")}\n\nQUESTION: ${data.query}`,
      },
    ]);

    return { answer: answer.trim(), citations };
  });

const CreateRecallBotInput = z.object({
  meetingUrl: z.string().min(5),
  botName: z.string().optional().default("urBrief"),
});

export const createRecallBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateRecallBotInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.MEETING_BAAS_API_KEY;
    const baseUrl = process.env.MEETING_BAAS_BASE_URL || "https://api.meetingbaas.com";
    const webpageUrl = process.env.WEBPAGE_URL || "http://localhost:3000";

    if (!apiKey) {
      throw new Error(
        "MEETING_BAAS_API_KEY is not configured in .env.local. Please set a valid Meeting Baas token.",
      );
    }

    const baasResponse = await fetch(`${baseUrl}/v2/bots`, {
      method: "POST",
      headers: {
        "x-meeting-baas-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: data.meetingUrl,
        bot_name: data.botName,
        recording_mode: "speaker_view",
        transcription_enabled: true,
        transcription_config: { provider: "gladia" },
        webhook_url: `${webpageUrl}/api/webhook`,
      }),
    });

    if (!baasResponse.ok) {
      const errorText = await baasResponse.text().catch(() => "");
      throw new Error(`Meeting Baas error (${baasResponse.status}): ${errorText.slice(0, 200)}`);
    }

    const baasData = (await baasResponse.json()) as {
      data?: { bot_id?: string };
      bot_id?: string;
      id?: string;
    };
    const botId = baasData.data?.bot_id || baasData.bot_id || baasData.id;
    if (!botId) {
      throw new Error(
        `Meeting Baas did not return a bot_id: ${JSON.stringify(baasData).slice(0, 200)}`,
      );
    }

    let platform = "unknown";
    if (data.meetingUrl.includes("google.com") || data.meetingUrl.includes("meet.google")) {
      platform = "google_meet";
    } else if (data.meetingUrl.includes("zoom.us")) {
      platform = "zoom";
    } else if (data.meetingUrl.includes("teams")) {
      platform = "microsoft_teams";
    }

    const joinAt = new Date().toISOString();

    const { error: dbError } = await context.supabase.from("bots").insert({
      id: botId,
      name: data.botName,
      meeting_url: data.meetingUrl,
      meeting_platform: platform,
      bot_status: "creating",
      joined_at: joinAt,
      webpage_url: webpageUrl,
      user_id: context.userId,
    });

    if (dbError) {
      console.error("Supabase insert error for bot:", dbError);
    }

    return {
      success: true,
      bot_id: botId,
      platform,
      join_at: joinAt,
      data: baasData,
    };
  });

export const listRecallBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not list bots from Supabase (table might not exist yet):", error.message);
      return [];
    }
    return data ?? [];
  });
