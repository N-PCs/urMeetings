import { Grip, Maximize2, Minimize2, Radio, StickyNote, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LiveMeeting } from "./LiveMeeting";
import { useOverlayPreference } from "@/hooks/use-overlay-preference";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMeetings, getMeeting } from "@/lib/meetings.functions";
import { useSession } from "@/hooks/use-session";
import { useRouter } from "@tanstack/react-router";

interface FloatingOverlayProps {
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  className?: string;
}

type OverlayView = "live" | "notes" | "note-detail";

export function FloatingOverlay({
  defaultPosition = { x: 20, y: 20 },
  defaultSize = { width: 500, height: 600 },
  minSize = { width: 300, height: 400 },
  className,
}: FloatingOverlayProps) {
  const { isOverlay } = useOverlayPreference();
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [view, setView] = useState<OverlayView>("live");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useSession();
  const fetchList = useServerFn(listMeetings);
  const fetchOne = useServerFn(getMeeting);
  const router = useRouter();

  const { data: meetings, isLoading: loadingMeetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => fetchList(),
    enabled: isAuthenticated,
  });

  const { data: selectedMeeting, isLoading: loadingMeeting } = useQuery({
    queryKey: ["meeting", selectedNoteId],
    queryFn: () => selectedNoteId ? fetchOne({ data: { id: selectedNoteId } }) : null,
    enabled: !!selectedNoteId,
  });

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
  }, [isDragging, isResizing, minSize]);

  if (!isOverlay) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 flex flex-col rounded-2xl ink-border bg-background shadow-2xl",
        isDragging ? "cursor-grabbing" : "cursor-default",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 300 : size.width,
        height: isMinimized ? 60 : size.height,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-3 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Grip className="h-4 w-4 text-muted-foreground" />
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
            {view === "live" ? "urMeetings - Live" : view === "notes" ? "urMeetings - Notes" : selectedMeeting?.title}
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
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg hover:bg-card transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
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
                  {selectedMeeting.summary && (
                    <section className="rounded-xl ink-border bg-yellow p-4 pop-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest">Summary</h3>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{selectedMeeting.summary}</p>
                    </section>
                  )}
                  {Array.isArray(selectedMeeting.action_items) && selectedMeeting.action_items.length > 0 && (
                    <section className="rounded-xl ink-border bg-mint p-4 pop-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest">Action items</h3>
                      <ul className="mt-2 space-y-1">
                        {(selectedMeeting.action_items as string[]).map((a, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-ink/60" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section className="rounded-xl ink-border bg-card p-4 pop-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest">Transcript</h3>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                      {selectedMeeting.transcript || "(empty)"}
                    </p>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 h-6 w-6 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 h-2 w-2 rounded-br-xl border-b-2 border-r-2 border-muted-foreground" />
        </div>
      )}
    </div>
  );
}
