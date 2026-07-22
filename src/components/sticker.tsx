import type { ReactNode } from "react";

/**
 * Rotated, ink-bordered sticker badge. Drop anywhere for a playful accent.
 */
export function Sticker({
  children,
  tone = "yellow",
  rotate = -6,
  className = "",
}: {
  children: ReactNode;
  tone?: "yellow" | "pink" | "mint" | "violet";
  rotate?: number;
  className?: string;
}) {
  const bg = {
    yellow: "bg-yellow",
    pink: "bg-pink",
    mint: "bg-mint",
    violet: "bg-violet text-primary-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ink-border px-3 py-1 text-xs font-black uppercase tracking-wider pop-sm ${bg} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/**
 * Hand-drawn squiggly arrow (SVG). Rotate/scale with CSS as needed.
 */
export function SquigglyArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" aria-hidden="true">
      <path
        d="M8 20 C 30 10, 40 40, 60 30 S 90 10, 110 45"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />
      <path
        d="M100 38 L 112 46 L 102 56"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Chunky underline squiggle for headline emphasis.
 */
export function UnderlineSquiggle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 12"
      className={className}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M2 8 Q 25 2, 50 6 T 100 6 T 150 6 T 198 6"
        stroke="var(--violet)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
