import { summarizeTranscript } from "@/lib/gemini";
import type { Database } from "@/integrations/supabase/types";

type BotsUpdate = Database["public"]["Tables"]["bots"]["Update"];

const MEETING_BAAS_BASE_URL = process.env.MEETING_BAAS_BASE_URL || "https://api.meetingbaas.com";

type TranscriptSegment = {
  speaker?: string;
  text?: string;
  words?: Array<{ text?: string; word?: string }>;
};

function segmentToText(seg: TranscriptSegment): string {
  const speaker = seg.speaker ? `${seg.speaker}: ` : "";
  if (seg.text) return `${speaker}${seg.text}`;
  if (Array.isArray(seg.words)) {
    const words = seg.words
      .map((w) => w.text ?? w.word ?? "")
      .join(" ")
      .trim();
    return words ? `${speaker}${words}` : "";
  }
  return "";
}

// Some transcription JSON wraps the segments in an object (v2 output
// transcription, v1 meeting_data, ...). Try to unwrap to an array.
function unwrapTranscript(transcript: unknown): unknown {
  if (Array.isArray(transcript)) return transcript;
  if (transcript && typeof transcript === "object") {
    const obj = transcript as Record<string, unknown>;
    for (const key of ["transcripts", "transcription", "segments", "data", "text", "utterances"]) {
      const value = obj[key];
      if (Array.isArray(value) || typeof value === "string") return value;
    }
  }
  return transcript;
}

