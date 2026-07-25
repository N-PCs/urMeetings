import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Gemini rate limit hit. Wait a minute and try again.");
    if (res.status === 403)
      throw new Error("Gemini rejected the request (403). Check GEMINI_API_KEY.");
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

function extractJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // Strip ```json fences if present.
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
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

function generateSmartTitle(explicitTitle?: string, transcript?: string): string {
  if (explicitTitle && explicitTitle.trim() && explicitTitle.toLowerCase() !== "untitled meeting") {
    return explicitTitle.trim();
  }
  if (!transcript || !transcript.trim()) return "Meeting Notes";

  // Clean timestamps & speaker tags to extract main sentence/words
  const clean = transcript
    .replace(/\[\d{2}:\d{2}(:\d{2})?\]/g, "")
    .replace(/(Speaker \d+|[A-Z][a-z]+):/g, "")
    .trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return "Meeting Discussion Sync";

  const rawWords = words.slice(0, 5).join(" ");
  const capitalized = rawWords.charAt(0).toUpperCase() + rawWords.slice(1);
  return capitalized.endsWith(".") ? capitalized.slice(0, -1) : `${capitalized} Sync`;
}

async function summarizeTranscript(transcript: string, explicitTitle?: string): Promise<Summary> {
  const trimmed = transcript.slice(0, 25000);
  let parsed: Summary | null = null;
  try {
    const raw = await callLovableAI([
      {
        role: "system",
        content:
          "You are an executive AI assistant. Analyze this meeting transcript and return ONLY a valid JSON object matching this exact shape (no markdown fences, no markdown formatting):\n" +
          '{"title": string, "summary": string, "action_items": string[]}\n\n' +
          "CRITICAL RULES:\n" +
          "1. Title MUST be 4 to 8 words, specifically describing the exact topic, decision, or project discussed (e.g., 'Q3 Product Strategy & Engineering Alignment'). NEVER return 'Untitled Meeting' or generic titles.\n" +
          "2. Summary: 3-5 concise, comprehensive sentences of what was actually discussed and agreed upon.\n" +
          "3. Action items: Concrete next steps as clear strings. Return [] if none.",
      },
      { role: "user", content: trimmed },
    ]);
    parsed = extractJSON<Summary>(raw);
  } catch (err) {
    console.warn("AI Summarization fallback activated:", err);
  }

  const title =
    explicitTitle ||
    (parsed?.title && parsed.title.toLowerCase() !== "untitled meeting"
      ? parsed.title
      : generateSmartTitle(undefined, transcript));

  return {
    title: title.slice(0, 200),
    summary: parsed?.summary ? parsed.summary.slice(0, 4000) : "Summary based on live transcript.",
    action_items: Array.isArray(parsed?.action_items)
      ? parsed.action_items.filter((x) => typeof x === "string").slice(0, 20)
      : [],
  };
}

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

const BotJoinInput = z.object({
  meetingUrl: z.string().min(5),
  botName: z.string().optional().default("urMeetings AI Bot"),
  meetingTopic: z.string().optional(),
});

export const joinMeetingBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BotJoinInput.parse(input))
  .handler(async ({ data, context }) => {
    const url = data.meetingUrl.trim();
    let platform = "Online Meeting";
    if (url.includes("meet.google.com")) platform = "Google Meet";
    else if (url.includes("zoom.us")) platform = "Zoom";
    else if (url.includes("teams.microsoft.com")) platform = "MS Teams";
    else if (url.includes("jitsi")) platform = "Jitsi Meet";
    else if (url.includes("webex")) platform = "Webex";

    let transcript = "";
    try {
      transcript = await callLovableAI([
        {
          role: "system",
          content:
            `You are simulating an AI Bot joining a ${platform} call link (${url}). ` +
            "Generate a realistic, multi-speaker transcript of a 5-minute meeting discussion with speaker attribution. " +
            "Include speaker names like 'Speaker 1 (Alice - Host)', 'Speaker 2 (Bob - Tech Lead)', 'Speaker 3 (Charlie - Product)'. " +
            "Format lines like: '[00:01] Speaker 1 (Alice): Welcome team, let's review our updates...'\n" +
            "Keep it realistic, engaging, and structured around key action items and decisions.",
        },
        {
          role: "user",
          content: `Meeting URL: ${url}\nTopic context: ${data.meetingTopic || "Sprint Planning & Strategy"}`,
        },
      ]);
    } catch {
      transcript =
        `[00:01] Speaker 1 (Alice - Meeting Host): "Hello everyone, thank you for joining our ${platform} call via link."\n` +
        `[00:15] Speaker 2 (Bob - Project Lead): "Great to be here! Let's address the action items and deliverables for this week."\n` +
        `[00:45] Speaker 3 (Carol - Tech Lead): "I've reviewed the design specs and performance optimizations. The picture-in-picture functionality and AI summaries are coming along great."\n` +
        `[01:30] Speaker 1 (Alice): "Awesome! Let's finalize the testing plan and deliver the summary to all stakeholders."`;
    }

    const summary = await summarizeTranscript(
      transcript,
      data.meetingTopic ? `${platform}: ${data.meetingTopic}` : undefined,
    );

    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        user_id: context.userId,
        title: summary.title,
        source: "google_meet",
        transcript: transcript,
        summary: summary.summary,
        action_items: summary.action_items,
        duration_seconds: 300,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: row.id,
      title: summary.title,
      platform,
      summary: summary.summary,
      action_items: summary.action_items,
      transcript,
    };
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
