/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 *
 * Captured verbatim from the Lovable project "Energy Watch" on 2026-07-30.
 * Everything below this banner is the vendor file, unmodified.
 *
 * Do NOT import this into src/ — the legacy artifact is frozen (ADR-012) and
 * this tree is a design reference, not a build input. See lovable/MANIFEST.md.
 *
 * This is the single most valuable file in the staged set: ADR-008 realized.
 * Pure inline SVG + CSS, no chart library, no dependency beyond React.
 *
 * PORT NOTE (destination: RW-E06):
 * - The geometry constants ARE the design: 340×286 viewBox, the four node
 *   coordinates, `width = 1.5 + mag*4.5` and `opacity = 0.35 + mag*0.6` where
 *   `mag = min(1, |W|/3500)`, the 40 W active threshold, and the dashed-hint
 *   idle edge. Architecture.md records these; do not "clean them up".
 * - `useFlash` is the 300ms direction-flip flash. Note it only fires when BOTH
 *   the previous and next direction are non-zero — crossing through idle does
 *   not flash. Deliberate.
 * - **This component takes flow values as props and computes no signs itself.**
 *   That is why DP-003 is provable by unit-testing `computeFlows` (RW-E04)
 *   rather than by rendering. Preserve that boundary at port: the component must
 *   not start deriving direction.
 * - **Hardcoded hex violations to fix at port**: the four inline `<svg>` icons
 *   use literals (#F6B93B, #4A5568, #A29BFE, #6C5CE7, #DFE6E9, #E17055,
 *   #00B894) while the edges correctly use `var(--…)` tokens. The icons must
 *   move to tokens too (domain rule: colours by custom-property name, never a
 *   literal). This is the concrete instance of ADR-007's "hardcoded-hex
 *   violations are fixed at port time".
 * - `prefers-reduced-motion` is NOT handled in this file — the `flow-dash`
 *   animation is collapsed by the global rule in styles.css. Verify that rule
 *   ports with it (RW-E02 AC5), or the flow lines will animate for users who
 *   asked them not to.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ValueUnit } from "./AnimatedNumber";

interface PowerFlowProps {
  pvW: number;
  /** SIGNED: positive = charging, negative = discharging. */
  batteryW: number;
  socPct: number;
  loadW: number;
  /** SIGNED P1: positive = import, negative = export. */
  gridW: number;
  dimmed?: boolean;
}

const VB = { w: 340, h: 286 };
const P = {
  solar: { x: 170, y: 40 },
  battery: { x: 48, y: 198 },
  home: { x: 170, y: 198 },
  grid: { x: 292, y: 198 },
};

function strokeFor(watts: number) {
  const mag = Math.min(1, Math.abs(watts) / 3500);
  return { width: 1.5 + mag * 4.5, opacity: 0.35 + mag * 0.6 };
}

function Edge({
  from,
  to,
  watts,
  color,
  reverse,
  flash,
  padFrom = 40,
  padTo = 40,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  watts: number;
  color: string;
  reverse: boolean;
  flash: boolean;
  padFrom?: number;
  padTo?: number;
}) {
  const active = Math.abs(watts) > 40;
  const { width, opacity } = strokeFor(watts);
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / len;
  const uy = (to.y - from.y) / len;
  const a = { x: from.x + ux * padFrom, y: from.y + uy * padFrom };
  const b = { x: to.x - ux * padTo, y: to.y - uy * padTo };
  const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  if (!active) {
    return (
      <path
        d={d}
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth={1.5}
        strokeDasharray="3 7"
        strokeLinecap="round"
        opacity={0.9}
      />
    );
  }
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity * 0.28} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={flash ? width + 2 : width}
        strokeLinecap="round"
        strokeDasharray="10 14"
        opacity={flash ? 1 : opacity}
        style={{
          animation: `flow-dash 3s linear infinite${reverse ? " reverse" : ""}`,
          transition: "stroke-width 300ms ease, opacity 300ms ease",
        }}
      />
    </g>
  );
}

function useFlash(direction: number) {
  const prev = useRef(direction);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== direction && direction !== 0 && prev.current !== 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      prev.current = direction;
      return () => clearTimeout(t);
    }
    prev.current = direction;
  }, [direction]);
  return flash;
}

