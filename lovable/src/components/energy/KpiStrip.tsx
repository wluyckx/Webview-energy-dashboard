/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E08. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - The two `@tanstack/react-router` <Link> usages (/grid, /peak) are the only
 *   router coupling in the whole portable set — swap for Hestia's react-router
 *   <Link> (RW-E08 AC5).
 * - Sign-driven accent: `importing = gridW >= 0` selects --grid-import vs
 *   --grid-export. Note the >= 0 boundary means exactly 0 W renders as import
 *   colour while the label reads "balanced"; assert whichever behaviour is
 *   wanted at port rather than inheriting it by accident.
 * - `low = socPct < 20` drives the warning pulse (RW-E08 AC2).
 * - Hardcoded-hex violations to fix at port: the battery bar's boxShadow uses
 *   #FDCB6E / #6C5CE7 / #A29BFE literals while everything around it uses tokens.
 */

import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AnimatedNumber, ValueUnit } from "./AnimatedNumber";
import { fmtDateTime } from "@/lib/energy-format";

interface KpiStripProps {
  /** SIGNED P1: positive = import. */
  gridW: number;
  socPct: number;
  /** SIGNED: positive = charging. */
  batteryW: number;
  pvDailyKwh: number;
  pvW: number;
  monthlyPeakW: number;
  monthlyPeakTs: string;
  dimmed?: boolean;
}

function KpiCard({
  children,
  accent,
  className,
  pulse,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "card-surface card-hover relative min-h-[104px] overflow-hidden p-4",
        pulse && "pulse-warning",
        className,
      )}
    >
      {accent && (
        <span
          className="absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors duration-500"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      )}
      <div className="pl-2.5">{children}</div>
    </div>
  );
}

export function KpiStrip({
  gridW,
  socPct,
  batteryW,
  pvDailyKwh,
  pvW,
  monthlyPeakW,
  monthlyPeakTs,
  dimmed = false,
}: KpiStripProps) {
  const importing = gridW >= 0;
  const gridColor = importing ? "var(--grid-import)" : "var(--grid-export)";
  const charging = batteryW > 40;
  const low = socPct < 20;

  return (
    <div className={cn("grid grid-cols-2 gap-3 min-[415px]:grid-cols-4", dimmed && "dimmed-stale")}>
      <Link to="/grid" className="block focus-visible:rounded-lg" aria-label="Open grid detail">
        <KpiCard accent={gridColor}>
          <p className="label-caps">Grid</p>
          <p className="mt-2 text-[27px] font-bold" style={{ color: gridColor }}>
            <ValueUnit
              value={gridW / 1000}
              unit="kW"
              digits={2}
              signed
              valueClassName="text-[27px] font-bold"
            />
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">
            {Math.abs(gridW) < 40 ? "balanced" : importing ? "importing" : "exporting"}
          </p>
        </KpiCard>
      </Link>

      <KpiCard accent={charging ? "var(--battery-charge)" : "var(--battery-discharge)"} pulse={low}>
        <p className="label-caps">Battery</p>
        <p
          className="mt-2 text-[27px] font-bold"
          style={{ color: low ? "var(--warning)" : charging ? "var(--battery-charge)" : "var(--battery-discharge)" }}
        >
          <ValueUnit value={socPct} unit="%" digits={0} valueClassName="text-[27px] font-bold" />
        </p>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.max(2, socPct)}%`,
              backgroundColor: low ? "var(--warning)" : charging ? "var(--battery-charge)" : "var(--battery-discharge)",
              boxShadow: `0 0 10px 1px ${low ? "#FDCB6E" : charging ? "#6C5CE7" : "#A29BFE"}`,
            }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-text-secondary">
          {Math.abs(batteryW) < 40
            ? "idle"
            : `${charging ? "charging" : "discharging"} ${(Math.abs(batteryW) / 1000).toFixed(2)} kW`}
        </p>
      </KpiCard>

      <KpiCard accent="var(--solar)">
        <p className="label-caps">Solar today</p>
        <p className="mt-2 text-[27px] font-bold text-solar">
          <ValueUnit value={pvDailyKwh} unit="kWh" digits={1} valueClassName="text-[27px] font-bold" />
        </p>
        <p className="mt-1 text-[12px] text-text-secondary">
          {pvW > 40 ? `producing ${(pvW / 1000).toFixed(2)} kW` : "not producing"}
        </p>
      </KpiCard>

      <Link to="/peak" className="block focus-visible:rounded-lg" aria-label="Open capacity peak detail">
        <KpiCard accent="var(--accent)">
          <p className="label-caps">Month peak</p>
          <p className="mt-2 text-[27px] font-bold text-text-primary">
            <ValueUnit value={monthlyPeakW / 1000} unit="kW" digits={2} valueClassName="text-[27px] font-bold" />
          </p>
          <p className="mt-1 truncate text-[12px] text-text-secondary">{fmtDateTime(monthlyPeakTs)}</p>
        </KpiCard>
      </Link>
    </div>
  );
}

export function CountUpHeadline({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 text-[44px] font-bold leading-none">
      <AnimatedNumber value={value} digits={2} className="text-[44px]" />
      <span className="text-[16px] font-light text-text-secondary">{unit}</span>
    </span>
  );
}
