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
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Smile,
  Volume2,
  Share,
  MoreVertical,
  Globe,
  Plus,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useOverlayPreference } from "@/hooks/use-overlay-preference";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMeetings, getMeeting, deleteMeeting, updateMeeting } from "@/lib/meetings.functions";
import { useSession } from "@/hooks/use-session";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMeetingListener } from "@/hooks/use-meeting-listener";

interface FloatingOverlayProps {
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  className?: string;
}

export function FloatingOverlay({
  minSize = { width: 340, height: 480 },
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
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [speakerNewName, setSpeakerNewName] = useState("");

  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; symbol: string; x: number }[]>([]);

  const dragStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useSession();
  const fetchList = useServerFn(listMeetings);
  const fetchOne = useServerFn(getMeeting);
  const delFn = useServerFn(deleteMeeting);
  const updateFn = useServerFn(updateMeeting);

  const meetingListener = useMeetingListener();

  const handleTogglePiP = async () => {
    try {
      if (isPiP) {
        if (pipWindowRef.current) {
          pipWindowRef.current.close();
          pipWindowRef.current = null;
        }
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        setIsPiP(false);
        return;
      }

      // @ts-expect-error - documentPictureInPicture is experimental
      if (typeof window !== "undefined" && window.documentPictureInPicture?.requestWindow) {
        // @ts-expect-error - documentPictureInPicture is experimental
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 360,
          height: 580,
        });

        pipWindowRef.current = pipWindow;
        setIsPiP(true);

        const links = document.querySelectorAll('link[rel="stylesheet"]');
        for (const link of links) {
          const newLink = pipWindow.document.createElement("link");
          newLink.rel = "stylesheet";
          newLink.href = (link as HTMLLinkElement).href;
          pipWindow.document.head.appendChild(newLink);
        }

        const style = document.createElement("style");
        style.textContent = `
          * { box-sizing: border-box; }
          body { margin: 0; font-family: 'DM Sans', sans-serif; background-color: #18181b; color: #ffffff; }
        `;
        pipWindow.document.head.appendChild(style);

        const container = pipWindow.document.createElement("div");
        container.id = "pip-root";
        pipWindow.document.body.appendChild(container);

        pipWindow.addEventListener("pagehide", () => {
          setIsPiP(false);
          pipWindowRef.current = null;
        });
        toast.success("Active across browser tabs!");
        return;
      }

      toast.info("Document PiP enabled for overlay mode.");
      setIsPiP(true);
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const triggerReaction = (symbol: string) => {
    const newEmoji = { id: Date.now(), symbol, x: Math.random() * 80 + 10 };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 2000);
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

  useEffect(() => {
    if (selectedMeeting) {
      setEditTitle(selectedMeeting.title);
      setEditSummary(selectedMeeting.summary || "");
      setEditTranscript(selectedMeeting.transcript || "");
      setEditActionItems(
        Array.isArray(selectedMeeting.action_items)
          ? (selectedMeeting.action_items as string[])
          : [],
      );
    }
  }, [selectedMeeting]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("[data-no-drag]") ||
      (e.target as HTMLElement).tagName === "BUTTON" ||
      (e.target as HTMLElement).tagName === "INPUT"
    ) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    sizeStart.current = { width: size.width, height: size.height, x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.current.y));
        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const newWidth = Math.max(minSize.width, sizeStart.current.width + (e.clientX - sizeStart.current.x));
        const newHeight = Math.max(minSize.height, sizeStart.current.height + (e.clientY - sizeStart.current.y));
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
  }, [isDragging, isResizing, minSize, setPosition, setSize, size]);

  if (!isOverlay) return null;

  const renderOverlayContent = () => (
    <div className="flex flex-col h-full bg-[#18181b] text-white rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative">
      {/* Top Header Bar (Google Meet PiP Bar) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#202124] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-300 truncate">
            {meetingListener.meetingDomain}
          </span>
          {meetingListener.isListening && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" data-no-drag>
          <button
            onClick={() => setView(view === "live" ? "notes" : "live")}
            className={cn(
              "p-1.5 rounded-full transition-colors text-zinc-300 hover:bg-zinc-800",
              view === "live" && "bg-zinc-800 text-white",
            )}
            title="Toggle Meet Grid / Notes"
          >
            <Radio className="h-3.5 w-3.5" />
          </button>
          {!isPiP && (
            <button
              onClick={handleTogglePiP}
              className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Picture-in-Picture"
            >
              <PictureInPicture className="h-3.5 w-3.5" />
            </button>
          )}
          {!isPiP && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#121214]">
          {/* Animated Reactions Overlay */}
          {floatingEmojis.map((e) => (
            <span
              key={e.id}
              className="absolute bottom-16 text-2xl animate-bounce z-40 pointer-events-none transition-all duration-1000"
              style={{ left: `${e.x}%` }}
            >
              {e.symbol}
            </span>
          ))}

          {/* VIEW: LIVE GOOGLE MEET PARTICIPANT GRID */}
          {view === "live" && (
            <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3">
              {/* Participant Grid (matching Google Meet PiP screenshot) */}
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-[220px]">
                {meetingListener.participants.map((p) => {
                  const isSpeaking = p.isSpeaking || meetingListener.activeSpeakerId === p.id;
                  const isEditingThis = editingSpeakerId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "relative rounded-2xl bg-[#202124] p-3 flex flex-col items-center justify-between transition-all border border-zinc-800/80 group",
                        isSpeaking && "ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] bg-[#242730]",
                      )}
                    >
                      {/* Top Bar inside Card: Mic Status */}
                      <div className="w-full flex justify-end">
                        <span className="p-1 rounded-full bg-zinc-900/80 text-zinc-300 text-[10px]">
                          {p.isMuted ? <MicOff className="h-3 w-3 text-red-400" /> : <Mic className="h-3 w-3 text-emerald-400" />}
                        </span>
                      </div>

                      {/* Participant Avatar Circle */}
                      <div className="relative my-2">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full grid place-items-center font-extrabold text-sm text-white shadow-md transition-transform",
                            p.color,
                            isSpeaking && "scale-105 ring-2 ring-white",
                          )}
                        >
                          {p.initials}
                        </div>
                        {isSpeaking && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px]">
                            <Volume2 className="h-2.5 w-2.5 text-white animate-pulse" />
                          </span>
                        )}
                      </div>

                      {/* Name Label with double-click to rename */}
                      <div className="w-full text-center truncate" data-no-drag>
                        {isEditingThis ? (
                          <input
                            type="text"
                            autoFocus
                            value={speakerNewName}
                            onChange={(e) => setSpeakerNewName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                meetingListener.renameParticipant(p.id, speakerNewName);
                                setEditingSpeakerId(null);
                              }
                            }}
                            onBlur={() => {
                              meetingListener.renameParticipant(p.id, speakerNewName);
                              setEditingSpeakerId(null);
                            }}
                            className="w-full bg-zinc-900 text-white rounded px-1 text-[11px] text-center"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingSpeakerId(p.id);
                              setSpeakerNewName(p.name);
                            }}
                            className="text-[11px] font-bold text-zinc-200 truncate cursor-pointer hover:underline"
                            title="Click to rename speaker"
                          >
                            {p.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Overflow + 12 others Card (matching Google Meet screenshot) */}
                <div className="rounded-2xl bg-[#202124] p-3 flex flex-col items-center justify-center border border-zinc-800/80 text-zinc-400">
                  <div className="flex -space-x-2 overflow-hidden mb-1">
                    <span className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-purple-600 grid place-items-center text-[9px] font-bold text-white">S</span>
                    <span className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-cyan-600 grid place-items-center text-[9px] font-bold text-white">N</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">12 others</span>
                </div>
              </div>

              {/* Live Transcript Stream */}
              <div className="bg-[#1e1f23] rounded-2xl p-2.5 border border-zinc-800 max-h-[90px] overflow-y-auto space-y-1">
                <span className="text-[10px] font-black tracking-wider text-blue-400 uppercase block">Live Audio Stream</span>
                {meetingListener.transcriptLines.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">
                    {meetingListener.isListening ? "Listening to meeting audio... Speak or play tab audio." : "Click Green/Share button below to connect live meeting audio."}
                  </p>
                ) : (
                  meetingListener.transcriptLines.slice(-3).map((line) => (
                    <p key={line.id} className="text-[11px] leading-tight">
                      <span className="font-bold text-zinc-300">{line.speakerName}:</span>{" "}
                      <span className="text-zinc-400">{line.text}</span>
                    </p>
                  ))
                )}
                {meetingListener.interimText && (
                  <p className="text-[11px] italic text-blue-300">{meetingListener.interimText}</p>
                )}
              </div>
            </div>
          )}

          {/* VIEW: NOTES LIST */}
          {view === "notes" && (
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Saved Notes</h3>
              {!meetings || meetings.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No saved notes</p>
              ) : (
                meetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedNoteId(m.id);
                      setView("note-detail");
                    }}
                    className="w-full text-left rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-3 transition-colors"
                  >
                    <h4 className="text-xs font-bold text-white truncate">{m.title}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(m.started_at).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* VIEW: NOTE DETAIL */}
          {view === "note-detail" && selectedMeeting && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <button onClick={() => setView("notes")} className="text-xs text-blue-400 font-bold flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h3 className="text-sm font-bold text-white">{selectedMeeting.title}</h3>
              {selectedMeeting.summary && (
                <div className="rounded-xl bg-zinc-900 p-2.5 border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Summary</span>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">{selectedMeeting.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* EMOJI REACTIONS BAR (Matching Google Meet PiP screenshot bottom pill) */}
          <div className="px-3 py-1.5 bg-[#18181b] border-t border-zinc-800 flex items-center justify-center gap-2" data-no-drag>
            {["💖", "👍", "🎉", "👏", "💡"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => triggerReaction(emoji)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-transform active:scale-125 text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* GOOGLE MEET BOTTOM CONTROL BAR (Unified AI Bot & Video Recorder) */}
          <div className="px-3 py-2 bg-[#202124] border-t border-zinc-800 flex items-center justify-center gap-2 shrink-0" data-no-drag>
            {/* Mic Toggle Button */}
            <button
              onClick={meetingListener.toggleMic}
              className={cn(
                "p-2 rounded-full font-bold transition-all shadow-md",
                meetingListener.isMicMuted ? "bg-red-500 text-white" : "bg-zinc-700 text-white hover:bg-zinc-600",
              )}
              title={meetingListener.isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {meetingListener.isMicMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>

            {/* AI Audio Bot Button */}
            <button
              onClick={meetingListener.isListening && !meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startAudioBot}
              className={cn(
                "p-2 rounded-full font-bold transition-all shadow-md",
                meetingListener.isListening && !meetingListener.isScreenRecording ? "bg-emerald-600 text-white ring-2 ring-emerald-400" : "bg-zinc-700 text-white hover:bg-zinc-600",
              )}
              title="Audio-Only AI Bot Mode (Transcribe & Diarize)"
            >
              <Share className="h-3.5 w-3.5" />
            </button>

            {/* Video Screen Recording Button */}
            <button
              onClick={meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startScreenRecording}
              className={cn(
                "p-2 rounded-full font-bold transition-all shadow-md",
                meetingListener.isScreenRecording ? "bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse" : "bg-zinc-700 text-white hover:bg-zinc-600",
              )}
              title="Full Video & Screen Recorder + AI Bot"
            >
              {meetingListener.isScreenRecording ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
            </button>

            {/* View Switcher Button */}
            <button
              onClick={() => setView(view === "live" ? "notes" : "live")}
              className="p-2 rounded-full bg-zinc-700 text-white hover:bg-zinc-600 transition-all"
              title="Toggle View Mode"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>

            {/* Red End Call / Save Pill Button */}
            <button
              onClick={meetingListener.stopOverhearing}
              className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-lg transition-all"
              title="End Meeting Audio/Video Recording & Save Note"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span>End</span>
            </button>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      {!isMinimized && !isPiP && (
        <div className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize" onMouseDown={handleResizeStart}>
          <div className="absolute bottom-1 right-1 h-2 w-2 rounded-br border-b-2 border-r-2 border-zinc-500" />
        </div>
      )}
    </div>
  );

  const getPipContainer = () => {
    if (!pipWindowRef.current) return null;
    return pipWindowRef.current.document.getElementById("pip-root");
  };
  const pipContainer = getPipContainer();

  return (
    <>
      {!isPiP && (
        <div
          ref={containerRef}
          className={cn(
            "fixed z-50 flex flex-col shadow-2xl rounded-3xl overflow-hidden",
            isDragging ? "cursor-grabbing" : "cursor-default",
            className,
          )}
          style={{
            left: position.x,
            top: position.y,
            width: isMinimized ? 320 : size.width,
            height: isMinimized ? 56 : size.height,
          }}
          onMouseDown={handleMouseDown}
        >
          {renderOverlayContent()}
        </div>
      )}

      {isPiP && pipContainer && createPortal(renderOverlayContent(), pipContainer)}
    </>
  );
}