function Node({
  style,
  label,
  watts,
  color,
  icon,
  glow,
  sub,
}: {
  style: React.CSSProperties;
  label: string;
  watts: number;
  color: string;
  icon: React.ReactNode;
  glow?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      style={style}
    >
      <div
        className={cn(
          "grid h-14 w-14 place-items-center rounded-2xl border bg-subtle transition-colors duration-500",
          glow ? "glow-solar" : "",
        )}
        style={{ borderColor: `${color}55`, boxShadow: glow ? undefined : "none" }}
      >
        {icon}
      </div>
      <div className="text-center leading-tight">
        <div style={{ color }} className="text-[21px] font-semibold">
          <ValueUnit value={Math.abs(watts) / 1000} unit="kW" digits={2} valueClassName="text-[21px]" />
        </div>
        <div className="text-[11px] text-text-secondary">{sub ?? label}</div>
      </div>
    </div>
  );
}

const pct = (p: { x: number; y: number }) => ({
  left: `${(p.x / VB.w) * 100}%`,
  top: `${(p.y / VB.h) * 100}%`,
});

export function PowerFlow({ pvW, batteryW, socPct, loadW, gridW, dimmed = false }: PowerFlowProps) {
  const batteryFlash = useFlash(Math.sign(batteryW));
  const gridFlash = useFlash(Math.sign(gridW));
  const charging = batteryW > 40;
  const importing = gridW > 40;
  const producing = pvW > 40;

  return (
    <div className={cn("relative w-full", dimmed && "dimmed-stale")} style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Live power flow between solar, battery, home and grid"
      >
        <Edge from={P.solar} to={P.home} watts={pvW} color="var(--solar)" reverse={false} flash={false} padFrom={88} padTo={32} />
        <Edge
          from={P.battery}
          to={P.home}
          watts={batteryW}
          color={charging ? "var(--battery-charge)" : "var(--battery-discharge)"}
          reverse={charging}
          flash={batteryFlash}
        />
        <Edge
          from={P.grid}
          to={P.home}
          watts={gridW}
          color={importing ? "var(--grid-import)" : "var(--grid-export)"}
          reverse={!importing}
          flash={gridFlash}
        />
      </svg>

      <Node
        style={pct(P.solar)}
        label="Solar"
        sub={producing ? "producing" : "idle"}
        watts={pvW}
        color={producing ? "var(--solar)" : "var(--text-tertiary)"}
        glow={producing}
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="4.4" stroke={producing ? "#F6B93B" : "#4A5568"} strokeWidth="1.6" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line
                key={a}
                x1={12 + 7 * Math.cos((a * Math.PI) / 180)}
                y1={12 + 7 * Math.sin((a * Math.PI) / 180)}
                x2={12 + 9.6 * Math.cos((a * Math.PI) / 180)}
                y2={12 + 9.6 * Math.sin((a * Math.PI) / 180)}
                stroke={producing ? "#F6B93B" : "#4A5568"}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ))}
          </svg>
        }
      />

      <Node
        style={pct(P.battery)}
        label="Battery"
        sub={charging ? `charging · ${Math.round(socPct)}%` : batteryW < -40 ? `discharging · ${Math.round(socPct)}%` : `idle · ${Math.round(socPct)}%`}
        watts={batteryW}
        color={charging ? "var(--battery-charge)" : "var(--battery-discharge)"}
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="7" width="15" height="10" rx="2.4" stroke="#A29BFE" strokeWidth="1.6" />
            <rect
              x="5.4"
              y="8.4"
              width={Math.max(1, (socPct / 100) * 12.2)}
              height="7.2"
              rx="1.4"
              fill={charging ? "#6C5CE7" : "#A29BFE"}
              style={{ transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }}
            />
            <rect x="20" y="10" width="2" height="4" rx="1" fill="#A29BFE" />
          </svg>
        }
      />

      <Node
        style={pct(P.home)}
        label="Home"
        sub="home"
        watts={loadW}
        color="var(--home)"
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" stroke="#DFE6E9" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9.5 20v-5.5h5V20" stroke="#DFE6E9" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        }
      />

      <Node
        style={pct(P.grid)}
        label="Grid"
        sub={importing ? "importing" : gridW < -40 ? "exporting" : "balanced"}
        watts={gridW}
        color={importing ? "var(--grid-import)" : "var(--grid-export)"}
        icon={
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M8 4h8M9 4l-2.5 16M15 4l2.5 16M7.2 10h9.6M6.6 15h10.8"
              stroke={importing ? "#E17055" : "#00B894"}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}
