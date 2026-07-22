import {
  Grip,
  Maximize2,
  Minimize2,
  Radio,
  StickyNote,
  ArrowLeft,
  Loader2,
  PictureInPicture,
  X,
  Edit2,
  Save,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { LiveMeeting } from "./LiveMeeting";
import { useOverlayPreference } from "@/hooks/use-overlay-preference";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMeetings, getMeeting, deleteMeeting, updateMeeting } from "@/lib/meetings.functions";
import { useSession } from "@/hooks/use-session";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface FloatingOverlayProps {
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  className?: string;
}

type OverlayView = "live" | "notes" | "note-detail";

export function FloatingOverlay({
  minSize = { width: 300, height: 400 },
  className,
}: FloatingOverlayProps) {
  const {
    isOverlay,
    position,
    size,
    isMinimized,
    view,
    setPosition,
    setSize,
    setIsMinimized,
    setView,
  } = useOverlayPreference();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const dragStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useSession();
  const fetchList = useServerFn(listMeetings);
  const fetchOne = useServerFn(getMeeting);
  const delFn = useServerFn(deleteMeeting);
  const updateFn = useServerFn(updateMeeting);
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleTogglePiP = async () => {
    try {
      if (isPiP) {
        pipWindowRef.current?.close();
        setIsPiP(false);
        return;
      }

      // @ts-expect-error - documentPictureInPicture is experimental
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 500,
        height: 600,
      });

      pipWindowRef.current = pipWindow;
      setIsPiP(true);

      // Copy styles to PiP window
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of links) {
        const newLink = pipWindow.document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = link.href;
        pipWindow.document.head.appendChild(newLink);
      }

      const style = document.createElement("style");
      style.textContent = `
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; background-color: #fbf9f4; }
      `;
      pipWindow.document.head.appendChild(style);

      // Create container
      const container = pipWindow.document.createElement("div");
      container.id = "pip-root";
      pipWindow.document.body.appendChild(container);

      // Listen for PiP window close
      pipWindow.addEventListener("pagehide", () => {
        setIsPiP(false);
        pipWindowRef.current = null;
      });
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const { data: meetings, isLoading: loadingMeetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => fetchList(),
    enabled: isAuthenticated,
  });

  const { data: selectedMeeting, isLoading: loadingMeeting } = useQuery({
    queryKey: ["meeting", selectedNoteId],
    queryFn: () => (selectedNoteId ? fetchOne({ data: { id: selectedNoteId } }) : null),
    enabled: !!selectedNoteId,
  });

  // Initialize edit state when selectedMeeting loads
  useEffect(() => {
    if (selectedMeeting) {
      setEditTitle(selectedMeeting.title);
      setEditSummary(selectedMeeting.summary || "");
      setEditTranscript(selectedMeeting.transcript || "");
      setEditActionItems((selectedMeeting.action_items as string[]) || []);
    }
  }, [selectedMeeting]);

  async function handleDelete() {
    if (!selectedNoteId || !confirm("Delete this meeting? This can't be undone.")) return;
    setDeleting(true);
    try {
      await delFn({ data: { id: selectedNoteId } });
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      setSelectedNoteId(null);
      setView("notes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!selectedNoteId) return;
    setSaving(true);
    try {
      await updateFn({
        data: {
          id: selectedNoteId,
          title: editTitle,
          summary: editSummary,
          transcript: editTranscript,
          action_items: editActionItems,
        },
      });
      toast.success("Saved changes");
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      await qc.invalidateQueries({ queryKey: ["meeting", selectedNoteId] });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (selectedMeeting) {
      setEditTitle(selectedMeeting.title);
      setEditSummary(selectedMeeting.summary || "");
      setEditTranscript(selectedMeeting.transcript || "");
      setEditActionItems((selectedMeeting.action_items as string[]) || []);
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

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("[data-no-drag]")) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  // Handle resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    sizeStart.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  };

  useEffect(() => {
    // Set smart default position on first load if not already set, or reset if off-screen
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("urMeetings_overlay_state");
      if (!stored) {
        setPosition({ x: window.innerWidth - 540, y: 20 });
      }
    }
  }, [setPosition]);

  useEffect(() => {
    if (typeof window !== "undefined" && isOverlay) {
      setIsMinimized(false);
    }
  }, [isOverlay, setIsMinimized]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
      if (isResizing) {
        const newWidth = Math.max(
          minSize.width,
          sizeStart.current.width + (e.clientX - sizeStart.current.x),
        );
        const newHeight = Math.max(
          minSize.height,
          sizeStart.current.height + (e.clientY - sizeStart.current.y),
        );
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, minSize, setPosition, setSize]);

  if (!isOverlay) return null;

  const renderOverlayContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
        <div className="flex items-center gap-2">
          {!isPiP && <Grip className="h-4 w-4 text-muted-foreground" />}
          {view === "note-detail" && (
            <button
              onClick={() => {
                setSelectedNoteId(null);
                setView("notes");
              }}
              className="p-1 rounded hover:bg-card transition-colors"
              data-no-drag
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="font-bold truncate">
            {view === "live"
              ? "urMeetings - Live"
              : view === "notes"
                ? "urMeetings - Notes"
                : selectedMeeting?.title}
          </span>
        </div>
        <div className="flex items-center gap-1" data-no-drag>
          <button
            onClick={() => setView("live")}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              view === "live" ? "bg-pink" : "hover:bg-card",
            )}
          >
            <Radio className="h-4 w-4" />
          </button>
          {isAuthenticated && (
            <button
              onClick={() => {
                setSelectedNoteId(null);
                setView("notes");
              }}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                view === "notes" || view === "note-detail" ? "bg-yellow" : "hover:bg-card",
              )}
            >
              <StickyNote className="h-4 w-4" />
            </button>
          )}
          {!isPiP && (
            <button
              onClick={handleTogglePiP}
              className="p-1.5 rounded-lg hover:bg-card transition-colors"
            >
              <PictureInPicture className="h-4 w-4" />
            </button>
          )}
          {isPiP && (
            <button
              onClick={handleTogglePiP}
              className="p-1.5 rounded-lg hover:bg-card transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!isPiP && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-card transition-colors"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          {view === "live" && <LiveMeeting />}
          {view === "notes" && (
            <div className="h-full overflow-y-auto p-4">
              {loadingMeetings ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !meetings || meetings.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {meetings.map((m, i) => {
                    const bg = ["bg-yellow", "bg-mint", "bg-pink", "bg-card"][i % 4];
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => {
                            setSelectedNoteId(m.id);
                            setView("note-detail");
                          }}
                          className={`w-full text-left rounded-xl ink-border p-4 pop-sm ${bg}`}
                        >
                          <h3 className="text-sm font-bold line-clamp-2">{m.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(m.started_at).toLocaleDateString()}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {view === "note-detail" && (
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {loadingMeeting ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !selectedMeeting ? (
                <p className="text-center text-muted-foreground">Meeting not found</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    {editing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 rounded-lg ink-border bg-card px-3 py-2 text-sm font-bold"
                      />
                    ) : (
                      <h3 className="text-sm font-bold truncate">{selectedMeeting.title}</h3>
                    )}
                    <div className="flex gap-1" data-no-drag>
                      {editing ? (
                        <>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-1.5 rounded-lg hover:bg-card transition-colors disabled:opacity-60"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-violet transition-colors disabled:opacity-60"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditing(true)}
                            className="p-1.5 rounded-lg bg-mint transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-card transition-colors disabled:opacity-60"
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editing || selectedMeeting.summary ? (
                    <section className="rounded-xl ink-border bg-yellow p-4 pop-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest">Summary</h3>
                      {editing ? (
                        <textarea
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="mt-2 w-full rounded-lg ink-border bg-card px-3 py-2 text-sm min-h-[100px]"
                        />
                      ) : (
                        <p className="mt-2 text-sm whitespace-pre-wrap">{selectedMeeting.summary}</p>
                      )}
                    </section>
                  ) : null}

                  {editing || (Array.isArray(selectedMeeting.action_items) && selectedMeeting.action_items.length > 0) ? (
                    <section className="rounded-xl ink-border bg-mint p-4 pop-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest">
                          Action items
                        </h3>
                        {editing && (
                          <button
                            onClick={handleAddActionItem}
                            className="text-xs font-bold text-ink/60 hover:text-ink"
                            data-no-drag
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      {editing ? (
                        <ul className="mt-2 space-y-1">
                          {editActionItems.map((a, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-ink/60" />
                              <input
                                type="text"
                                value={a}
                                onChange={(e) => handleUpdateActionItem(i, e.target.value)}
                                className="flex-1 rounded-md ink-border bg-card px-2 py-1 text-xs"
                              />
                              <button
                                onClick={() => handleRemoveActionItem(i)}
                                className="text-ink/60 hover:text-ink"
                                data-no-drag
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {(selectedMeeting.action_items as string[]).map((a, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckSquare className="mt-0.5 h-3 w-3 shrink-0 text-ink/60" />
                              <span className="text-xs">{a}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ) : null}

                  <section className="rounded-xl ink-border bg-card p-4 pop-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest">Transcript</h3>
                    {editing ? (
                      <textarea
                        value={editTranscript}
                        onChange={(e) => setEditTranscript(e.target.value)}
                        className="mt-2 w-full rounded-lg ink-border bg-card px-3 py-2 text-xs min-h-[150px]"
                      />
                    ) : (
                      <p className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                        {selectedMeeting.transcript || "(empty)"}
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && !isPiP && (
        <div
          className="absolute bottom-0 right-0 h-6 w-6 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 h-2 w-2 rounded-br-xl border-b-2 border-r-2 border-muted-foreground" />
        </div>
      )}
    </div>
  );

  // Get PiP container if available
  const getPipContainer = () => {
    if (!pipWindowRef.current) return null;
    return pipWindowRef.current.document.getElementById("pip-root");
  };
  const pipContainer = getPipContainer();

  return (
    <>
      {/* Render main floating window if not in PiP */}
      {!isPiP && (
        <div
          ref={containerRef}
          className={cn(
            "fixed z-50 flex flex-col rounded-2xl ink-border bg-background shadow-2xl overflow-hidden",
            isDragging ? "cursor-grabbing" : "cursor-default",
            className,
          )}
          style={{
            left: position.x,
            top: position.y,
            width: isMinimized ? 320 : size.width,
            height: isMinimized ? 64 : size.height,
          }}
          onMouseDown={handleMouseDown}
        >
          {renderOverlayContent()}
        </div>
      )}

      {/* Render PiP content via portal if in PiP mode */}
      {isPiP && pipContainer && createPortal(renderOverlayContent(), pipContainer)}
    </>
  );
}
