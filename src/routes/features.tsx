import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/marketing-nav";
import { Radio, StickyNote, Sparkles, Search, Lock, Zap, KeyRound, Server } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — urMeetings" },
      {
        name: "description",
        content:
          "Live transcription, instant AI summaries, action items, and cross-meeting Q&A. All free to start.",
      },
      { property: "og:title", content: "Features — urMeetings" },
      { property: "og:description", content: "Everything urMeetings does for your meetings." },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  {
    icon: Radio,
    bg: "bg-pink",
    title: "Live capture",
    body: "Browser-native Web Speech API. Nothing leaves your device until you save.",
  },
  {
    icon: StickyNote,
    bg: "bg-yellow",
    title: "Instant notes",
    body: "Google Gemini turns raw transcripts into tight summaries, decisions, and action items.",
  },
  {
    icon: Sparkles,
    bg: "bg-mint",
    title: "Ask anything",
    body: "Query across every meeting you've saved. Cites the meetings it used.",
  },
  {
    icon: Search,
    bg: "bg-violet",
    title: "Full-text search",
    body: "Postgres FTS across titles, summaries, and transcripts. Fast, no embeddings needed.",
  },
  {
    icon: Lock,
    bg: "bg-pink",
    title: "Your data, your rules",
    body: "Runs on your own Supabase project. Row-level security. Only you can read your meetings.",
  },
  {
    icon: Zap,
    bg: "bg-yellow",
    title: "Guest mode",
    body: "Try recording without signing up. Sign in only when you want to save.",
  },
  {
    icon: KeyRound,
    bg: "bg-mint",
    title: "Bring your own keys",
    body: "One Gemini key + one Supabase project. Both free tiers. No middleman, no surprise bills.",
  },
  {
    icon: Server,
    bg: "bg-violet",
    title: "Deploy anywhere",
    body: "Ships with a Dockerfile and vercel.json. Cloud Run, Vercel, Fly, your VPS — you pick.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full ink-border bg-mint px-3 py-1 text-xs font-bold pop-sm">
            <Sparkles className="h-3.5 w-3.5" /> Features
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
            Everything you need,
            <br />
            <span className="inline-block rotate-[-1deg] rounded-2xl ink-border bg-yellow px-3 pb-1 pop">
              nothing you don't.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Built for humans who are tired of taking notes during meetings.
          </p>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl ink-border bg-card p-5 pop">
              <span
                className={`inline-grid h-11 w-11 place-items-center rounded-xl ink-border ${f.bg}`}
              >
                <f.icon className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <h3 className="mt-4 text-xl font-black">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
