import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, Sparkles, StickyNote, Zap, MessageSquare, Cpu, ShieldCheck, MousePointer2, Quote } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { HeroCallAnimation } from "@/components/hero-call-animation";
import { Parallax, ScrollDecor } from "@/components/parallax";
import { Sticker, SquigglyArrow, UnderlineSquiggle } from "@/components/sticker";
import { Marquee } from "@/components/marquee";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="relative py-10 md:py-16">
          <ScrollDecor speed={0.35} className="pointer-events-none absolute -left-4 top-2 hidden md:block">
            <span className="block h-10 w-10 rotate-12 rounded-lg ink-border bg-pink" />
          </ScrollDecor>
          <ScrollDecor speed={0.6} className="pointer-events-none absolute right-6 top-0 hidden md:block">
            <span className="block h-8 w-8 rounded-full ink-border bg-mint" />
          </ScrollDecor>
          <ScrollDecor speed={0.25} className="pointer-events-none absolute -right-2 bottom-0 hidden md:block">
            <span className="block h-12 w-12 -rotate-6 rounded-lg ink-border bg-violet" />
          </ScrollDecor>

          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-8">
            <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full ink-border bg-yellow px-3 py-1 text-xs font-bold pop-sm">
              <Zap className="h-3.5 w-3.5" /> 100% free · Self-hosted · No card needed
            </div>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              Meeting notes that
              <br />
              <span className="relative inline-block rotate-[-2deg] rounded-2xl ink-border bg-pink px-3 pb-1 pop">
                actually help.
                <UnderlineSquiggle className="absolute -bottom-2 left-2 h-3 w-[92%]" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Hit record. We transcribe in your browser, then turn it into a
              tight summary, action items, and a Q&amp;A you can search across
              every meeting you've ever had. Runs on your own Supabase +
              Google Gemini keys — free tiers, no middleman.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/live"
                className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-violet px-5 text-base font-bold text-primary-foreground no-underline pop"
              >
                <Radio className="h-4 w-4" /> Try it now — no signup
              </Link>
              <Link
                to="/auth"
                className="inline-flex h-12 items-center rounded-xl ink-border bg-card px-5 text-base font-bold no-underline pop"
              >
                Create free account
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Sticker tone="mint" rotate={-4}>★ Zero cost</Sticker>
              <Sticker tone="violet" rotate={3}>Your keys</Sticker>
              <Sticker tone="pink" rotate={-2}>Ships in 5 min</Sticker>
            </div>
            </div>

            <Parallax speed={0.35} className="pt-4 md:pt-0">
              <HeroCallAnimation />
            </Parallax>
          </div>
        </section>

        {/* Marquee strip */}
        <section className="pb-10">
          <Marquee
            speed={40}
            items={[
              <span key="1"><Radio className="mr-1 inline h-4 w-4" strokeWidth={2.5} /> Live browser transcription</span>,
              <span key="2"><Cpu className="mr-1 inline h-4 w-4" strokeWidth={2.5} /> Gemini 2.5 Flash</span>,
              <span key="3"><ShieldCheck className="mr-1 inline h-4 w-4" strokeWidth={2.5} /> Row-level security</span>,
              <span key="4"><MessageSquare className="mr-1 inline h-4 w-4" strokeWidth={2.5} /> Ask across every meeting</span>,
              <span key="5">Self-hosted</span>,
              <span key="6">Docker · Vercel · Cloud Run</span>,
              <span key="7">Web Speech API</span>,
              <span key="8">Postgres FTS</span>,
            ]}
          />
        </section>

        {/* Feature cards */}
        <section className="relative pb-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Sticker tone="yellow" rotate={-3}>What you get</Sticker>
              <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
                Three tricks. <span className="text-muted-foreground">Zero fluff.</span>
              </h2>
            </div>
            <SquigglyArrow className="hidden h-16 w-24 -rotate-12 md:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          {([
            {
              icon: Radio,
              bg: "bg-pink",
              title: "Live capture",
              body: "Your browser does the transcribing. Nothing uploaded until you say so.",
            },
            {
              icon: StickyNote,
              bg: "bg-yellow",
              title: "Instant notes",
              body: "Summary, decisions, and action items in seconds — powered by Google Gemini (your own key).",
            },
            {
              icon: Sparkles,
              bg: "bg-mint",
              title: "Ask anything",
              body: "\"What did we decide about pricing last month?\" — urMeetings knows.",
            },
          ] as const).map((f, i) => (
            <Parallax key={f.title} speed={0.15 + i * 0.15}>
              <div className="rounded-2xl ink-border bg-card p-5 pop">
                <span
                  className={`inline-grid h-11 w-11 place-items-center rounded-xl ink-border ${f.bg}`}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-black">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </Parallax>
          ))}
          </div>
        </section>

        {/* Testimonial / pull-quote */}
        <section className="pb-16">
          <Parallax speed={0.2}>
            <div className="relative mx-auto max-w-3xl rounded-3xl ink-border bg-yellow p-6 pop-lg sm:p-10">
              <Quote className="absolute -left-3 -top-3 h-10 w-10 rounded-xl ink-border bg-card p-2" />
              <p className="text-2xl font-black leading-snug sm:text-3xl">
                "Finally, meeting notes that don't feel like homework."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full ink-border bg-violet text-lg font-black text-primary-foreground">N</span>
                <div>
                  <div className="text-sm font-black">Neel · N-PCs</div>
                  <div className="text-xs font-bold text-muted-foreground">Person who kept forgetting action items</div>
                </div>
              </div>
            </div>
          </Parallax>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <Parallax speed={0.15}>
            <div className="relative overflow-hidden rounded-3xl ink-border bg-violet p-8 text-primary-foreground pop-lg sm:p-12">
              <div className="pointer-events-none absolute inset-0 opacity-30 dotted-bg" />
              <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-black sm:text-4xl">Ready in about 90 seconds.</h2>
                  <p className="mt-2 max-w-lg text-sm font-bold opacity-90">
                    No signup wall, no free trial timer. Hit record and see what urMeetings does with your voice.
                  </p>
                </div>
                <Link
                  to="/live"
                  className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-yellow px-5 text-base font-bold text-foreground no-underline pop"
                >
                  <MousePointer2 className="h-4 w-4" /> Start recording
                </Link>
              </div>
            </div>
          </Parallax>
        </section>

        <footer className="border-t-2 border-ink py-6 text-center text-xs text-muted-foreground">
          <p>Built with love by N-PCs (Neel).</p>
          <p className="mt-1">
            <a href="https://github.com/N-PCs" target="_blank" rel="noreferrer" className="font-bold text-foreground underline underline-offset-4">
              github.com/N-PCs
            </a>
          </p>
          <p className="mt-2">Your recordings live only in your browser until you save them.</p>
        </footer>
      </main>
    </div>
  );
}
