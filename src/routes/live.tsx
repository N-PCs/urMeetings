
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LiveMeeting } from "@/components/LiveMeeting";
import { Monitor } from "lucide-react";
import { useOverlayPreference } from "@/hooks/use-overlay-preference";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live meeting — urMeetings" },
      { name: "description", content: "Record and transcribe a meeting live in your browser." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { isOverlay, setIsOverlay } = useOverlayPreference();

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">Live meeting</h1>
          <button
            onClick={() => setIsOverlay(!isOverlay)}
            className="flex h-10 items-center gap-2 rounded-xl ink-border bg-card px-4 text-sm font-bold pop-sm"
          >
            <Monitor className="h-4 w-4" />
            {isOverlay ? "Exit overlay" : "Overlay mode"}
          </button>
        </div>

        {!isOverlay && <LiveMeeting />}
      </div>
    </AppShell>
  );
}
