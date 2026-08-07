'use client'

import { useRouter } from "next/navigation"
import { Bot, FileText, Shield, Zap } from "lucide-react"

export default function MarketingPage() {
  const router = useRouter()

  const features = [
    {
      title: "Intelligent Recording",
      description: "urBriefs joins your calls automatically, ensuring no moment is missed.",
      icon: <Bot className="w-5 h-5" />,
      bg: "bg-[oklch(0.55_0.24_285)]",  // violet
      textColor: "text-[oklch(0.985_0.008_90)]",
    },
    {
      title: "Smart Transcription",
      description: "Get accurate, speaker-diarized transcripts immediately after your meeting ends.",
      icon: <FileText className="w-5 h-5" />,
      bg: "bg-[oklch(0.88_0.19_95)]",   // yellow
      textColor: "text-[oklch(0.16_0.02_260)]",
    },
    {
      title: "Secure & Private",
      description: "Your meeting data is encrypted and stored securely. You have full control.",
      icon: <Shield className="w-5 h-5" />,
      bg: "bg-[oklch(0.82_0.15_165)]",  // mint
      textColor: "text-[oklch(0.16_0.02_260)]",
    },
    {
      title: "Instant Insights",
      description: "Extract key takeaways and action items with our advanced AI processing.",
      icon: <Zap className="w-5 h-5" />,
      bg: "bg-[oklch(0.68_0.24_355)]",  // pink
      textColor: "text-[oklch(0.985_0.008_90)]",
    },
  ]

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Nav */}
        <header className="flex items-center justify-between py-6 border-b-2 border-ink">
          <div className="flex items-center gap-2">
            <span className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)] pop-sm">
              <Bot className="w-5 h-5" />
            </span>
            <span className="font-display text-xl font-black tracking-tight">urBriefs</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-10 items-center gap-2 rounded-xl ink-border bg-[oklch(0.55_0.24_285)] px-4 text-sm font-bold text-[oklch(0.985_0.008_90)] pop"
          >
            Dashboard →
          </button>
        </header>

        {/* Hero */}
        <section className="relative py-16 md:py-24">
          {/* Decorative shapes */}
          <span className="pointer-events-none absolute -left-2 top-10 hidden md:block h-10 w-10 rotate-12 rounded-lg ink-border bg-[oklch(0.68_0.24_355)]" />
          <span className="pointer-events-none absolute right-6 top-6 hidden md:block h-8 w-8 rounded-full ink-border bg-[oklch(0.82_0.15_165)]" />
          <span className="pointer-events-none absolute -right-1 bottom-10 hidden md:block h-12 w-12 -rotate-6 rounded-lg ink-border bg-[oklch(0.55_0.24_285)]" />

          <div className="inline-flex items-center gap-2 rounded-full ink-border bg-[oklch(0.88_0.19_95)] px-3 py-1 text-xs font-bold pop-sm mb-6">
            <span className="h-2 w-2 rounded-full bg-green-500 blink" />
            Now live for Zoom, Google Meet &amp; Teams
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl max-w-3xl">
            Your silent AI{" "}
            <span className="relative inline-block rotate-[-1.5deg] rounded-2xl ink-border bg-[oklch(0.68_0.24_355)] px-3 pb-1 pop">
              meeting bot.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Drop a Google Meet, Zoom, or Teams link. <strong>urBriefs</strong> joins the call, records everything,
            and instantly turns it into transcripts and summaries — no effort needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-[oklch(0.55_0.24_285)] px-5 text-base font-bold text-[oklch(0.985_0.008_90)] pop"
            >
              <Bot className="h-4 w-4" /> Go to Dashboard
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-card px-5 text-base font-bold text-foreground pop"
            >
              Learn more ↓
            </button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="pb-20">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full ink-border bg-[oklch(0.88_0.19_95)] px-3 py-1 text-xs font-bold pop-sm">
              What you get
            </span>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Drop a link.{" "}
              <span className="text-muted-foreground">urBriefs handles the rest.</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl ink-border bg-card p-5 pop pop-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span
                  className={`inline-grid h-11 w-11 place-items-center rounded-xl ink-border ${feature.bg} ${feature.textColor} mb-4`}
                >
                  {feature.icon}
                </span>
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="pb-20">
          <div className="relative overflow-hidden rounded-3xl ink-border bg-[oklch(0.55_0.24_285)] p-8 text-[oklch(0.985_0.008_90)] pop-lg sm:p-12">
            <div className="pointer-events-none absolute inset-0 opacity-20 dotted-bg" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black sm:text-4xl">Ready in seconds.</h2>
                <p className="mt-2 max-w-lg text-sm font-bold opacity-90">
                  Paste a meeting URL and let urBriefs do the work. No setup needed.
                </p>
              </div>
              <button
                onClick={() => router.push('/create-bot')}
                className="inline-flex h-12 items-center gap-2 rounded-xl ink-border bg-[oklch(0.88_0.19_95)] px-5 text-base font-bold text-foreground pop"
              >
                <Bot className="h-4 w-4" /> Deploy urBriefs Now
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-ink py-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Neel P (N-PCs). All rights reserved.</p>
          <p className="mt-1">
            <a
              href="https://github.com/N-PCs"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-foreground underline underline-offset-4"
            >
              github.com/N-PCs
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}