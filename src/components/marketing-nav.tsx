import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/tutorial", label: "Tutorial" },
  { to: "/docs", label: "Docs" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-xl ink-border bg-yellow pop-sm">
            <span className="text-lg font-black">u</span>
          </span>
          <span className="text-lg font-black tracking-tight">urMeetings</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "bg-yellow pop-sm" }}
              className="rounded-lg px-3 py-2 text-sm font-bold no-underline hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden h-10 items-center rounded-xl ink-border bg-violet px-4 text-sm font-bold text-primary-foreground no-underline pop-sm sm:inline-flex"
          >
            Sign in
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl ink-border bg-card pop-sm md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-2 border-ink bg-background md:hidden">
          <nav className="mx-auto grid max-w-6xl gap-2 px-4 py-3 sm:px-6">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "bg-yellow" }}
                className="rounded-lg ink-border bg-card px-3 py-2 text-sm font-bold no-underline"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-lg ink-border bg-violet px-3 py-2 text-center text-sm font-bold text-primary-foreground no-underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
