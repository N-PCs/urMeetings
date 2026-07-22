
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Save, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSession } from "@/hooks/use-session";
import { useServerFn } from "@tanstack/react-start";
import { saveMeeting } from "@/lib/meetings.functions";
import { toast } from "sonner";

export function LiveMeeting() {
  const speech = useSpeechRecognition();
  const { isAuthenticated } = useSession();
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const save = useServerFn(saveMeeting);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!speech.listening) return;
    if (!startedAt) setStartedAt(Date.now());
    const t = setInterval(() => setElapsed(Date.now() - (startedAt ?? Date.now())), 1000);
    return () => clearInterval(t);
  }, [speech.listening, startedAt]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [speech.finalTranscript, speech.interimTranscript]);

  const wordCount = useMemo(
    () => speech.finalTranscript.trim().split(/\s+/).filter(Boolean).length,
    [speech.finalTranscript],
  );

  function handleToggle() {
    if (speech.listening) {
      speech.stop();
    } else {
      if (!speech.finalTranscript) setStartedAt(Date.now());
      speech.start();
    }
  }

  function handleClear() {
    if (!confirm("Clear this transcript?")) return;
    speech.stop();
    speech.reset();
    setStartedAt(null);
    setElapsed(0);
  }

  async function handleSave() {
    if (!isAuthenticated) {
      toast.info("Sign in to save meetings — your transcript will stay here.");
      navigate({ to: "/auth" });
      return;
    }
    const transcript = speech.finalTranscript.trim();
    if (!transcript) {
      toast.error("Nothing to save yet.");
      return;
    }
    setSaving(true);
    try {
      speech.stop();
      const durationSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined;
      const result = await save({ data: { transcript, source: "live", durationSeconds } });
      toast.success(`Saved: ${result.title}`);
      speech.reset();
      setStartedAt(null);
      setElapsed(0);
      navigate({ to: "/notes/$id", params: { id: result.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 h-full flex flex-col">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="truncate text-xl font-black tracking-tight">Live meeting</h2>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {formatTime(Math.floor(elapsed / 1000))} · {wordCount} words
        </span>
      </div>

      {!speech.supported && (
        <div className="flex items-start gap-3 rounded-xl ink-border bg-yellow p-4 pop-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Live transcription isn't supported in this browser</p>
            <p className="mt-1">Chrome, Edge, or Safari on desktop works best.</p>
          </div>
        </div>
      )}

      {speech.error && (
        <div className="flex items-start gap-3 rounded-xl ink-border bg-pink p-4 pop-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Mic error: {speech.error}</p>
            <p className="mt-1">Grant microphone permission and try again.</p>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl ink-border bg-card p-5 pop"
      >
        {!speech.finalTranscript && !speech.interimTranscript ? (
          <div className="grid h-full min-h-[150px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl ink-border bg-pink pop">
                <Mic className="h-6 w-6" />
              </div>
              <p className="mt-3 font-bold text-sm">Tap record to start transcribing</p>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {speech.finalTranscript}
            {speech.interimTranscript && (
              <span className="text-muted-foreground">{speech.interimTranscript}</span>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <button
          onClick={handleToggle}
          disabled={!speech.supported}
          className={`flex h-12 items-center justify-center gap-2 rounded-xl ink-border text-base font-black pop disabled:opacity-60 ${
            speech.listening ? "bg-pink" : "bg-violet text-primary-foreground"
          }`}
        >
          {speech.listening ? (
            <>
              <span className="h-2 w-2 rounded-full bg-ink blink" />
              <Square className="h-4 w-4" /> Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" /> Record
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !speech.finalTranscript.trim()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-yellow px-4 text-sm font-black pop disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Summarizing…" : "Save"}
        </button>
        <button
          onClick={handleClear}
          disabled={!speech.finalTranscript && !speech.interimTranscript}
          className="flex h-12 items-center justify-center gap-2 rounded-xl ink-border bg-card px-3 text-sm font-bold pop disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
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
