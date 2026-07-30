/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E16. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - HARDCODED HEX (must be tokenised): "#33465e" on the zero-axis
 *   <ReferenceLine yAxisId="kw" y={0} stroke="#33465e" strokeWidth={1.5} />.
 *   This is the only literal hex in the file.
 * - NO var(--token) USAGE ANYWHERE. Every other colour is a JS value read from
 *   the CHART_COLORS object (@/lib/energy-format) and injected as a prop or
 *   inline style: stroke/fill on Area/Line, CartesianGrid stroke, XAxis/YAxis
 *   tick fill, Tooltip cursor stroke, and style={{ backgroundColor: meta.color }}
 *   on the legend/tooltip swatches. Tokenising this file means resolving
 *   CHART_COLORS to CSS custom-property names, not just fixing #33465e.
 * - IMPORTS OUTSIDE THE ALLOWED SET:
 *   · recharts — Area, CartesianGrid, ComposedChart, Line, ReferenceLine,
 *     ResponsiveContainer, Tooltip, XAxis, YAxis (9 components).
 *   · ./primitives — Card, SectionHeading (local sibling; must be staged/ported
 *     before this file compiles).
 *   No @tanstack/* imports. No `import React` at all, yet `React.ReactNode` is
 *   referenced in `interface Props` (badge) — relies on the global React UMD
 *   namespace and will need `import type { ReactNode }` under Hestia's tsconfig.
 * - API FIELDS READ DIRECTLY from SungrowBucket: bucket, avg_pv_power_w,
 *   avg_load_power_w, avg_battery_power_w, avg_battery_soc_pct. All five are
 *   documented in Architecture.md's /v1/series bucket shape.
 * - DOES NOT read Sungrow export_power_w (the always-0 field). DOES NOT read the
 *   invented P1 series fields import_kwh / export_kwh / energy_import_kwh /
 *   avg_power_w. No P1 data is touched at all, so no R1 exposure here.
 * - GRID IS DERIVED, NOT READ:
 *   grid = (avg_load_power_w - avg_pv_power_w + avg_battery_power_w) / 1000.
 *   Positive = import, which matches the P1 `power_w` polarity in the Sign
 *   Convention Reference — but it is NOT the authoritative P1 source, so these
 *   values will not tie out numerically with the P1 card.
 * - SIGN PLACEMENT (safety-critical): gridExport = Math.max(0, -grid) → export
 *   ABOVE zero; gridImport = -Math.max(0, grid) → import BELOW zero;
 *   batteryCharge = Math.max(0, batt/1000) → charge ABOVE; batteryDischarge =
 *   -Math.max(0, -batt/1000) → discharge BELOW; solar and home are always
 *   positive/above. Direction is carried ONLY by chart position: the tooltip
 *   re-absolutes every value via Math.abs(Number(p.value)).
 * - NO stackOffset on ComposedChart and NO stackId on any Area — the series are
 *   not stacked; each is drawn independently from the y=0 baseline, and negative
 *   values simply fall below the ReferenceLine.
 * - DUAL AXIS: yAxisId="kw" (left, auto domain, width 44) carries solar,
 *   gridExport, gridImport, batteryCharge, batteryDischarge and home;
 *   yAxisId="soc" (right, orientation="right", domain={[0, 100]}, width 30)
 *   carries only the dashed battery-SoC Line.
 * - JSDOM HAZARDS: ResponsiveContainer measures its parent, so it renders 0×0
 *   in jsdom and the chart children never mount (needs a mocked container or
 *   explicit width/height); Recharts also relies on ResizeObserver. Separately,
 *   `new Date(b.bucket).getHours()` makes the x-axis labels local-timezone
 *   dependent — tests must pin TZ.
 * - HC-003 GATE PRESENT: an all-zero bucket (avg_pv_power_w === 0 &&
 *   avg_load_power_w === 0 && avg_battery_power_w === 0) maps every series to
 *   null, and the tooltip filters null/undefined. connectNulls={false} is set on
 *   the solar Area only.
 */
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SungrowBucket } from "@/types/energy";
import { CHART_COLORS } from "@/lib/energy-format";
import { Card, SectionHeading } from "./primitives";

interface Props {
  series: SungrowBucket[];
  dimmed?: boolean;
  badge?: React.ReactNode;
}

interface Row {
  hour: string;
  solar: number | null;
  gridExport: number | null;
  gridImport: number | null;
  batteryCharge: number | null;
  batteryDischarge: number | null;
  home: number | null;
  soc: number | null;
}

