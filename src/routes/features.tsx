import { createFileRoute } from "@tanstack/react-router";
import { MarketingNav } from "@/components/marketing-nav";
import {
  Radio,
  StickyNote,
  Sparkles,
  Search,
  Lock,
  Zap,
  KeyRound,
  Server,
  Bot,
  Video,
  MessageSquare,
  CheckCircle2,
  Users,
  Headphones,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — urMeetings" },
      {
        name: "description",
        content:
          "AI bot joins your meetings via link, records, transcribes, and generates organized notes. Works with Google Meet, Zoom, and Teams.",
      },
      { property: "og:title", content: "Features — urMeetings" },
      { property: "og:description", content: "Everything urMeetings does for your meetings." },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  {
    icon: Bot,
    bg: "bg-violet",
    title: "AI Bot joins your meeting",
    body: "Paste any Google Meet, Zoom, or Teams link and our bot joins as a participant. No calendar needed — just the link.",
  },
  {
    icon: Video,
    bg: "bg-pink",
    title: "Auto recording & transcription",
    body: "The bot captures audio the moment it joins and streams it to speech-to-text. Every word is transcribed in real time.",
  },
  {
    icon: StickyNote,
    bg: "bg-yellow",
    title: "Organized meeting notes",
    body: "After the meeting ends, urMeetings generates a full summary, key points, decisions, action items, and an attendee list.",
  },
  {
    icon: CheckCircle2,
    bg: "bg-mint",
    title: "Action items extracted",
    body: "Who promised what is captured automatically. Each action item is saved and can be turned into a ClickUp task instantly.",
  },
  {
    icon: Headphones,
    bg: "bg-violet",
    title: "Full transcript + recording",
    body: "Every spoken sentence is searchable. The complete transcript and audio recording live inside your meeting notes.",
  },
  {
    icon: Sparkles,
    bg: "bg-yellow",
    title: "Ask anything across meetings",
    body: "Query like 'What did Rahul promise?' or 'What are my action items?' — urMeetings searches the transcript and answers instantly.",
  },
  {
    icon: Lock,
    bg: "bg-pink",
    title: "Your data, your rules",
    body: "Runs on your own Supabase project. Row-level security ensures only you can read your meetings and notes.",
  },
  {
    icon: KeyRound,
    bg: "bg-mint",
    title: "Bring your own keys",
    body: "One Gemini key + one Supabase project. Both free tiers. No middleman, no surprise bills, no data leaves your control.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full ink-border bg-violet px-3 py-1 text-xs font-bold pop-sm">
            <Bot className="h-3.5 w-3.5" /> AI Meeting Bot
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
            Drop a link.
            <br />
            <span className="inline-block rotate-[-1deg] rounded-2xl ink-border bg-yellow px-3 pb-1 pop">
              The bot handles the rest.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            urMeetings joins your Google Meet, Zoom, or Teams call as an AI participant,
            records everything, and delivers organized notes — summary, action items, and
            a full searchable transcript — the moment the meeting ends.
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

        {/* How it works */}
        <section className="mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full ink-border bg-mint px-3 py-1 text-xs font-bold pop-sm">
              <Zap className="h-3.5 w-3.5" /> How it works
            </div>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              Three steps. <span className="text-muted-foreground">Full meeting intelligence.</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Video,
                step: "01",
                title: "Drop your meeting link",
                body: "Paste a Google Meet, Zoom, or Teams link into urMeetings. No calendar connection, no setup — just the link.",
              },
              {
                icon: Bot,
                step: "02",
                title: "The AI Bot joins",
                body: "At meeting time, our bot joins as a participant. It announces itself, records audio, and transcribes every word.",
              },
              {
                icon: StickyNote,
                step: "03",
                title: "Get organized notes",
                body: "When the meeting ends, urMeetings delivers a summary, key points, decisions, action items, full transcript, and recording — all inside ClickUp.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl ink-border bg-card p-6 pop">
                <span className="text-xs font-black uppercase tracking-wider text-violet-700">
                  {s.step}
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-xl ink-border bg-violet text-white">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-xl font-black">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison: Why urMeetings */}
        <section className="mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full ink-border bg-yellow px-3 py-1 text-xs font-bold pop-sm">
              <Zap className="h-3.5 w-3.5" /> Why urMeetings
            </div>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              Built for your workflow,
              <br />
              <span className="text-muted-foreground">not the other way around.</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Bot,
                title: "No calendar needed",
                body: "Just paste the meeting link. The bot joins automatically — no Google Calendar or Outlook integration required.",
              },
              {
                icon: MessageSquare,
                title: "Transcript is searchable",
                body: "Every sentence is stored and searchable. Ask 'What did they agree on pricing?' and get an answer with citations.",
              },
              {
                icon: CheckCircle2,
                title: "Action items become work",
                body: "Open meeting notes, ask urMeetings to create tasks from action items, or use saved prompts — no leaving ClickUp.",
              },
              {
                icon: Users,
                title: "Works with your team",
                body: "Share notes with your workspace or meeting participants. Everyone stays in sync without another tab.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl ink-border bg-card p-5 pop flex items-start gap-4">
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl ink-border bg-mint shrink-0">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
