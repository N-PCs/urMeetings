import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Radio, StickyNote, Sparkles, Settings, LogOut } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof Radio; color: string };

const NAV: NavItem[] = [
  { to: "/live", label: "Live", icon: Radio, color: "bg-pink" },
  { to: "/notes", label: "Notes", icon: StickyNote, color: "bg-yellow" },
  { to: "/ask", label: "Ask", icon: Sparkles, color: "bg-violet" },
  { to: "/settings", label: "Settings", icon: Settings, color: "bg-mint" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const router = useRouter();
  const { user, isAuthenticated } = useSession();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 no-underline"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ink-border bg-yellow pop-sm">
              <span className="text-lg font-black">u</span>
            </span>
            <span className="truncate text-lg font-black tracking-tight">urMeetings</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline">
                  {user?.email}
                </span>
                <button
                  onClick={signOut}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg ink-border bg-card px-3 text-sm font-bold pop-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="inline-flex h-9 items-center rounded-lg ink-border bg-violet px-3 text-sm font-bold text-primary-foreground no-underline pop-sm"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-6 sm:px-6 md:pb-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-20 space-y-2">
            {NAV.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl ink-border px-3 py-2.5 text-sm font-bold no-underline transition-transform",
                    active
                      ? `${item.color} pop-sm text-ink`
                      : "bg-card hover:-translate-x-0.5 hover:-translate-y-0.5",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-background md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold no-underline"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition-transform",
                    active ? `${item.color} ink-border pop-sm` : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}