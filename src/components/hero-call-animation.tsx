import { useEffect, useState } from "react";
import { Mic, MicOff, Video, PhoneOff } from "lucide-react";

/**
 * "Two people on a video call" illustration for the hero.
 * SVG cartoon people, alternating active-speaker glow, typing caption bar.
 * Pure CSS/JS — no motion primitives needed here.
 */

const SCRIPT: { who: 0 | 1; text: string }[] = [
  { who: 0, text: "So — should we ship the pricing update this week?" },
  { who: 1, text: "Yes. I'll write the changelog tonight." },
  { who: 0, text: "Perfect. urMeetings is capturing all of this ✨" },
];

export function HeroCallAnimation() {
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState("");

  // Type out the current line, then advance
  useEffect(() => {
    const full = SCRIPT[line].text;
    let i = 0;
    setTyped("");
    const typer = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typer);
        setTimeout(() => setLine((l) => (l + 1) % SCRIPT.length), 1600);
      }
    }, 38);
    return () => clearInterval(typer);
  }, [line]);

  const active = SCRIPT[line].who;

  return (
    <div className="relative mx-auto w-full max-w-[440px] select-none" aria-hidden="true">
      {/* Floating confetti */}
      <span className="absolute -left-4 -top-4 h-7 w-7 rotate-12 rounded-md ink-border bg-yellow pop-sm animate-[wiggle_2.4s_ease-in-out_infinite]" />
      <span className="absolute -right-3 top-8 h-6 w-6 rounded-full ink-border bg-mint pop-sm hero-float" />
      <span className="absolute -bottom-3 left-10 h-6 w-6 -rotate-6 rounded-md ink-border bg-pink pop-sm hero-float-slow" />

      {/* Call window */}
      <div className="relative rounded-3xl ink-border bg-card p-3 pop-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 pb-2.5">
          <span className="h-2.5 w-2.5 rounded-full ink-border bg-pink" />
          <span className="h-2.5 w-2.5 rounded-full ink-border bg-yellow" />
          <span className="h-2.5 w-2.5 rounded-full ink-border bg-mint" />
          <span className="mx-auto rounded-full ink-border bg-background px-2 py-0.5 text-[10px] font-black tracking-wider">
            urmeetings.call / standup
          </span>
          <span className="rounded-full ink-border bg-background px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive blink align-middle" />
            REC
          </span>
        </div>

        {/* Two-tile grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <PersonTile
            name="Neel"
            role="Host"
            bg="bg-violet"
            skin="#f2c6a0"
            hair="#2b2b3a"
            shirt="#0f172a"
            speaking={active === 0}
          />
          <PersonTile
            name="You"
            role="Guest"
            bg="bg-mint"
            skin="#e8b48a"
            hair="#8b3a2e"
            shirt="#6d28d9"
            speaking={active === 1}
            flip
          />
        </div>

        {/* Live caption bar */}
        <div className="mt-2.5 rounded-xl ink-border bg-background px-3 py-2 min-h-[52px]">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive blink" />
            Live caption · {active === 0 ? "Neel" : "You"}
          </div>
          <p className="mt-0.5 text-[13px] font-bold leading-tight">
            {typed}
            <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-foreground blink" />
          </p>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <CtrlBtn><Mic className="h-4 w-4" strokeWidth={2.5} /></CtrlBtn>
          <CtrlBtn><Video className="h-4 w-4" strokeWidth={2.5} /></CtrlBtn>
          <CtrlBtn muted><MicOff className="h-4 w-4" strokeWidth={2.5} /></CtrlBtn>
          <span className="mx-1 h-6 w-px bg-ink/30" />
          <button type="button" tabIndex={-1} className="grid h-9 w-14 place-items-center rounded-full ink-border bg-destructive text-destructive-foreground pop-sm">
            <PhoneOff className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes hero-float-kf {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .hero-float { animation: hero-float-kf 3s ease-in-out infinite; }
        .hero-float-slow { animation: hero-float-kf 3.8s ease-in-out infinite; }
        @keyframes speak-bar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes speak-ring {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--mint) 70%, transparent); }
          50% { box-shadow: 0 0 0 8px color-mix(in oklab, var(--mint) 0%, transparent); }
        }
      `}</style>
    </div>
  );
}

function CtrlBtn({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`grid h-9 w-9 place-items-center rounded-full ink-border pop-sm ${muted ? "bg-yellow" : "bg-background"}`}
    >
      {children}
    </button>
  );
}

function PersonTile({
  name,
  role,
  bg,
  skin,
  hair,
  shirt,
  speaking,
  flip,
}: {
  name: string;
  role: string;
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  speaking?: boolean;
  flip?: boolean;
}) {
  return (
    <div className={`relative aspect-[4/3] rounded-2xl ink-border ${bg} overflow-hidden pop-sm`}>
      {/* dotted texture */}
      <div className="absolute inset-0 opacity-30 dotted-bg" />

      {/* Speaking green ring */}
      <div
        className="pointer-events-none absolute inset-1 rounded-xl transition-all duration-300"
        style={{
          boxShadow: speaking
            ? "inset 0 0 0 3px var(--mint), 0 0 0 0 color-mix(in oklab, var(--mint) 70%, transparent)"
            : "inset 0 0 0 0px transparent",
          animation: speaking ? "speak-ring 1.4s ease-in-out infinite" : undefined,
        }}
      />

      {/* Person SVG */}
      <svg
        viewBox="0 0 100 80"
        className="absolute inset-0 h-full w-full"
        style={{ transform: flip ? "scaleX(-1)" : undefined }}
      >
        <defs>
          {/* subtle cheek/shadow gradients on skin */}
          <radialGradient id={`skin-${name}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={skin} />
            <stop offset="100%" stopColor={skin} stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* Shoulders / shirt */}
        <path
          d="M6 82 C 12 62, 30 55, 40 55 L 60 55 C 70 55, 88 62, 94 82 Z"
          fill={shirt}
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Collar / t-shirt neckline */}
        <path
          d="M42 55 C 45 60, 55 60, 58 55"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Neck */}
        <path
          d="M43 46 L 43 56 Q 50 60 57 56 L 57 46 Z"
          fill={skin}
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Ears */}
        <ellipse cx="35" cy="36" rx="2.8" ry="4" fill={skin} stroke="var(--ink)" strokeWidth="1.8" />
        <ellipse cx="65" cy="36" rx="2.8" ry="4" fill={skin} stroke="var(--ink)" strokeWidth="1.8" />
        {/* Head */}
        <path
          d="M35 34 C 35 22, 65 22, 65 34 L 65 40 C 65 50, 58 55, 50 55 C 42 55, 35 50, 35 40 Z"
          fill={`url(#skin-${name})`}
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Hair — a modern fringe */}
        <path
          d="M33 32 C 32 18, 68 16, 68 30 C 68 30, 64 25, 60 26 C 58 22, 46 22, 42 26 C 38 26, 34 27, 33 32 Z"
          fill={hair}
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Sideburn tuft */}
        <path d="M34 32 L 34 40" stroke={hair} strokeWidth="3" strokeLinecap="round" />
        <path d="M66 32 L 66 40" stroke={hair} strokeWidth="3" strokeLinecap="round" />
        {/* Eyebrows */}
        <path d="M41 32 Q 44 30 47 32" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M53 32 Q 56 30 59 32" stroke="var(--ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        {/* Eyes with sparkle */}
        <g>
          <ellipse cx="44" cy="36.5" rx="1.9" ry="2.2" fill="var(--ink)" />
          <circle cx="44.6" cy="36" r="0.5" fill="#fff" />
          <ellipse cx="56" cy="36.5" rx="1.9" ry="2.2" fill="var(--ink)" />
          <circle cx="56.6" cy="36" r="0.5" fill="#fff" />
          {!speaking && (
            <>
              {/* Slow blink */}
              <rect x="42" y="35" width="4" height="0" fill={skin}>
                <animate attributeName="height" values="0;0;3;0" keyTimes="0;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
              </rect>
              <rect x="54" y="35" width="4" height="0" fill={skin}>
                <animate attributeName="height" values="0;0;3;0" keyTimes="0;0.9;0.95;1" dur="4s" repeatCount="indefinite" />
              </rect>
            </>
          )}
        </g>
        {/* Cheek blush */}
        <circle cx="41" cy="42" r="2.2" fill="#ff6b8a" opacity="0.35" />
        <circle cx="59" cy="42" r="2.2" fill="#ff6b8a" opacity="0.35" />
        {/* Nose */}
        <path d="M50 38 L 48.5 43 Q 50 44 51.5 43" stroke="var(--ink)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Mouth */}
        {speaking ? (
          <g>
            <ellipse cx="50" cy="47" rx="3.2" ry="1.2" fill="#4a1721" stroke="var(--ink)" strokeWidth="1.4">
              <animate attributeName="ry" values="0.5;2.2;0.9;2;0.6" dur="0.8s" repeatCount="indefinite" />
            </ellipse>
            {/* teeth line */}
            <line x1="47" y1="47" x2="53" y2="47" stroke="#fff" strokeWidth="0.6" />
          </g>
        ) : (
          <path d="M46 47 Q 50 50 54 47" stroke="var(--ink)" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        )}
        {/* Headphones — arch + earcups */}
        <path d="M30 32 C 30 18, 70 18, 70 32" stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="26.5" y="32" width="7" height="9" rx="2.2" fill="var(--violet)" stroke="var(--ink)" strokeWidth="1.8" />
        <rect x="66.5" y="32" width="7" height="9" rx="2.2" fill="var(--violet)" stroke="var(--ink)" strokeWidth="1.8" />
        <circle cx="30" cy="36.5" r="0.9" fill="var(--yellow)" />
        <circle cx="70" cy="36.5" r="0.9" fill="var(--yellow)" />
      </svg>

      {/* Name pill */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md ink-border bg-background px-1.5 py-0.5 text-[10px] font-black">
        {speaking && <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint" />}
        {name}
        <span className="text-muted-foreground font-bold">· {role}</span>
      </div>

      {/* Waveform when speaking */}
      {speaking && (
        <div className="absolute bottom-1.5 right-1.5 flex items-end gap-[3px] rounded-md ink-border bg-background px-1.5 py-1">
          {[0, 0.12, 0.24, 0.12, 0].map((d, i) => (
            <span
              key={i}
              className="block w-[3px] rounded-sm"
              style={{
                height: "10px",
                transformOrigin: "bottom",
                animation: `speak-bar 0.7s ease-in-out ${d}s infinite`,
                background: "var(--ink)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}