import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { getMeeting, deleteMeeting, updateMeeting } from "@/lib/meetings.functions";
import { ArrowLeft, Loader2, Trash2, CheckSquare, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  head: () => ({ meta: [{ title: "Meeting — urMeetings" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getMeeting);
  const delFn = useServerFn(deleteMeeting);
  const updateFn = useServerFn(updateMeeting);
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editActionItems, setEditActionItems] = useState<string[]>([]);

  const {
    data: meeting,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  // Initialize edit state when meeting loads
  useEffect(() => {
    if (meeting) {
      setEditTitle(meeting.title);
      setEditSummary(meeting.summary || "");
      setEditTranscript(meeting.transcript || "");
      setEditActionItems((meeting.action_items as string[]) || []);
    }
  }, [meeting]);

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

  async function handleSave() {
    setSaving(true);
    try {
      await updateFn({
        data: {
          id,
          title: editTitle,
          summary: editSummary,
          transcript: editTranscript,
          action_items: editActionItems,
        },
      });
      toast.success("Saved changes");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      await qc.invalidateQueries({ queryKey: ["meeting", id] });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (meeting) {
      setEditTitle(meeting.title);
      setEditSummary(meeting.summary || "");
      setEditTranscript(meeting.transcript || "");
      setEditActionItems((meeting.action_items as string[]) || []);
    }
    setEditing(false);
  }

  function handleAddActionItem() {
    setEditActionItems([...editActionItems, ""]);
  }

  function handleRemoveActionItem(index: number) {
    setEditActionItems(editActionItems.filter((_, i) => i !== index));
  }

  function handleUpdateActionItem(index: number, value: string) {
    const newItems = [...editActionItems];
    newItems[index] = value;
    setEditActionItems(newItems);
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
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl ink-border bg-card px-4 py-2 text-3xl font-black tracking-tight sm:text-4xl"
                />
              ) : (
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{meeting.title}</h1>
              )}
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(meeting.started_at).toLocaleString()} · {meeting.source}
                {meeting.duration_seconds
                  ? ` · ${Math.round(meeting.duration_seconds / 60)} min`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-card px-3 text-sm font-bold pop-sm disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-violet px-3 text-sm font-bold pop-sm disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Save</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (meeting) {
                        const md = `# ${meeting.title}\n\n## Summary\n${meeting.summary || ""}\n\n## Transcript\n${meeting.transcript || ""}`;
                        const blob = new Blob([md], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${meeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.md`;
                        a.click();
                        toast.success("Exported Markdown");
                      }
                    }}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-yellow px-3 text-sm font-bold pop-sm"
                  >
                    Download MD
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-mint px-3 text-sm font-bold pop-sm"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl ink-border bg-red-100 text-red-800 px-3 text-sm font-bold pop-sm disabled:opacity-60"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </>
              )}
            </div>
          </header>

          {editing || meeting.summary ? (
            <section className="rounded-2xl ink-border bg-yellow p-5 pop">
              <h2 className="text-sm font-black uppercase tracking-widest">Summary</h2>
              {editing ? (
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="mt-2 w-full rounded-xl ink-border bg-card px-4 py-2 text-base leading-relaxed min-h-[150px]"
                />
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">
                  {meeting.summary}
                </p>
              )}
            </section>
          ) : null}

          {editing || (Array.isArray(meeting.action_items) && meeting.action_items.length > 0) ? (
            <section className="rounded-2xl ink-border bg-mint p-5 pop">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest">Action items</h2>
                {editing && (
                  <button
                    onClick={handleAddActionItem}
                    className="text-sm font-bold text-ink/60 hover:text-ink"
                  >
                    + Add
                  </button>
                )}
              </div>
              {editing ? (
                <ul className="mt-2 space-y-2">
                  {editActionItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
                      <input
                        type="text"
                        value={a}
                        onChange={(e) => handleUpdateActionItem(i, e.target.value)}
                        className="flex-1 rounded-lg ink-border bg-card px-3 py-1 text-sm"
                      />
                      <button
                        onClick={() => handleRemoveActionItem(i)}
                        className="text-ink/60 hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2 space-y-2">
                  {(meeting.action_items as string[]).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-base">
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="rounded-2xl ink-border bg-card p-5 pop">
            <h2 className="text-sm font-black uppercase tracking-widest">Transcript</h2>
            {editing ? (
              <textarea
                value={editTranscript}
                onChange={(e) => setEditTranscript(e.target.value)}
                className="mt-2 w-full rounded-xl ink-border bg-card px-4 py-2 text-sm leading-relaxed min-h-[300px]"
              />
            ) : (
              <p className="mt-2 max-h-[60dvh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {meeting.transcript || "(empty)"}
              </p>
            )}
          </section>
        </article>
      )}
    </AppShell>
  );
}
