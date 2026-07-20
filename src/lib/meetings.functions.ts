import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({
  transcript: z.string().min(1).max(200000),
  source: z.enum(["live", "manual"]).default("live"),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
  title: z.string().max(200).optional(),
});

type LovableAIMessage = { role: "system" | "user"; content: string };

async function callLovableAI(messages: LovableAIMessage[]): Promise<string> {
  // Direct call to Google Gemini API (AI Studio free tier).
  // Get your key at https://aistudio.google.com/app/apikey and set it as GEMINI_API_KEY.
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing on server. See SETUP.md.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Gemini's REST shape: merge system messages into a system_instruction,
  // and send user turns as `contents`.
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role === "user")
    .map((m) => ({ role: "user", parts: [{ text: m.content }] }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(systemText
        ? { system_instruction: { parts: [{ text: systemText }] } }
        : {}),
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429)
      throw new Error("Gemini rate limit hit. Wait a minute and try again.");
    if (res.status === 403)
      throw new Error("Gemini rejected the request (403). Check GEMINI_API_KEY.");
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  );
}

function extractJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // Strip ```json fences if present.
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find first { ... } block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

type Summary = {
  title: string;
  summary: string;
  action_items: string[];
};

async function summarizeTranscript(transcript: string, fallbackTitle?: string): Promise<Summary> {
  const trimmed = transcript.slice(0, 25000);
  const raw = await callLovableAI([
    {
      role: "system",
      content:
        "You summarize meeting transcripts. Reply with ONLY valid JSON, no markdown fences, matching this shape: " +
        '{"title": string, "summary": string, "action_items": string[]}. ' +
        "Title: max 8 words, specific to the meeting content. " +
        "Summary: 3-5 sentences of what was actually discussed and decided. " +
        "Action items: concrete next steps as short strings. Return [] if none.",
    },
    { role: "user", content: trimmed },
  ]);
  const parsed = extractJSON<Summary>(raw);
  if (!parsed) {
    return {
      title: fallbackTitle ?? "Untitled meeting",
      summary: raw.slice(0, 500) || "Summary unavailable.",
      action_items: [],
    };
  }
  return {
    title: (parsed.title || fallbackTitle || "Untitled meeting").slice(0, 200),
    summary: (parsed.summary || "").slice(0, 4000),
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items.filter((x) => typeof x === "string").slice(0, 20)
      : [],
  };
}

export const saveMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const summary = await summarizeTranscript(data.transcript, data.title);
    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        user_id: context.userId,
        title: summary.title,
        source: data.source,
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
      .select("id,user_id,title,source,transcript,summary,action_items,duration_seconds,started_at,created_at,updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("meetings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

    const answer = await callLovableAI([
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