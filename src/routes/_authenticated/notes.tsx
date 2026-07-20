import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { listMeetings } from "@/lib/meetings.functions";
import { Loader2, StickyNote, Radio, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — urMeetings" }] }),
  component: NotesPage,
});

function NotesPage() {
  const fetchList = useServerFn(listMeetings);
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => fetchList(),
  });

  return (
    <AppShell>
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">Your notes</h1>
        <Link
          to="/live"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl ink-border bg-pink px-3 text-sm font-bold no-underline pop-sm"
        >
          <Radio className="h-4 w-4" /> Record
        </Link>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl ink-border bg-pink p-4 pop-sm text-sm font-bold">
          Couldn't load your notes. {error instanceof Error ? error.message : ""}
          <button className="ml-2 underline" onClick={() => router.invalidate()}>
            Retry
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl ink-border bg-card p-10 text-center pop">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl ink-border bg-yellow pop">
            <StickyNote className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black">No meetings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record your first meeting and it'll show up here with a summary.
          </p>
          <Link
            to="/live"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl ink-border bg-violet px-4 text-sm font-bold text-primary-foreground no-underline pop"
          >
            <Radio className="h-4 w-4" /> Start recording
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((m, i) => {
            const bg = ["bg-yellow", "bg-mint", "bg-pink", "bg-card"][i % 4];
            return (
              <li key={m.id}>
                <Link
                  to="/notes/$id"
                  params={{ id: m.id }}
                  className={`block h-full rounded-2xl ink-border p-5 no-underline pop ${bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-black">{m.title}</h3>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </div>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink/60">
                    {new Date(m.started_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {m.duration_seconds ? ` · ${Math.round(m.duration_seconds / 60)} min` : ""}
                  </p>
                  {m.summary && (
                    <p className="mt-3 line-clamp-3 text-sm text-ink/80">{m.summary}</p>
                  )}
                  {Array.isArray(m.action_items) && m.action_items.length > 0 && (
                    <p className="mt-3 text-xs font-bold text-ink/70">
                      ✓ {(m.action_items as string[]).length} action
                      {(m.action_items as string[]).length === 1 ? "" : "s"}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}