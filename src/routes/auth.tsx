import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — urMeetings" },
      {
        name: "description",
        content: "Sign in or create your free urMeetings account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const navigate = useNavigate();
  const router = useRouter();
  const { isAuthenticated, loading: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      navigate({ to: "/notes" });
    }
  }, [isAuthenticated, sessionLoading, navigate]);

  function getInputValue(name: string): string {
    const el = document.getElementById(name);
    if (el instanceof HTMLInputElement) return el.value;
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "reset") {
        const resetEmail = emailRef.current || getInputValue("email");
        if (!resetEmail) {
          throw new Error("Enter your email above to receive a reset link");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Password reset email sent — check your inbox");
        return;
      }

      const domEmail = (emailRef.current || getInputValue("email")).trim();
      const domPassword = (passwordRef.current || getInputValue("password")).trim();

      if (!domEmail || !domPassword) {
        throw new Error("Please fill in both email and password");
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: domEmail,
          password: domPassword,
          options: { emailRedirectTo: `${window.location.origin}/notes` },
        });
        if (error) throw error;
        toast.success("Account created! You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: domEmail,
          password: domPassword,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
      router.invalidate();
      navigate({ to: "/notes" });
    } catch (err) {
      console.error("Auth error:", err);
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold no-underline"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl ink-border bg-yellow pop-sm">
            <span className="text-lg font-black">u</span>
          </span>
          <span>urMeetings</span>
        </Link>

        <div className="rounded-2xl ink-border bg-card p-6 pop-lg sm:p-8">
          {mode === "reset" && resetSent ? (
            <div className="text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl ink-border bg-mint pop">
                <MailCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to{" "}
                <strong>{getInputValue("email") || "your email"}</strong>. Click the link in the
                email to set a new password, then come back here to sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                }}
                className="mt-2 text-sm font-bold underline underline-offset-4"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black tracking-tight">
                {mode === "signin"
                  ? "Welcome back"
                  : mode === "signup"
                    ? "Create account"
                    : "Reset password"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to see your notes and Q&A."
                  : mode === "signup"
                    ? "It's free. No card, no fuss."
                    : "Enter your email and we'll send you a reset link."}
              </p>

              <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider">
                    Email
                  </span>
                  <input
                    type="email"
                    id="email"
                    required
                    autoComplete="email"
                    defaultValue=""
                    onInput={(e) => { emailRef.current = (e.target as HTMLInputElement).value; }}
                    className="h-11 w-full rounded-xl ink-border bg-background px-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus:pop-sm"
                    placeholder="you@work.com"
                  />
                </label>
                {mode !== "reset" && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider">
                      Password
                    </span>
                    <input
                      type="password"
                      id="password"
                      required
                      minLength={6}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      defaultValue=""
                      onInput={(e) => { passwordRef.current = (e.target as HTMLInputElement).value; }}
                      className="h-11 w-full rounded-xl ink-border bg-background px-3 text-sm font-medium outline-none focus:pop-sm"
                      placeholder="At least 6 characters"
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl ink-border bg-violet text-base font-bold text-primary-foreground pop disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
                </button>
              </form>

              {mode === "signin" && (
                <p className="mt-3 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Forgot your password?
                  </button>
                </p>
              )}

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "signin"
                  ? "New here? "
                  : mode === "signup"
                    ? "Already have an account? "
                    : ""}
                {mode !== "reset" ? (
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="font-bold text-foreground underline underline-offset-4"
                  >
                    {mode === "signin" ? "Create an account" : "Sign in"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-bold text-foreground underline underline-offset-4"
                  >
                    Back to sign in
                  </button>
                )}
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Just want to test it?{" "}
          <Link to="/live" className="font-bold text-foreground underline underline-offset-4">
            Try Live mode without signing up
          </Link>
        </p>
      </div>
    </div>
  );
}