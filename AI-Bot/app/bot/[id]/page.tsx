"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient as supabase, Bot } from "@/lib/supabase-client";
import { useSupabaseRealTime } from "@/hooks/useSupabaseRealTime";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Copy,
  Calendar,
  Video,
  FileText,
  Trash2,
  Circle,
  CheckCircle,
  AlertCircle,
  XCircle,
  Phone,
  Loader,
  Monitor,
  Users,
  Camera,
} from "lucide-react";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

interface TranscriptWord {
  text: string;
  start_timestamp: { relative: number; absolute: string };
  end_timestamp: { relative: number; absolute: string };
}

interface TranscriptSegment {
  participant: {
    id: number | null;
    name: string | null;
    is_host: boolean | null;
  } | null;
  words: TranscriptWord[];
}

export default function BotDetails() {
  const params = useParams();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [removing, setRemoving] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const handleSupabaseUpdate = useCallback(
    (updatedBot: Bot) => {
      setLastUpdateTime(new Date().toISOString());
      const oldUrl = bot?.transcript_url;
      setBot(updatedBot);
      if (updatedBot.transcript_url && updatedBot.transcript_url !== oldUrl) {
        fetchTranscript(updatedBot.transcript_url);
      }
    },
    [bot]
  );

  const { isConnected } = useSupabaseRealTime(
    (params.id as string) || "",
    handleSupabaseUpdate
  );

  useEffect(() => {
    if (params.id) fetchBot(params.id as string);
  }, [params.id]);

  const fetchBot = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("id", id)
        .single();
      if (!error) {
        setBot(data);
        if (data.transcript_url) fetchTranscript(data.transcript_url);
      }
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  const fetchTranscript = async (url: string) => {
    try {
      const res = await fetch(url);
      setTranscript(await res.json());
    } catch { /* noop */ }
  };

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  const handleRemoveBot = async () => {
    if (!bot) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/remove-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: bot.id }),
      });
      if (res.ok) await fetchBot(bot.id);
    } catch { /* noop */ } finally {
      setRemoving(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "zoom": return <Video className="w-4 h-4" />;
      case "teams":
      case "microsoft teams": return <Users className="w-4 h-4" />;
      case "meet":
      case "google meet": return <Camera className="w-4 h-4" />;
      case "webex": return <Monitor className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ink-border";
    switch (status) {
      case "done": return <span className={`${base} bg-[oklch(0.82_0.15_165)]`}><CheckCircle className="w-3 h-3" /> Done</span>;
      case "creating":
      case "joining_call":
      case "in_call_recording": return <span className={`${base} bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)]`}><Circle className="w-3 h-3 blink" /> Live</span>;
      case "call_ended": return <span className={`${base} bg-[oklch(0.88_0.19_95)]`}><AlertCircle className="w-3 h-3" /> Ended</span>;
      case "failed": return <span className={`${base} bg-[oklch(0.62_0.24_25)] text-[oklch(0.985_0.008_90)]`}><XCircle className="w-3 h-3" /> Failed</span>;
      default: return <span className={`${base} bg-muted`}><Circle className="w-3 h-3" /> {status}</span>;
    }
  };

  const getTimelineIcon = (code: string) => {
    switch (code) {
      case "joining_call": return <Phone className="w-3 h-3" />;
      case "in_call_recording": return <Video className="w-3 h-3" />;
      case "done": return <CheckCircle className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  const formatTimestamp = (ts: string) => new Date(ts).toLocaleString();
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-grid h-16 w-16 place-items-center rounded-2xl ink-border bg-[oklch(0.55_0.24_285)] pop-lg mb-4">
            <Loader className="w-8 h-8 animate-spin text-[oklch(0.985_0.008_90)]" />
          </div>
          <p className="font-bold text-muted-foreground">Loading bot details…</p>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-grid h-16 w-16 place-items-center rounded-2xl ink-border bg-[oklch(0.88_0.19_95)] pop-lg mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black mb-3">Bot not found</h2>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-10 items-center gap-2 rounded-xl ink-border bg-card px-4 font-bold text-sm pop"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-full px-4 sm:px-6">

        {/* Header */}
        <header className="flex items-center gap-3 py-6 border-b-2 border-ink">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-card pop-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{bot.name}</h1>
              {getStatusBadge(bot.bot_status)}
              {isConnected && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ink-border bg-[oklch(0.82_0.15_165)]">
                  <Circle className="w-2.5 h-2.5 blink" /> Live
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-bold">
              {bot.meeting_name || "Meeting Bot Details"}
            </p>
          </div>
        </header>

        {/* Three Column Layout */}
        <div className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Col 1: Bot Metadata */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl ink-border bg-card p-5 pop">
                <h2 className="font-black text-base mb-4 border-b-2 border-ink pb-2">Bot Info</h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Name</span>
                    <p className="font-bold mt-0.5">{bot.name}</p>
                  </div>

                  <div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Bot ID</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5 flex-1 truncate font-mono">{bot.id}</code>
                      <button onClick={() => handleCopy(bot.id)} className="p-1 rounded ink-border bg-card pop-sm">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Platform</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-grid h-6 w-6 place-items-center rounded ink-border bg-[oklch(0.82_0.15_165)]">
                        {getPlatformIcon(bot.meeting_platform)}
                      </span>
                      <span className="capitalize font-bold">{bot.meeting_platform}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Meeting URL</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5 flex-1 truncate font-mono">{bot.meeting_url}</code>
                      <button onClick={() => handleCopy(bot.meeting_url)} className="p-1 rounded ink-border bg-card pop-sm">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {bot.joined_at && (
                    <div>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Joined At</span>
                      <div className="flex items-center gap-1 mt-0.5 font-bold">
                        <Calendar className="w-3.5 h-3.5" /> {formatTimestamp(bot.joined_at)}
                      </div>
                    </div>
                  )}

                  {bot.recording_status && (
                    <div>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Recording</span>
                      <div className="flex items-center gap-1 mt-0.5 font-bold">
                        <Video className="w-3.5 h-3.5" /> <span className="capitalize">{bot.recording_status}</span>
                      </div>
                    </div>
                  )}

                  {bot.transcript_status && (
                    <div>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">Transcript</span>
                      <div className="flex items-center gap-1 mt-0.5 font-bold">
                        <FileText className="w-3.5 h-3.5" /> <span className="capitalize">{bot.transcript_status}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remove bot */}
                <div className="mt-5 pt-4 border-t-2 border-ink">
                  <button
                    onClick={handleRemoveBot}
                    disabled={removing || bot.bot_status === "done" || bot.bot_status === "call_ended"}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl ink-border bg-[oklch(0.62_0.24_25)] text-[oklch(0.985_0.008_90)] font-bold text-sm pop disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removing ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {removing ? "Removing…" : (bot.bot_status === "done" || bot.bot_status === "call_ended") ? "Already Left" : "Remove from Call"}
                  </button>
                  {(bot.bot_status === "done" || bot.bot_status === "call_ended") && (
                    <p className="text-xs text-muted-foreground mt-2 text-center font-bold">Bot has already left the meeting</p>
                  )}
                </div>
              </div>
            </div>

            {/* Col 2: Video + Transcript */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              {/* Video */}
              <div className="rounded-2xl ink-border bg-card p-5 pop">
                <h2 className="font-black text-base mb-4 border-b-2 border-ink pb-2">Recording</h2>
                {bot.recording_url ? (
                  <div className="relative w-full aspect-video rounded-xl ink-border overflow-hidden">
                    <ReactPlayer
                      url={bot.recording_url}
                      controls
                      width="100%"
                      height="100%"
                      style={{ position: "absolute", top: 0, left: 0 }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl ink-border bg-muted aspect-video">
                    <div className="text-center">
                      <div className="inline-grid h-14 w-14 place-items-center rounded-2xl ink-border bg-card pop mb-3">
                        <Video className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground">Recording not available yet</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="rounded-2xl ink-border bg-card p-5 pop flex-1">
                <h2 className="font-black text-base mb-4 border-b-2 border-ink pb-2">Transcript</h2>
                <div className="h-80 overflow-y-auto pr-1 space-y-4">
                  {transcript ? (
                    transcript.map((segment, segIndex) => (
                      <div key={segIndex} className="border-b-2 border-dashed border-muted pb-3 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full ink-border bg-[oklch(0.55_0.24_285)] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-black text-[oklch(0.985_0.008_90)]">
                              {segment.participant?.name ? segment.participant.name.charAt(0) : "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-black truncate">
                                {segment.participant?.name || "Unknown Speaker"}
                              </p>
                              {segment.participant?.is_host && (
                                <span className="text-xs ink-border bg-[oklch(0.88_0.19_95)] px-1.5 py-0.5 rounded-full font-bold">Host</span>
                              )}
                              {segment.words.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-auto font-bold">
                                  {formatDuration(segment.words[0].start_timestamp.relative)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {segment.words.map((w, wi) => <span key={wi} className="mr-1">{w.text}</span>)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="inline-grid h-14 w-14 place-items-center rounded-2xl ink-border bg-muted pop mb-3">
                          <FileText className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Transcript not available yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Col 3: Status Timeline */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl ink-border bg-card p-5 pop">
                <h2 className="font-black text-base mb-4 border-b-2 border-ink pb-2">Timeline</h2>
                {bot.status_changes && Array.isArray(bot.status_changes) && bot.status_changes.length > 0 ? (
                  <ol className="relative border-l-2 border-ink space-y-0">
                    {bot.status_changes.map((change, index) => (
                      <li key={index} className="mb-6 ml-5 last:mb-0">
                        <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ink-border bg-[oklch(0.55_0.24_285)] text-[oklch(0.985_0.008_90)]">
                          {getTimelineIcon(change.code)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-xs font-black capitalize">
                              {change.code.replace("_", " ")}
                            </h3>
                            {index === (bot.status_changes?.length || 0) - 1 && (
                              <span className="text-xs ink-border bg-[oklch(0.82_0.15_165)] px-1.5 py-0.5 rounded-full font-bold">Latest</span>
                            )}
                          </div>
                          <time className="text-xs text-muted-foreground font-bold block">
                            {formatTimestamp(change.created_at)}
                          </time>
                          {change.sub_code && (
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">{change.sub_code.replace("_", " ")}</p>
                          )}
                          {change.message && (
                            <p className="text-xs text-muted-foreground mt-0.5">{change.message}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-grid h-12 w-12 place-items-center rounded-xl ink-border bg-muted pop mb-3">
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No status changes yet</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
