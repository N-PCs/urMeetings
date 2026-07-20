import { useRef, type ReactNode, type CSSProperties } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Scroll-driven parallax wrapper.
 * `speed` controls direction + intensity. Positive = element moves UP as page
 * scrolls down (parallax "closer" feel). Negative = moves DOWN (further away).
 * Range roughly -1 to 1. Respects prefers-reduced-motion.
 *
 * Usage:
 *   <Parallax speed={0.4}>content</Parallax>
 */
export function Parallax({
  speed = 0.3,
  children,
  className,
  style,
}: {
  speed?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Map scroll progress (0..1) to a vertical translation.
  const distance = 120 * speed; // px of travel across the whole viewport pass
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={className} style={style}>
      <motion.div style={prefersReduced ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}

/**
 * Page-level parallax for absolutely-positioned decorations. Ties to overall
 * window scroll rather than element viewport crossing — good for hero blobs.
 */
export function ScrollDecor({
  speed = 0.2,
  className,
  style,
  children,
}: {
  speed?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => v * speed * -1);
  return (
    <motion.div className={className} style={{ ...style, ...(prefersReduced ? {} : { y }) }}>
      {children}
    </motion.div>
  );
}