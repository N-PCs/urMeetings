import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { listMeetings, deleteMeeting, getMeeting } from "@/lib/meetings.functions";
import { Loader2, StickyNote, Radio, Trash2, Eye, Bot, Plus } from "lucide-react";
import { NoteReaderModal, type NoteItem } from "@/components/NoteReaderModal";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — urMeetings" }] }),
  component: NotesPage,
});

function NotesPage() {
  const fetchList = useServerFn(listMeetings);
  const fetchOne = useServerFn(getMeeting);
  const delFn = useServerFn(deleteMeeting);
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedModalNote, setSelectedModalNote] = useState<NoteItem | null>(null);
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => fetchList(),
  });

  async function handleOpenReader(m: { id: string; title: string; source: string; summary?: string | null; started_at: string; action_items?: unknown }) {
    setLoadingNoteId(m.id);
    try {
      const full = await fetchOne({ data: { id: m.id } });
      if (full) {
        setSelectedModalNote(full as NoteItem);
      }
    } catch (err) {
      toast.error("Failed to load note details");
      console.error(err);
    } finally {
      setLoadingNoteId(null);
    }
  }

  async function handleDeleteNote(e: React.MouseEvent, m: { id: string; title: string }) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Delete meeting note "${m.title}"?`)) return;
    setDeletingId(m.id);
    try {
      await delFn({ data: { id: m.id } });
      toast.success("Deleted note");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">Your notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.length} saved meeting notes` : "All your meeting summaries & transcripts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/bot"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl ink-border bg-mint px-3 text-sm font-bold no-underline pop-sm"
          >
            <Bot className="h-4 w-4" /> AI Bot Join
          </Link>
          <Link
            to="/live"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl ink-border bg-pink px-3 text-sm font-bold no-underline pop-sm"
          >
            <Radio className="h-4 w-4" /> Record
          </Link>
        </div>
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
            Record your first meeting or send our AI Bot to join a meeting link.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              to="/bot"
              className="inline-flex h-11 items-center gap-2 rounded-xl ink-border bg-mint px-4 text-sm font-bold no-underline pop"
            >
              <Bot className="h-4 w-4" /> Deploy AI Bot
            </Link>
            <Link
              to="/live"
              className="inline-flex h-11 items-center gap-2 rounded-xl ink-border bg-violet px-4 text-sm font-bold text-primary-foreground no-underline pop"
            >
              <Plus className="h-4 w-4" /> Start recording
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((m, i) => {
            const bg = ["bg-yellow", "bg-mint", "bg-pink", "bg-card"][i % 4];
            return (
              <li key={m.id} className="relative group">
                <div
                  onClick={() => handleOpenReader(m)}
                  className={`block h-full rounded-2xl ink-border p-5 cursor-pointer pop ${bg} transition-transform hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-black text-ink">{m.title}</h3>

                    {/* Quick Card Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenReader(m)}
                        disabled={loadingNoteId === m.id}
                        className="p-1.5 rounded-lg ink-border bg-background hover:bg-card transition-colors pop-sm"
                        title="Read Whole Note"
                      >
                        {loadingNoteId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(e, m)}
                        disabled={deletingId === m.id}
                        className="p-1.5 rounded-lg ink-border bg-red-100 hover:bg-red-200 text-red-800 transition-colors pop-sm"
                        title="Delete Note"
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">
                    {new Date(m.started_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {m.duration_seconds ? ` · ${Math.round(m.duration_seconds / 60)} min` : ""}
                  </p>

                  {m.summary && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/80">{m.summary}</p>
                  )}

                  {Array.isArray(m.action_items) && m.action_items.length > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-2.5">
                      <span className="text-xs font-bold text-ink/70">
                        ✓ {(m.action_items as string[]).length} action item{(m.action_items as string[]).length === 1 ? "" : "s"}
                      </span>
                      <span className="text-xs font-bold underline text-ink/80 hover:text-ink">
                        Read full note →
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Note Reader Modal */}
      {selectedModalNote && (
        <NoteReaderModal
          note={selectedModalNote}
          onClose={() => setSelectedModalNote(null)}
          onDeleted={() => qc.invalidateQueries({ queryKey: ["meetings"] })}
        />
      )}
    </AppShell>
  );
}
