import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { autoConfirmSignup } from "@/lib/auth.functions";

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
        const { data, error } = await supabase.auth.signUp({
          email: domEmail,
          password: domPassword,
          options: { emailRedirectTo: `${window.location.origin}/notes` },
        });
        if (error) throw error;

        if (!data.user) {
          throw new Error("Could not create account. Try again.");
        }

        if (!data.session) {
          await autoConfirmSignup({ data: { userId: data.user.id } });

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: domEmail,
            password: domPassword,
          });
          if (signInError) throw signInError;
        }

        toast.success("Account created! You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: domEmail,
          password: domPassword,
        });
        if (error) {
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            throw new Error("Please confirm your email first. Check your inbox for the confirmation link.");
          }
          throw error;
        }
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

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/notes` },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google auth error:", err);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
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

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-ink/10" />
                  </div>
                  <div className="relative flex justify-center text-xs font-bold uppercase text-muted-foreground">
                    <span className="bg-card px-2">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border-2 border-ink/20 bg-background text-sm font-black pop disabled:opacity-60"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>

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