import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Save, Trash2, Loader2, AlertCircle, Video, VideoOff, Radio, Sparkles } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useServerFn } from "@tanstack/react-start";
import { saveMeeting } from "@/lib/meetings.functions";
import { toast } from "sonner";
import { useMeetingListener } from "@/hooks/use-meeting-listener";

export function LiveMeeting() {
  const meetingListener = useMeetingListener();
  const { isAuthenticated } = useSession();
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const save = useServerFn(saveMeeting);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meetingListener.isListening) return;
    if (!startedAt) setStartedAt(Date.now());
    const t = setInterval(() => setElapsed(Date.now() - (startedAt ?? Date.now())), 1000);
    return () => clearInterval(t);
  }, [meetingListener.isListening, startedAt]);

  const fullText = useMemo(() => {
    return meetingListener.transcriptLines
      .map((l) => `${l.speakerName}: ${l.text}`)
      .join("\n");
  }, [meetingListener.transcriptLines]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [fullText, meetingListener.interimText]);

  const wordCount = useMemo(
    () => fullText.trim().split(/\s+/).filter(Boolean).length,
    [fullText],
  );

  async function handleSave() {
    if (!isAuthenticated) {
      toast.info("Sign in to save meetings — your transcript will stay here.");
      navigate({ to: "/auth" });
      return;
    }
    if (!fullText.trim()) {
      toast.error("Nothing to save yet.");
      return;
    }
    setSaving(true);
    try {
      const saved = await meetingListener.stopOverhearing();
      if (saved) {
        navigate({ to: "/notes/$id", params: { id: saved.id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (!confirm("Clear this transcript?")) return;
    meetingListener.stopOverhearing();
    setStartedAt(null);
    setElapsed(0);
  }

  return (
    <div className="space-y-4 p-4 h-full flex flex-col">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-xl font-black tracking-tight">Live meeting</h2>
          {meetingListener.isScreenRecording && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-black text-rose-600 animate-pulse">
              <Video className="h-3 w-3" /> Video Recording
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {formatTime(Math.floor(elapsed / 1000))} · {wordCount} words
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl ink-border bg-card p-5 pop space-y-3"
      >
        {!fullText && !meetingListener.interimText ? (
          <div className="grid h-full min-h-[150px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl ink-border bg-violet text-white pop">
                <Radio className="h-6 w-6" />
              </div>
              <p className="mt-3 font-bold text-sm">Choose Audio AI Bot or Video Screen Recording below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {meetingListener.transcriptLines.map((line) => (
              <div key={line.id} className="text-sm">
                <span className="font-bold text-violet-700">{line.speakerName} ({line.timestamp}):</span>{" "}
                <span className="text-ink/80">{line.text}</span>
              </div>
            ))}
            {meetingListener.interimText && (
              <p className="text-sm italic text-muted-foreground">{meetingListener.interimText}</p>
            )}
          </div>
        )}
      </div>

      {/* Unified Action Bar */}
      <div className="grid gap-2 sm:grid-cols-4">
        {/* Audio AI Bot Button */}
        <button
          onClick={meetingListener.isListening && !meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startAudioBot}
          className={`flex h-12 items-center justify-center gap-2 rounded-xl ink-border text-xs font-black pop ${
            meetingListener.isListening && !meetingListener.isScreenRecording ? "bg-pink text-ink" : "bg-emerald-600 text-white"
          }`}
        >
          <Radio className="h-4 w-4" />
          {meetingListener.isListening && !meetingListener.isScreenRecording ? "Stop Audio Bot" : "Audio AI Bot"}
        </button>

        {/* Video Screen Recorder Button */}
        <button
          onClick={meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startScreenRecording}
          className={`flex h-12 items-center justify-center gap-2 rounded-xl ink-border text-xs font-black pop ${
            meetingListener.isScreenRecording ? "bg-rose-600 text-white animate-pulse" : "bg-violet text-white"
          }`}
        >
          {meetingListener.isScreenRecording ? (
            <>
              <VideoOff className="h-4 w-4" /> Stop Video
            </>
          ) : (
            <>
              <Video className="h-4 w-4" /> Record Screen + Video
            </>
          )}
        </button>

        {/* Save & Summarize Button */}
        <button
          onClick={handleSave}
          disabled={saving || !fullText.trim()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-yellow px-4 text-xs font-black pop disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {saving ? "Summarizing…" : "Save AI Note"}
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          disabled={!fullText.trim() && !meetingListener.isListening}
          className="flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-card px-3 text-xs font-bold pop disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      </div>

      {!isAuthenticated && (
        <p className="text-center text-xs text-muted-foreground">
          You're in guest mode. Recording works — sign in to save & search.
        </p>
      )}
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
