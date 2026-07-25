import { useState } from "react";
import {
  X,
  Copy,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Search,
  Download,
  FileText,
  Clock,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteMeeting, updateMeeting } from "@/lib/meetings.functions";
import { useQueryClient } from "@tanstack/react-query";

export interface NoteItem {
  id: string;
  title: string;
  source: string;
  summary?: string | null;
  transcript?: string | null;
  action_items?: string[] | null;
  duration_seconds?: number | null;
  started_at: string;
  created_at?: string;
}

interface NoteReaderModalProps {
  note: NoteItem | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function NoteReaderModal({ note, onClose, onDeleted }: NoteReaderModalProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionItems, setActionItems] = useState<string[]>(
    Array.isArray(note?.action_items) ? (note.action_items as string[]) : [],
  );

  const delFn = useServerFn(deleteMeeting);
  const updateFn = useServerFn(updateMeeting);
  const qc = useQueryClient();

  if (!note) return null;

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${note.title}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await delFn({ data: { id: note.id } });
      toast.success("Meeting note deleted");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      await qc.invalidateQueries({ queryKey: ["meeting", note.id] });
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopySummary() {
    if (!note.summary) return;
    navigator.clipboard.writeText(`Title: ${note.title}\n\nSummary:\n${note.summary}`);
    setCopiedSummary(true);
    toast.success("Summary copied to clipboard");
    setTimeout(() => setCopiedSummary(false), 2000);
  }

  function handleCopyTranscript() {
    if (!note.transcript) return;
    navigator.clipboard.writeText(note.transcript);
    setCopiedTranscript(true);
    toast.success("Full transcript copied to clipboard");
    setTimeout(() => setCopiedTranscript(false), 2000);
  }

  function handleExportMarkdown() {
    const md = `# ${note.title}\n*Date: ${new Date(note.started_at).toLocaleString()} | Source: ${note.source}*\n\n## Summary\n${note.summary || "No summary available."}\n\n## Action Items\n${
      actionItems.length > 0 ? actionItems.map((a) => `- [ ] ${a}`).join("\n") : "None"
    }\n\n## Transcript\n${note.transcript || "(empty)"}`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    toast.success("Exported note as Markdown");
  }

  async function toggleActionItem(index: number) {
    const updated = [...actionItems];
    if (updated[index].startsWith("[x] ")) {
      updated[index] = updated[index].replace("[x] ", "");
    } else {
      updated[index] = `[x] ${updated[index]}`;
    }
    setActionItems(updated);
    try {
      await updateFn({
        data: {
          id: note.id,
          action_items: updated,
        },
      });
      await qc.invalidateQueries({ queryKey: ["meetings"] });
    } catch (e) {
      console.error("Failed to save action item status", e);
    }
  }

  const transcriptText = note.transcript || "";
  const filteredTranscriptLines = searchQuery.trim()
    ? transcriptText
        .split("\n")
        .filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
    : transcriptText.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl ink-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-6 py-5 bg-card/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet/20 px-2.5 py-0.5 text-ink font-bold">
                <Tag className="h-3 w-3" /> {note.source}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(note.started_at).toLocaleString()}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {note.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-xl ink-border bg-red-100 hover:bg-red-200 px-3 py-2 text-xs font-bold text-red-800 transition-colors pop-sm disabled:opacity-60"
              title="Delete Note"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-card transition-colors ink-border"
              title="Close Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-xl ink-border bg-yellow px-3 py-1.5 text-xs font-bold pop-sm"
            >
              {copiedSummary ? <Check className="h-3.5 w-3.5 text-green-700" /> : <Copy className="h-3.5 w-3.5" />}
              Copy Summary
            </button>
            <button
              onClick={handleCopyTranscript}
              className="inline-flex items-center gap-1.5 rounded-xl ink-border bg-mint px-3 py-1.5 text-xs font-bold pop-sm"
            >
              {copiedTranscript ? <Check className="h-3.5 w-3.5 text-green-700" /> : <FileText className="h-3.5 w-3.5" />}
              Copy Transcript
            </button>
            <button
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 rounded-xl ink-border bg-pink px-3 py-1.5 text-xs font-bold pop-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export Markdown
            </button>
          </div>

          {/* AI Executive Summary */}
          {note.summary && (
            <section className="rounded-2xl ink-border bg-yellow/40 p-5 pop-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-ink/70 mb-2">
                Executive AI Summary
              </h3>
              <p className="text-base leading-relaxed whitespace-pre-wrap font-medium text-ink">
                {note.summary}
              </p>
            </section>
          )}

          {/* Action Items with Interactive Checkboxes */}
          {actionItems.length > 0 && (
            <section className="rounded-2xl ink-border bg-mint/40 p-5 pop-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-ink/70 mb-3">
                Action Items ({actionItems.filter((a) => a.startsWith("[x] ")).length}/{actionItems.length})
              </h3>
              <ul className="space-y-2">
                {actionItems.map((item, idx) => {
                  const isDone = item.startsWith("[x] ");
                  const cleanText = item.replace("[x] ", "");
                  return (
                    <li
                      key={idx}
                      onClick={() => toggleActionItem(idx)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl ink-border cursor-pointer transition-all ${
                        isDone ? "bg-card/40 line-through opacity-70" : "bg-card hover:bg-card/90"
                      }`}
                    >
                      {isDone ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 text-ink/60 shrink-0" />
                      )}
                      <span className="text-sm font-semibold">{cleanText}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Full Transcript with In-Page Search */}
          <section className="rounded-2xl ink-border bg-card p-5 pop-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-ink/70">
                Full Transcript ({transcriptText.split(/\s+/).filter(Boolean).length} words)
              </h3>
              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search inside transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl ink-border bg-background pl-8 pr-3 py-1 text-xs"
                />
              </div>
            </div>

            <div className="mt-2 max-h-[350px] overflow-y-auto p-3 rounded-xl bg-background border border-border text-xs leading-relaxed space-y-1.5">
              {filteredTranscriptLines.length === 0 ? (
                <p className="text-muted-foreground italic text-center py-4">
                  No matching transcript lines found for "{searchQuery}".
                </p>
              ) : (
                filteredTranscriptLines.map((line, i) => (
                  <p
                    key={i}
                    className={`font-mono text-xs whitespace-pre-wrap ${
                      line.startsWith("[") || line.includes("Speaker")
                        ? "font-bold text-violet-900 bg-violet-50/50 p-1 rounded"
                        : "text-ink/80"
                    }`}
                  >
                    {line}
                  </p>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