export function transcriptToText(transcript: unknown): string {
  const normalized = unwrapTranscript(transcript);
  if (typeof normalized === "string") return normalized.trim();
  if (Array.isArray(normalized)) {
    return normalized
      .map((seg) => segmentToText(seg as TranscriptSegment))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

async function fetchTranscriptFromUrl(url: string): Promise<unknown> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

type FetchedData = {
  transcript?: unknown;
  mp4?: string;
  status?: string;
  speakers?: unknown;
};

export async function fetchMeetingData(botId: string): Promise<FetchedData> {
  const apiKey = process.env.MEETING_BAAS_API_KEY;
  if (!apiKey) return {};
  const headers = {
    "x-meeting-baas-api-key": apiKey,
    "Content-Type": "application/json",
  };

  // v1: /bots/meeting_data?bot_id= returns bot_data.transcripts + mp4
  try {
    const v1 = await fetch(
      `${MEETING_BAAS_BASE_URL}/bots/meeting_data?bot_id=${encodeURIComponent(botId)}`,
      { headers },
    );
    if (v1.ok) {
      const data = (await v1.json()) as {
        mp4?: string;
        bot_data?: { bot?: { status?: string; is_stopped?: boolean }; transcripts?: unknown };
      };
      const transcripts = data.bot_data?.transcripts;
      if (transcripts) return { transcript: transcripts, mp4: data.mp4 };
    }
  } catch {
    // fall through to v2
  }

  // v2: /v2/bots/{id} returns data.transcription (URL to JSON) + data.recording/video
  try {
    const v2 = await fetch(`${MEETING_BAAS_BASE_URL}/v2/bots/${encodeURIComponent(botId)}`, {
      headers,
    });
    if (v2.ok) {
      const json = (await v2.json()) as {
        data?: {
          status?: string;
          video?: string;
          audio?: string;
          recording?: string;
          transcription?: string;
          speakers?: unknown;
        };
      };
      const d = json.data ?? {};
      let transcript: unknown = d.transcription;
      if (typeof transcript === "string") {
        const parsed = await fetchTranscriptFromUrl(transcript);
        if (parsed) transcript = parsed;
      }
      return {
        transcript,
        mp4: d.recording ?? d.video ?? d.audio,
        status: d.status,
        speakers: d.speakers,
      };
    }
  } catch {
    // ignore
  }

  return {};
}

export type BotDataInput = {
  botId: string;
  transcriptText?: string;
  mp4?: string;
  speakers?: unknown;
  status?: string;
};

// Shared persistence: updates the bots row, generates the executive summary
// via Gemini, and mirrors the result into the meetings table.
export async function saveBotData(input: BotDataInput): Promise<void> {
  const { botId, transcriptText, mp4, speakers, status } = input;

  const update: Record<string, unknown> = {};
  if (mp4) {
    update.recording_url = mp4;
    update.recording_status = "done";
  }
  if (transcriptText) {
    update.transcript = transcriptText.slice(0, 200000);
    update.transcript_status = "done";
    update.bot_status = "done";
  }
  if (speakers) update.speakers = speakers;
  if (status) update.bot_status = status;

  // Service-role client bypasses RLS — loaded lazily so this module stays server-only.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: botRow, error } = await supabaseAdmin
    .from("bots")
    .update(update as unknown as BotsUpdate)
    .eq("id", botId)
    .select("id,user_id,name,meeting_platform,meeting_id,title")
    .maybeSingle();

  if (error) {
    console.error("[bot-webhook] failed to update bot row:", error.message);
    return;
  }

  if (!botRow) {
    console.warn("[bot-webhook] no matching bot row for", botId, "- creating placeholder");
    await supabaseAdmin
      .from("bots")
      .upsert(
        {
          id: botId,
          user_id: undefined,
          name: "urBrief",
          bot_status: status ?? "done",
          ...(transcriptText ? { transcript: transcriptText.slice(0, 200000) } : {}),
        },
        { onConflict: "id" },
      );
    return;
  }

  if (!transcriptText) return;

  try {
    const summary = await summarizeTranscript(transcriptText);
    const next: BotsUpdate = {
      title: summary.title,
      summary: summary.summary,
      action_items: summary.action_items,
    };

    const meetingRecord = {
      user_id: botRow.user_id,
      title: summary.title,
      source: "google_meet",
      transcript: transcriptText.slice(0, 200000),
      summary: summary.summary,
      action_items: summary.action_items,
    };

    if (botRow.meeting_id) {
      const { error: meetingErr } = await supabaseAdmin
        .from("meetings")
        .update(meetingRecord)
        .eq("id", botRow.meeting_id);
      if (meetingErr) console.error("[bot-webhook] meeting update error:", meetingErr.message);
    } else {
      const { data: meetingRow, error: meetingErr } = await supabaseAdmin
        .from("meetings")
        .insert(meetingRecord)
        .select("id")
        .single();
      if (meetingErr) {
        console.error("[bot-webhook] meeting insert error:", meetingErr.message);
      } else {
        next.meeting_id = meetingRow.id;
      }
    }

    const { error: summaryErr } = await supabaseAdmin.from("bots").update(next).eq("id", botId);
    if (summaryErr) console.error("[bot-webhook] summary save error:", summaryErr.message);
  } catch (err) {
    console.error("[bot-webhook] summary generation failed:", err);
  }
}

// Pull a bot's data straight from Meeting BaaS and persist transcript + summary.
// Used as a manual "Sync" from the dashboard and as a webhook fallback.
export async function syncBotFromMeetingBaas(botId: string): Promise<{ ok: boolean; reason?: string }> {
  const data = await fetchMeetingData(botId);
  if (!data.transcript) {
    return { ok: false, reason: "transcript not ready yet" };
  }
  const transcriptText = transcriptToText(data.transcript);
  if (!transcriptText) {
    return { ok: false, reason: "no transcript text found" };
  }
  await saveBotData({
    botId,
    transcriptText,
    mp4: data.mp4,
    speakers: data.speakers,
    status: data.status ?? "done",
  });
  return { ok: true };
}

export type WebhookResult = { ok: boolean; reason?: string };

type NestedRecord = { [key: string]: unknown };

function statusCode(value: unknown): unknown {
  if (value && typeof value === "object" && "code" in value) {
    return (value as NestedRecord).code;
  }
  return value;
}

function isFinalEvent(event: string, status: string): boolean {
  return (
    /complete|transcript|ended|finished|done|call_ended|stopped/i.test(event) ||
    /complete|completed|done|ended|call_ended|stopped/i.test(status)
  );
}

export async function handleMeetingBaasWebhook(payload: unknown): Promise<WebhookResult> {
  const body = (payload ?? {}) as NestedRecord;
  const data = (body.data ?? {}) as NestedRecord;
  const bot = (data.bot ?? body.bot ?? {}) as NestedRecord;

  const event = String(body.event || body.event_type || body.type || data.event || "status_update");
  const botId = data.bot_id || body.bot_id || bot.id;

  if (typeof botId !== "string" || !botId) {
    return { ok: false, reason: "missing bot_id" };
  }

  // v2 sends data.transcription (URL to the transcript JSON) + data.recording;
  // v1 sends data.transcript (inline) + data.mp4.
  const inlineTranscript = data.transcript || body.transcript || bot.transcript;
  const transcriptionUrl = data.transcription || body.transcription || bot.transcription;
  const mp4 = data.recording || data.mp4 || body.recording || body.mp4 || bot.recording || bot.mp4;
  const speakers = data.speakers || bot.speakers || body.speakers;
  const rawStatus = statusCode(data.status) || statusCode(body.status) || bot.status || event;
  const status = typeof rawStatus === "string" ? rawStatus : "status_update";
  const errorMessage =
    data.error || body.error || data.message || body.message || bot.errors || undefined;

  const final = isFinalEvent(event, status);

  let transcript = inlineTranscript;
  if (typeof transcriptionUrl === "string" && transcriptionUrl.startsWith("http")) {
    const parsed = await fetchTranscriptFromUrl(transcriptionUrl);
    if (parsed) transcript = parsed;
  }

  let mp4Url: string | undefined = typeof mp4 === "string" ? mp4 : undefined;
  let speakersData: unknown = speakers;
  let resolvedStatus: string | undefined;

  // Transcript not in the payload — pull it from Meeting BaaS directly.
  if (!transcript && (final || /transcription/i.test(event))) {
    const fetched = await fetchMeetingData(botId);
    transcript = fetched.transcript ?? transcript;
    mp4Url = fetched.mp4 ?? mp4Url;
    speakersData = fetched.speakers ?? speakersData;
    resolvedStatus = fetched.status;
  }

  const transcriptText = transcriptToText(transcript);
  if (errorMessage) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("bots")
      .update({
        bot_status: "failed",
        error_message: String(errorMessage).slice(0, 2000),
      })
      .eq("id", botId);
    return { ok: true };
  }

  await saveBotData({
    botId,
    transcriptText,
    mp4: mp4Url,
    speakers: speakersData,
    status: transcriptText ? "done" : resolvedStatus ?? status,
  });

  return { ok: true };
}
