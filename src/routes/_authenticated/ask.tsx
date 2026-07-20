import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { askMeetingNotes, searchMeetings } from "@/lib/meetings.functions";
import { Sparkles, Loader2, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({ meta: [{ title: "Ask your notes — urMeetings" }] }),
  component: AskPage,
});

const SUGGESTIONS = [
  "What did we decide this week?",
  "Summarize open action items.",
  "Any blockers mentioned?",
  "Who owns the launch tasks?",
];

function AskPage() {
  const askFn = useServerFn(askMeetingNotes);
  const searchFn = useServerFn(searchMeetings);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{
    answer: string;
    citations: { meeting_id: string; title: string }[];
  } | null>(null);

  const { data: matches, isFetching: searching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.trim().length > 1,
  });

  async function ask(query: string) {
    if (!query.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const result = await askFn({ data: { query } });
      setAnswer(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAsking(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Ask your notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search by keyword, or ask a real question across every meeting.
          </p>
        </div>

        <div className="rounded-2xl ink-border bg-card p-4 pop">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. What did we decide about pricing?"
                className="h-12 w-full rounded-xl ink-border bg-background pl-10 pr-3 text-base font-medium outline-none focus:pop-sm"
              />
            </div>
            <button
              type="submit"
              disabled={asking || !q.trim()}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl ink-border bg-violet px-4 text-sm font-bold text-primary-foreground pop-sm disabled:opacity-60"
            >
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQ(s);
                  ask(s);
                }}
                className="rounded-full ink-border bg-yellow px-3 py-1 text-xs font-bold pop-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {asking && (
          <div className="rounded-2xl ink-border bg-mint p-5 pop">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Sparkles className="h-4 w-4" /> Thinking…
            </div>
          </div>
        )}
        {answer && !asking && (
          <div className="rounded-2xl ink-border bg-mint p-5 pop">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Sparkles className="h-4 w-4" /> Answer
            </div>
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">{answer.answer}</p>
            {answer.citations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Based on</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {answer.citations.slice(0, 6).map((c) => (
                    <Link
                      key={c.meeting_id}
                      to="/notes/$id"
                      params={{ id: c.meeting_id }}
                      className="inline-flex items-center gap-1 rounded-full ink-border bg-card px-3 py-1 text-xs font-bold no-underline pop-sm"
                    >
                      {c.title} <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {q.trim().length > 1 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Matching notes {searching && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </p>
            <ul className="mt-2 space-y-2">
              {(matches ?? []).length === 0 && !searching && (
                <li className="text-sm text-muted-foreground">No matches.</li>
              )}
              {(matches ?? []).map((m) => (
                <li key={m.id}>
                  <Link
                    to="/notes/$id"
                    params={{ id: m.id }}
                    className="flex items-start justify-between gap-3 rounded-xl ink-border bg-card p-3 no-underline pop-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{m.title}</p>
                      {m.summary && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {m.summary}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}