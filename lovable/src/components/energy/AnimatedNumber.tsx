/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 *
 * Captured verbatim from the Lovable project "Energy Watch" on 2026-07-30.
 * Everything below this banner is the vendor file, unmodified.
 *
 * Do NOT import this into src/ — the legacy artifact is frozen (ADR-012) and
 * this tree is a design reference, not a build input. See lovable/MANIFEST.md.
 *
 * PORT NOTE (destination: RW-E03):
 * - Carries the ~400ms cubic ease-out counter that satisfies the domain rule
 *   "numeric transitions animate, never snap", and the reduced-motion collapse.
 * - `usePrefersReducedMotion` is defined here but is needed by PowerFlow and by
 *   RW-E15's central Recharts animation switch — hoist it to its own module at
 *   port time rather than importing it out of this file.
 * - The cleanup writes `fromRef.current = display` on unmount, which makes the
 *   next mount animate from the last rendered frame. Intentional; keep it.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

interface AnimatedNumberProps {
  value: number;
  /** Decimal places. */
  digits?: number;
  /** Always show a leading + / - sign. */
  signed?: boolean;
  durationMs?: number;
  className?: string;
}

/**
 * Counts to its new value over ~400ms ease-out. Never snaps.
 * Collapses to an immediate set under prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  digits = 2,
  signed = false,
  durationMs = 400,
  className,
}: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, reduced]);

  const text = display.toFixed(digits);
  const withSign = signed && display > 0 ? `+${text}` : text;

  return <span className={cn("num", className)}>{withSign}</span>;
}

/** Number + unit pair. Units are always smaller and lighter than the number. */
export function ValueUnit({
  value,
  unit,
  digits = 2,
  signed = false,
  valueClassName,
  unitClassName,
  animate = true,
}: {
  value: number;
  unit: string;
  digits?: number;
  signed?: boolean;
  valueClassName?: string;
  unitClassName?: string;
  animate?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {animate ? (
        <AnimatedNumber value={value} digits={digits} signed={signed} className={valueClassName} />
      ) : (
        <span className={cn("num", valueClassName)}>{value.toFixed(digits)}</span>
      )}
      <span className={cn("text-[0.5em] font-light text-text-secondary", unitClassName)}>{unit}</span>
    </span>
  );
}
