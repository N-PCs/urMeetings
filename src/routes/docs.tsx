import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/marketing-nav";
import { Book, Key, Database, Cpu, Rocket } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — urMeetings" },
      { name: "description", content: "How urMeetings is built, which API keys you need, and how to self-host." },
      { property: "og:title", content: "Docs — urMeetings" },
      { property: "og:description", content: "Architecture, API keys, and self-hosting docs for urMeetings." },
    ],
  }),
  component: DocsPage,
});

const KEYS = [
  {
    name: "GEMINI_API_KEY",
    where: "https://aistudio.google.com/app/apikey — click 'Create API key'",
    what: "Powers summaries and the Ask page. Free tier: ~15 requests/min on gemini-2.5-flash. No credit card required.",
    required: "Required",
    tone: "bg-mint",
  },
  {
    name: "SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY",
    where: "supabase.com → your project → Settings → API. Also set VITE_ mirrors for the browser.",
    what: "Your database + auth. Free tier gives you 500 MB and 50k monthly active users. Publishable key is safe to ship to the browser; RLS keeps your data private.",
    required: "Required",
    tone: "bg-mint",
  },
  {
    name: "NITRO_PRESET",
    where: "Set in your host's env vars. node-server for Cloud Run/Docker, vercel for Vercel.",
    what: "Tells the build which deploy target to compile for. Defaults to node-server if unset.",
    required: "Recommended",
    tone: "bg-violet",
  },
  {
    name: "GOOGLE_OAUTH_CLIENT_ID + SECRET",
    where: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web)",
    what: "Only if you want to sync historical Google Meet transcripts. Requires a Google Workspace account — personal @gmail can't access Meet's transcript API.",
    required: "Optional",
    tone: "bg-yellow",
  },
];

const DEPLOY = [
  {
    tone: "bg-mint",
    title: "Vercel (easiest)",
    body: "Push to GitHub, import at vercel.com/new, paste your env vars, deploy. Free Hobby tier: 100 GB bandwidth/mo. vercel.json is already in the repo.",
  },
  {
    tone: "bg-yellow",
    title: "Google Cloud Run",
    body: "gcloud builds submit --tag gcr.io/PROJECT/urmeetings && gcloud run deploy. Dockerfile is included. Free tier: 2M requests/mo.",
  },
  {
    tone: "bg-pink",
    title: "Any Docker host",
    body: "docker build -t urmeetings . && docker run -p 8080:8080 --env-file .env.local urmeetings. Works on Fly, Railway, your VPS.",
  },
];

function DocsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
        <div className="inline-flex items-center gap-2 rounded-full ink-border bg-violet px-3 py-1 text-xs font-bold text-primary-foreground pop-sm">
          <Book className="h-3.5 w-3.5" /> Docs
        </div>
        <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
          The whole thing,
          <br />
          <span className="inline-block rotate-[-1deg] rounded-2xl ink-border bg-pink px-3 pb-1 pop">on one page.</span>
        </h1>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Cpu className="h-6 w-6" strokeWidth={2.5} /> Stack
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Framework", "TanStack Start + Vite + React 19"],
              ["Styling", "Tailwind v4 + shadcn/ui"],
              ["Auth + DB", "Supabase (your own project, free tier)"],
              ["AI", "Google Gemini 2.5 Flash — direct API, your own key"],
              ["Live STT", "Browser Web Speech API"],
              ["Search", "Postgres full-text search (tsvector)"],
              ["Hosting", "Vercel / Cloud Run / any Docker host"],
              ["Lovable services", "None. Zero. Nada."],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl ink-border bg-card p-4 pop-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-1 font-bold">{v}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Key className="h-6 w-6" strokeWidth={2.5} /> API keys you need
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Short version: <span className="font-bold text-foreground">two free keys</span> — one from Google AI Studio, one from Supabase. Both take about 90 seconds to grab and neither asks for a credit card. Full walkthrough in{" "}
            <code className="rounded bg-card px-1 font-mono text-xs">SETUP.md</code>.
          </p>
          <div className="mt-6 space-y-4">
            {KEYS.map((k) => (
              <div key={k.name} className="rounded-2xl ink-border bg-card p-5 pop">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md ink-border bg-background px-2 py-1 text-xs font-bold">{k.name}</code>
                  <span className={`rounded-full ink-border ${k.tone} px-2 py-0.5 text-[10px] font-black uppercase tracking-wider`}>
                    {k.required}
                  </span>
                </div>
                <p className="mt-3 text-sm"><span className="font-bold">Where:</span> {k.where}</p>
                <p className="mt-1 text-sm"><span className="font-bold">What:</span> {k.what}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Rocket className="h-6 w-6" strokeWidth={2.5} /> Deploy anywhere
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            One codebase, three targets. Pick whichever free tier you like — the app has no vendor lock-in.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DEPLOY.map((d) => (
              <div key={d.title} className={`rounded-2xl ink-border ${d.tone} p-5 pop`}>
                <h3 className="text-lg font-black">{d.title}</h3>
                <p className="mt-2 text-sm">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Database className="h-6 w-6" strokeWidth={2.5} /> Data model
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">One table, protected by row-level security. Runs in your Supabase project.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="rounded-xl ink-border bg-card p-4 pop-sm">
              <code className="font-bold">meetings</code> — id, user_id, title, source, transcript, summary, action_items (jsonb), duration_seconds, search (tsvector), started_at, created_at, updated_at
            </li>
          </ul>
        </section>

        <footer className="mt-16 border-t-2 border-ink py-6 text-center text-xs text-muted-foreground">
          Built by N-PCs (Neel) ·{" "}
          <a href="https://github.com/N-PCs" target="_blank" rel="noreferrer" className="font-bold text-foreground underline underline-offset-4">github.com/N-PCs</a>
        </footer>
      </main>
    </div>
  );
}