function toRows(series: SungrowBucket[]): Row[] {
  return series.map((b) => {
    const d = new Date(b.bucket);
    const hour = `${String(d.getHours()).padStart(2, "0")}:00`;
    const empty =
      b.avg_pv_power_w === 0 && b.avg_load_power_w === 0 && b.avg_battery_power_w === 0;
    if (empty) {
      return {
        hour,
        solar: null,
        gridExport: null,
        gridImport: null,
        batteryCharge: null,
        batteryDischarge: null,
        home: null,
        soc: null,
      };
    }
    const grid = (b.avg_load_power_w - b.avg_pv_power_w + b.avg_battery_power_w) / 1000;
    return {
      hour,
      solar: b.avg_pv_power_w / 1000,
      gridExport: Math.max(0, -grid),
      gridImport: -Math.max(0, grid),
      batteryCharge: Math.max(0, b.avg_battery_power_w / 1000),
      batteryDischarge: -Math.max(0, -b.avg_battery_power_w / 1000),
      home: b.avg_load_power_w / 1000,
      soc: b.avg_battery_soc_pct,
    };
  });
}

const LABELS: Record<string, { label: string; color: string; unit: string }> = {
  solar: { label: "Solar", color: CHART_COLORS.solar, unit: "kW" },
  gridExport: { label: "Grid export", color: CHART_COLORS.gridExport, unit: "kW" },
  gridImport: { label: "Grid import", color: CHART_COLORS.gridImport, unit: "kW" },
  batteryCharge: { label: "Battery charge", color: CHART_COLORS.batteryCharge, unit: "kW" },
  batteryDischarge: { label: "Battery discharge", color: CHART_COLORS.batteryDischarge, unit: "kW" },
  home: { label: "Home", color: CHART_COLORS.home, unit: "kW" },
  soc: { label: "Battery SoC", color: CHART_COLORS.soc, unit: "%" },
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-subtle bg-elevated/95 p-3 shadow-lg backdrop-blur">
      <p className="num mb-2 text-[12px] text-text-secondary">{label}</p>
      <ul className="space-y-1">
        {payload
          .filter((p: any) => p.value !== null && p.value !== undefined)
          .map((p: any) => {
            const meta = LABELS[p.dataKey as string];
            if (!meta) return null;
            return (
              <li key={p.dataKey} className="flex items-center justify-between gap-4 text-[12px]">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <span className="num text-text-primary">
                  {Math.abs(Number(p.value)).toFixed(meta.unit === "%" ? 0 : 2)}
                  <span className="ml-1 text-[10px] font-light text-text-secondary">{meta.unit}</span>
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export function PowerTimeline({ series, dimmed, badge }: Props) {
  const rows = toRows(series);

  return (
    <Card stale={dimmed} className="flex flex-col gap-4">
      <SectionHeading
        title="Power timeline · 24h"
        meta={
          <div className="flex items-center gap-3">
            {badge}
            <span className="hidden items-center gap-1.5 text-[11px] text-text-secondary sm:flex">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.soc }} />
              SoC
            </span>
          </div>
        }
      />
      <div className="h-[260px] w-full rounded-lg bg-subtle p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              yAxisId="kw"
              tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <YAxis
              yAxisId="soc"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: CHART_COLORS.soc, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: CHART_COLORS.soc, strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <ReferenceLine yAxisId="kw" y={0} stroke="#33465e" strokeWidth={1.5} />
            <Area yAxisId="kw" dataKey="solar" stroke={CHART_COLORS.solar} fill={CHART_COLORS.solar} fillOpacity={0.22} strokeWidth={1.8} connectNulls={false} />
            <Area yAxisId="kw" dataKey="gridExport" stroke={CHART_COLORS.gridExport} fill={CHART_COLORS.gridExport} fillOpacity={0.18} strokeWidth={1.4} />
            <Area yAxisId="kw" dataKey="gridImport" stroke={CHART_COLORS.gridImport} fill={CHART_COLORS.gridImport} fillOpacity={0.18} strokeWidth={1.4} />
            <Area yAxisId="kw" dataKey="batteryCharge" stroke={CHART_COLORS.batteryCharge} fill={CHART_COLORS.batteryCharge} fillOpacity={0.2} strokeWidth={1.4} />
            <Area yAxisId="kw" dataKey="batteryDischarge" stroke={CHART_COLORS.batteryDischarge} fill={CHART_COLORS.batteryDischarge} fillOpacity={0.2} strokeWidth={1.4} />
            <Line yAxisId="kw" dataKey="home" stroke={CHART_COLORS.home} strokeWidth={1.6} dot={false} />
            <Line yAxisId="soc" dataKey="soc" stroke={CHART_COLORS.soc} strokeWidth={1.4} strokeDasharray="4 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-text-secondary">
        {Object.entries(LABELS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
            {v.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
