import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { joinMeetingBot } from "@/lib/meetings.functions";
import { Bot, Loader2, Link2, CheckCircle2, Mic, Users, Sparkles, ArrowRight, ShieldCheck, Video, Radio, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AudioFileUpload } from "@/components/AudioFileUpload";
import { useMeetingListener } from "@/hooks/use-meeting-listener";

export const Route = createFileRoute("/_authenticated/bot")({
  head: () => ({ meta: [{ title: "AI Meeting Bot — urMeetings" }] }),
  component: MeetingBotPage,
});

function MeetingBotPage() {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("urMeetings AI Bot");
  const [meetingTopic, setMeetingTopic] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinStep, setJoinStep] = useState<"idle" | "connecting" | "recording" | "summarizing" | "done">("idle");
  const [resultData, setResultData] = useState<{
    id: string;
    title: string;
    platform: string;
    summary: string;
    action_items: string[];
    transcript: string;
  } | null>(null);

  const joinBotFn = useServerFn(joinMeetingBot);
  const navigate = useNavigate();
  const meetingListener = useMeetingListener();

  async function handleDeployBot(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingUrl.trim()) {
      toast.error("Please enter a meeting link");
      return;
    }

    setIsJoining(true);
    setJoinStep("connecting");
    setResultData(null);

    // Also trigger local audio overhearing so user can listen to the tab directly
    meetingListener.startOverhearing();

    setTimeout(() => setJoinStep("recording"), 1500);
    setTimeout(() => setJoinStep("summarizing"), 3500);

    try {
      const result = await joinBotFn({
        data: {
          meetingUrl: meetingUrl.trim(),
          botName: botName.trim() || "urMeetings AI Bot",
          meetingTopic: meetingTopic.trim() || undefined,
        },
      });

      setTimeout(() => {
        setJoinStep("done");
        setResultData(result);
        setIsJoining(false);
        toast.success(`AI Bot finished recording: ${result.title}`);
      }, 5000);
    } catch (err) {
      setIsJoining(false);
      setJoinStep("idle");
      toast.error(err instanceof Error ? err.message : "Bot failed to join meeting");
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet/20 px-3 py-1 text-xs font-black text-ink uppercase tracking-wider mb-2">
              <Bot className="h-4 w-4" /> AI Assistant Bot
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink">
              Deploy AI Meeting Bot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste your Google Meet, Zoom, MS Teams, or Jitsi link. Our bot joins, listens to live tab audio, transcribes who said what, and emails you the AI summary.
            </p>
          </div>
        </div>

        {/* Unified Dual-Mode Recorder & AI Bot Banner */}
        <div className="rounded-3xl ink-border bg-emerald-100/70 p-6 pop flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800 tracking-wider">
              <Volume2 className="h-4 w-4" /> Unified Meeting Recorder & AI Bot
            </div>
            <h3 className="text-xl font-black text-emerald-950">Overhear Audio or Record Full Screen Video</h3>
            <p className="text-xs text-emerald-900 font-medium">
              Choose Audio-Only AI Bot mode for lightweight speech summaries, or Full Video Recording to save `.webm` videos with AI summaries!
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={meetingListener.isListening && !meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startAudioBot}
              className={`h-11 px-4 rounded-2xl ink-border font-black text-xs pop flex items-center gap-2 ${
                meetingListener.isListening && !meetingListener.isScreenRecording ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              <Radio className="h-4 w-4 animate-pulse" />
              {meetingListener.isListening && !meetingListener.isScreenRecording ? "Stop Audio Bot" : "Audio AI Bot Mode"}
            </button>

            <button
              onClick={meetingListener.isScreenRecording ? meetingListener.stopOverhearing : meetingListener.startScreenRecording}
              className={`h-11 px-4 rounded-2xl ink-border font-black text-xs pop flex items-center gap-2 ${
                meetingListener.isScreenRecording ? "bg-red-500 text-white" : "bg-rose-600 text-white"
              }`}
            >
              <Video className="h-4 w-4" />
              {meetingListener.isScreenRecording ? "Stop Video Recording" : "Record Video Screen + AI"}
            </button>
          </div>
        </div>

        {/* Deploy Form & Live Status Grid */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Main Bot Join Form */}
          <div className="md:col-span-7 rounded-3xl ink-border bg-yellow/30 p-6 pop">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-700" /> Meeting Details
            </h2>

            <form onSubmit={handleDeployBot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                  Meeting Link (Google Meet / Zoom / Teams / Jitsi) *
                </label>
                <div className="relative">
                  <Video className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    required
                    placeholder="https://meet.google.com/abc-defg-hij or Zoom link"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    disabled={isJoining}
                    className="w-full rounded-2xl ink-border bg-card pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-violet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                    Bot Display Name
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    disabled={isJoining}
                    className="w-full rounded-2xl ink-border bg-card px-4 py-2.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                    Topic / Context (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Design Review"
                    value={meetingTopic}
                    onChange={(e) => setMeetingTopic(e.target.value)}
                    disabled={isJoining}
                    className="w-full rounded-2xl ink-border bg-card px-4 py-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isJoining || !meetingUrl.trim()}
                className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-2xl ink-border bg-violet text-primary-foreground font-black text-sm pop disabled:opacity-60"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Deploying AI Bot...
                  </>
                ) : (
                  <>
                    <Bot className="h-5 w-5" /> Deploy Bot to Meeting
                  </>
                )}
              </button>
            </form>

            {/* Live Progress Stepper */}
            {isJoining && (
              <div className="mt-6 border-t border-ink/10 pt-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-violet-900">
                  Live Bot Progress Status:
                </p>
                <div className="space-y-2 text-xs font-bold">
                  <div className={`flex items-center gap-2 ${joinStep === "connecting" ? "text-violet-700 font-extrabold" : "text-ink/60"}`}>
                    {joinStep === "connecting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    Step 1: Connecting bot "{botName}" to meeting room...
                  </div>
                  <div className={`flex items-center gap-2 ${joinStep === "recording" ? "text-violet-700 font-extrabold" : joinStep === "summarizing" || joinStep === "done" ? "text-ink/60" : "text-ink/30"}`}>
                    {joinStep === "recording" ? <Loader2 className="h-4 w-4 animate-spin" /> : joinStep === "summarizing" || joinStep === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Mic className="h-4 w-4" />}
                    Step 2: Recording audio & tracking speaker attribution ("who said what")...
                  </div>
                  <div className={`flex items-center gap-2 ${joinStep === "summarizing" ? "text-violet-700 font-extrabold" : joinStep === "done" ? "text-ink/60" : "text-ink/30"}`}>
                    {joinStep === "summarizing" ? <Loader2 className="h-4 w-4 animate-spin" /> : joinStep === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4" />}
                    Step 3: Generating executive AI summary & speaker insights...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Capabilities Card */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-3xl ink-border bg-mint/40 p-6 pop">
              <h3 className="text-lg font-black mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-800" /> How Bot Works
              </h3>
              <ul className="space-y-3 text-xs leading-relaxed font-semibold text-ink/80">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Automatic Link Join:</strong> Connects to Google Meet, Zoom, MS Teams, Webex & Jitsi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mic className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Speaker Attribution:</strong> Identifies individual participants and attributes quotes accurately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>AI Executive Summary:</strong> Extracts key decisions, topics, and actionable next steps.</span>
                </li>
              </ul>
            </div>

            {/* Result Preview Box if ready */}
            {resultData && (
              <div className="rounded-3xl ink-border bg-card p-6 pop space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-700">Meeting Summary Ready</span>
                  <span className="text-xs font-bold text-muted-foreground">{resultData.platform}</span>
                </div>
                <h4 className="text-base font-black">{resultData.title}</h4>
                <p className="text-xs line-clamp-3 text-ink/80">{resultData.summary}</p>
                <button
                  onClick={() => navigate({ to: "/notes/$id", params: { id: resultData.id } })}
                  className="w-full h-10 flex items-center justify-center gap-1 rounded-xl ink-border bg-yellow text-xs font-black pop-sm"
                >
                  View Full Bot Notes <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio / Video File Transcriber Section */}
        <section className="pt-6 border-t border-border">
          <AudioFileUpload />
        </section>
      </div>
    </AppShell>
  );
}
