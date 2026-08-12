type GeminiMessage = { role: "system" | "user"; content: string };

export async function callGemini(messages: GeminiMessage[]): Promise<string> {
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

export async function summarizeTranscript(
  transcript: string,
  explicitTitle?: string,
): Promise<Summary> {
  const trimmed = transcript.slice(0, 25000);
  let parsed: Summary | null = null;
  try {
    const raw = await callGemini([
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
