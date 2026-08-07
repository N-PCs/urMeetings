import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { joinMeetingBot, createRecallBot, listRecallBots } from "@/lib/meetings.functions";
import {
  Bot,
  Loader2,
  Link2,
  CheckCircle2,
  Mic,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  Radio,
  Volume2,
  LayoutDashboard,
  Plus,
  Calendar,
  AlertCircle,
  XCircle,
  Circle,
  Monitor,
  Camera,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bot")({
  head: () => ({ meta: [{ title: "urBrief AI Meeting Bot — urMeetings" }] }),
  component: MeetingBotPage,
});

interface RecallBotItem {
  id: string;
  name: string;
  meeting_url: string;
  meeting_platform: string;
  bot_status: string;
  created_at: string;
  recording_status?: string;
  transcript_status?: string;
  meeting_name?: string;
}

function MeetingBotPage() {
  const [activeTab, setActiveTab] = useState<"deploy" | "dashboard">("deploy");

  // Form state
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("urBrief");

  const [isJoining, setIsJoining] = useState(false);
  const [joinStep, setJoinStep] = useState<"idle" | "connecting" | "recording" | "done">("idle");

  // Dashboard state
  const [botsList, setBotsList] = useState<RecallBotItem[]>([]);
  const [loadingBots, setLoadingBots] = useState(false);

  const createRecallBotFn = useServerFn(createRecallBot);
  const fetchBotsFn = useServerFn(listRecallBots);

  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadBots();
    }
  }, [activeTab]);

  async function loadBots() {
    setLoadingBots(true);
    try {
      const data = (await fetchBotsFn()) as unknown as RecallBotItem[];
      setBotsList(data || []);
    } catch (err) {
      console.error("Failed to load bots:", err);
    } finally {
      setLoadingBots(false);
    }
  }

  async function handleDeployBot(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingUrl.trim()) {
      toast.error("Please enter a meeting link");
      return;
    }

    setIsJoining(true);
    setJoinStep("connecting");

    // Real Bot deployment
    try {
      const result = await createRecallBotFn({
        data: {
          meetingUrl: meetingUrl.trim(),
          botName: botName.trim() || "urBrief",
        },
      });

      setJoinStep("done");
      setIsJoining(false);
      toast.success(`urBrief bot deployed to meeting! Bot ID: ${result.bot_id}`);
      setActiveTab("dashboard");
    } catch (err) {
      setIsJoining(false);
      setJoinStep("idle");
      const errMsg = err instanceof Error ? err.message : "Failed to deploy bot";
      toast.error(errMsg);
    }
  }

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ink-border";
    switch (status) {
      case "done":
        return <span className={`${base} bg-mint`}><CheckCircle2 className="w-3 h-3 text-emerald-800" /> Done</span>;
      case "creating":
      case "joining_call":
      case "in_call_recording":
        return <span className={`${base} bg-violet text-primary-foreground`}><Circle className="w-3 h-3 blink" /> Live</span>;
      case "call_ended":
        return <span className={`${base} bg-yellow`}><AlertCircle className="w-3 h-3" /> Ended</span>;
      case "failed":
        return <span className={`${base} bg-pink text-primary-foreground`}><XCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className={`${base} bg-muted`}><Circle className="w-3 h-3" /> {status}</span>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "zoom": return <Video className="w-4 h-4" />;
      case "teams":
      case "microsoft teams": return <Users className="w-4 h-4" />;
      case "meet":
      case "google meet": return <Camera className="w-4 h-4" />;
      case "webex": return <Monitor className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet/20 px-3 py-1 text-xs font-black text-ink uppercase tracking-wider mb-2">
              <Bot className="h-4 w-4 text-violet" /> urBrief AI Assistant Bot
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink">
              urBrief Meeting Bot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deploy urBrief to Google Meet, Zoom, MS Teams, or Webex. Automatically record, transcribe, and summarize calls.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-muted p-1.5 rounded-2xl ink-border pop-sm">
            <button
              onClick={() => setActiveTab("deploy")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "deploy"
                  ? "bg-violet text-primary-foreground ink-border shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" /> Deploy Bot
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "dashboard"
                  ? "bg-violet text-primary-foreground ink-border shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Bot Dashboard
            </button>
          </div>
        </div>

        {/* TAB 1: DEPLOY BOT */}
        {activeTab === "deploy" && (
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-7 rounded-3xl ink-border bg-yellow/30 p-6 pop">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-violet" /> Deploy urBrief Bot
                </h2>
              </div>

              <form onSubmit={handleDeployBot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                    Meeting Link (Google Meet / Zoom / Teams / Webex) *
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

                <button
                  type="submit"
                  disabled={isJoining || !meetingUrl.trim()}
                  className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-2xl ink-border bg-violet text-primary-foreground font-black text-sm pop disabled:opacity-60"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deploying urBrief...
                    </>
                  ) : (
                    <>
                      <Bot className="h-5 w-5" /> Deploy urBrief to Meeting
                    </>
                  )}
                </button>
              </form>

              {/* Progress Stepper */}
              {isJoining && (
                <div className="mt-6 border-t border-ink/10 pt-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-violet">
                    Live Bot Progress Status:
                  </p>
                  <div className="space-y-2 text-xs font-bold">
                    <div className={`flex items-center gap-2 ${joinStep === "connecting" ? "text-violet font-extrabold" : "text-ink/60"}`}>
                      {joinStep === "connecting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      Step 1: Dispatching bot "{botName}"...
                    </div>
                    <div className={`flex items-center gap-2 ${joinStep === "recording" ? "text-violet font-extrabold" : joinStep === "done" ? "text-ink/60" : "text-ink/30"}`}>
                      {joinStep === "recording" ? <Loader2 className="h-4 w-4 animate-spin" /> : joinStep === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Mic className="h-4 w-4" />}
                      Step 2: Bot joining call, recording audio & transcript...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Side Information */}
            <div className="md:col-span-5 space-y-4">
              <div className="rounded-3xl ink-border bg-mint/40 p-6 pop">
                <h3 className="text-lg font-black mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-800" /> How urBrief Works
                </h3>
                <ul className="space-y-3 text-xs leading-relaxed font-semibold text-ink/80">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>Auto-Join Call:</strong> urBrief joins Google Meet, Zoom, Teams, and Webex calls as a silent participant.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mic className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>Real-time Diarization:</strong> Captures high quality audio and assigns speaker labels automatically.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>Instant AI Summary:</strong> Generates key takeaways and action items once the call finishes.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-violet" /> Deployed Bots
              </h2>
              <button
                onClick={loadBots}
                disabled={loadingBots}
                className="text-xs font-bold text-violet hover:underline flex items-center gap-1"
              >
                {loadingBots && <Loader2 className="h-3 w-3 animate-spin" />} Refresh
              </button>
            </div>

            {loadingBots ? (
              <div className="py-12 text-center text-muted-foreground font-bold flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-violet" />
                Loading deployed bots...
              </div>
            ) : botsList.length === 0 ? (
              <div className="rounded-3xl ink-border bg-card p-10 text-center space-y-4 pop">
                <div className="inline-grid h-16 w-16 place-items-center rounded-2xl ink-border bg-yellow pop-sm mx-auto">
                  <Bot className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black">No active bots found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    You haven't deployed any urBrief bots yet. Switch to the Deploy Bot tab to send urBrief to your first call!
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("deploy")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl ink-border bg-violet px-4 text-xs font-bold text-primary-foreground pop"
                >
                  <Plus className="h-4 w-4" /> Deploy Your First Bot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {botsList.map((bot) => (
                  <div key={bot.id} className="rounded-2xl ink-border bg-card p-5 pop space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-grid h-9 w-9 place-items-center rounded-xl ink-border bg-mint">
                          {getPlatformIcon(bot.meeting_platform)}
                        </span>
                        <div>
                          <h4 className="font-black text-sm">{bot.name || "urBrief"}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{bot.meeting_platform}</p>
                        </div>
                      </div>
                      {getStatusBadge(bot.bot_status)}
                    </div>

                    <p className="text-xs font-mono text-muted-foreground truncate bg-muted p-2 rounded-lg ink-border">
                      {bot.meeting_url}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground font-bold border-t border-ink/10 pt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(bot.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
