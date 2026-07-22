import type { ReactNode } from "react";

/**
 * Infinite horizontal marquee. Duplicates children so the loop is seamless.
 * Chunky ink-bordered strip that fits the Playful Geometric system.
 */
export function Marquee({
  items,
  speed = 30,
  className = "",
}: {
  items: ReactNode[];
  speed?: number; // seconds per full loop
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ink-border bg-card py-3 ${className}`}>
      <div className="flex w-max gap-6" style={{ animation: `marquee ${speed}s linear infinite` }}>
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center gap-6 pr-6">
            {items.map((it, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-2 text-sm font-black">
                {it}
                <span className="text-xl text-muted-foreground">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
