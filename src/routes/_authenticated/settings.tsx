import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";
import { useOverlayPreference } from "@/hooks/use-overlay-preference";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Video, Sparkles, Shield, LogOut, Monitor, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useRef } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — urMeetings" }] }),
  component: SettingsPage,
});

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

function SettingsPage() {
  const { user } = useSession();
  const { isOverlay, setIsOverlay } = useOverlayPreference();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/";
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      if (!user?.id) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;

      toast.success("Avatar updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <AppShell>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account and integrations.</p>

      <div className="mt-6 space-y-4">
        <section className="rounded-2xl ink-border bg-card p-5 pop">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <Mail className="h-4 w-4" /> Account
          </div>
          <div className="mt-4 flex items-start gap-4">
            <Avatar className="h-20 w-20 border-2 border-ink">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="User avatar" />
              ) : (
                <AvatarFallback className="bg-violet text-white font-bold text-xl">
                  {getInitials(user?.user_metadata?.full_name, user?.email)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <p className="truncate text-base font-bold">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl ink-border bg-mint px-3 text-sm font-bold pop-sm disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload avatar"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  onClick={signOut}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl ink-border bg-pink px-3 text-sm font-bold pop-sm"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl ink-border bg-card p-5 pop">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <Monitor className="h-4 w-4" /> Interface
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Use as floating overlay</p>
              <p className="text-xs text-muted-foreground">
                Show live transcription in a draggable, resizable window
              </p>
            </div>
            <button
              onClick={() => setIsOverlay(!isOverlay)}
              className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isOverlay ? "bg-violet" : "bg-muted"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  isOverlay ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl ink-border bg-mint p-5 pop">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <Sparkles className="h-4 w-4" /> AI
          </div>
          <p className="mt-2 text-sm">
            Summaries and Q&amp;A call Google Gemini directly using your own{" "}
            <code className="rounded bg-background/60 px-1 font-mono text-xs">GEMINI_API_KEY</code>.
            Free tier via Google AI Studio — no Lovable services in the loop.
          </p>
        </section>

        <section className="rounded-2xl ink-border bg-card p-5 pop">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <Video className="h-4 w-4" /> Google Meet import
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Auto-import Meet transcripts and recordings.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              disabled
              className="inline-flex h-10 items-center rounded-xl ink-border bg-muted px-3 text-sm font-bold opacity-70"
            >
              Coming soon
            </button>
            <p className="text-xs text-muted-foreground">
              Requires a Google Workspace account — Meet's API doesn't expose transcripts on
              personal accounts.
            </p>
          </div>
        </section>

        <section className="rounded-2xl ink-border bg-yellow p-5 pop">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            <Shield className="h-4 w-4" /> Your data
          </div>
          <p className="mt-2 text-sm">
            Live transcripts run entirely in your browser. Nothing is uploaded until you tap
            <strong> Save &amp; summarize</strong>. Saved meetings are private to your account.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
