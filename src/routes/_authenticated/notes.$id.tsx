import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { getMeeting, deleteMeeting } from "@/lib/meetings.functions";
import { ArrowLeft, Loader2, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  head: () => ({ meta: [{ title: "Meeting — urMeetings" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getMeeting);
  const delFn = useServerFn(deleteMeeting);
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const {
    data: meeting,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  async function handleDelete() {
    if (!confirm("Delete this meeting? This can't be undone.")) return;
    setDeleting(true);
    try {
      await delFn({ data: { id } });
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      navigate({ to: "/notes" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <Link to="/notes" className="inline-flex items-center gap-1 text-sm font-bold no-underline">
        <ArrowLeft className="h-4 w-4" /> All notes
      </Link>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl ink-border bg-pink p-4 pop-sm text-sm font-bold">
          {error instanceof Error ? error.message : "Failed to load."}{" "}
          <button className="underline" onClick={() => router.invalidate()}>
            Retry
          </button>
        </div>
      ) : !meeting ? (
        <p className="mt-10 text-center text-muted-foreground">Meeting not found.</p>
      ) : (
        <article className="mt-4 space-y-5">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{meeting.title}</h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(meeting.started_at).toLocaleString()} · {meeting.source}
                {meeting.duration_seconds
                  ? ` · ${Math.round(meeting.duration_seconds / 60)} min`
                  : ""}
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-card px-3 text-sm font-bold pop-sm disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Delete</span>
            </button>
          </header>

          {meeting.summary && (
            <section className="rounded-2xl ink-border bg-yellow p-5 pop">
              <h2 className="text-sm font-black uppercase tracking-widest">Summary</h2>
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">
                {meeting.summary}
              </p>
            </section>
          )}

          {Array.isArray(meeting.action_items) && meeting.action_items.length > 0 && (
            <section className="rounded-2xl ink-border bg-mint p-5 pop">
              <h2 className="text-sm font-black uppercase tracking-widest">Action items</h2>
              <ul className="mt-2 space-y-2">
                {(meeting.action_items as string[]).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-base">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl ink-border bg-card p-5 pop">
            <h2 className="text-sm font-black uppercase tracking-widest">Transcript</h2>
            <p className="mt-2 max-h-[60dvh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {meeting.transcript || "(empty)"}
            </p>
          </section>
        </article>
      )}
    </AppShell>
  );
}
