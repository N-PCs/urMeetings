import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav } from "@/components/marketing-nav";
import { Mic, Save, Search, Rocket } from "lucide-react";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial — urMeetings" },
      { name: "description", content: "Get up and running with urMeetings in 4 steps: record, save, search, ask." },
      { property: "og:title", content: "Tutorial — urMeetings" },
      { property: "og:description", content: "Four steps from zero to your first AI-summarized meeting." },
    ],
  }),
  component: TutorialPage,
});

const STEPS = [
  { icon: Mic, bg: "bg-pink", title: "1. Hit record", body: "Open /live, grant mic access, and start talking. Your browser transcribes locally — nothing uploads yet." },
  { icon: Save, bg: "bg-yellow", title: "2. Save & summarize", body: "Sign in (email works), then hit Save. Google Gemini writes a title, a summary, and pulls out action items — called directly from your server with your own key." },
  { icon: Search, bg: "bg-mint", title: "3. Search past notes", body: "Open /notes and search across every saved meeting with Postgres full-text search." },
  { icon: Rocket, bg: "bg-violet", title: "4. Ask anything", body: "Head to /ask and ask questions like \"what did we decide about pricing last month?\" — citations included." },
];

function TutorialPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
        <div className="inline-flex items-center gap-2 rounded-full ink-border bg-pink px-3 py-1 text-xs font-bold pop-sm">
          <Rocket className="h-3.5 w-3.5" /> Tutorial
        </div>
        <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
          Zero to summary
          <br />
          <span className="inline-block rotate-[-1deg] rounded-2xl ink-border bg-mint px-3 pb-1 pop">in under a minute.</span>
        </h1>

        <ol className="mt-12 space-y-4">
          {STEPS.map((s) => (
            <li key={s.title} className="flex gap-4 rounded-2xl ink-border bg-card p-5 pop">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ink-border ${s.bg}`}>
                <s.icon className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div>
                <h3 className="text-xl font-black">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/live" className="inline-flex h-12 items-center rounded-xl ink-border bg-violet px-5 text-base font-bold text-primary-foreground no-underline pop">
            Try it now
          </Link>
          <Link to="/docs" className="inline-flex h-12 items-center rounded-xl ink-border bg-card px-5 text-base font-bold no-underline pop">
            Read the docs
          </Link>
        </div>

        <div className="mt-10 rounded-2xl ink-border bg-mint p-5 pop">
          <h3 className="text-lg font-black">Self-hosting?</h3>
          <p className="mt-2 text-sm">
            Grab a free Supabase project and a free Gemini key from{" "}
            <a className="font-bold underline underline-offset-4" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">AI Studio</a>, drop them into{" "}
            <code className="rounded bg-background/60 px-1 font-mono text-xs">.env.local</code>, and run{" "}
            <code className="rounded bg-background/60 px-1 font-mono text-xs">bun run dev</code>. Full instructions in the repo's{" "}
            <code className="rounded bg-background/60 px-1 font-mono text-xs">SETUP.md</code>.
          </p>
        </div>
      </main>
    </div>
  );
}