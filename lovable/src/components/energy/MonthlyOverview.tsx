/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E17. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - HARDCODED HEX (must be tokenised), two of them:
 *   · "#33465e" on the zero-axis <ReferenceLine y={0} stroke="#33465e" ... />
 *   · "#ffffff0a" on <Tooltip cursor={{ fill: "#ffffff0a" }} /> (8-digit hex
 *     with alpha, i.e. a hover-highlight wash).
 * - NO var(--token) USAGE ANYWHERE. `className="text-solar"` in the tooltip is a
 *   Tailwind token utility (acceptable), but every chart colour is a JS value
 *   from the CHART_COLORS object (@/lib/energy-format): CartesianGrid stroke,
 *   XAxis/YAxis tick fill, both <Cell fill=...>, and an inline
 *   style={{ color: net >= 0 ? CHART_COLORS.gridImport : CHART_COLORS.gridExport }}.
 *   Tokenising means resolving CHART_COLORS to CSS custom-property names.
 * - IMPORTS OUTSIDE THE ALLOWED SET:
 *   · recharts — Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
 *     ResponsiveContainer, Tooltip, XAxis, YAxis (9 components).
 *   · ./primitives — Card, SectionHeading (local sibling; stage/port first).
 *   No @tanstack/* imports. No `import React`, yet `React.ReactNode` is used in
 *   `interface Props` (badge) — relies on the global React UMD namespace.
 * - API FIELDS READ DIRECTLY from MonthlyDay: date, solar_kwh, net_grid_kwh.
 * - DOES NOT read Sungrow export_power_w (the always-0 field). DOES NOT read the
 *   invented P1 series fields import_kwh / export_kwh / energy_import_kwh /
 *   avg_power_w.
 * - HC-006 CHECK OWED AT PORT: `solar_kwh` and `net_grid_kwh` do not appear
 *   anywhere in Architecture.md's API Integration section. Architecture.md feeds
 *   "monthly overview" from the Sungrow /v1/series buckets, so MonthlyDay is a
 *   Lovable-side derived shape, not a captured contract — the derivation of
 *   net_grid_kwh must be documented (or the type re-based on captured fields)
 *   before this ports.
 * - SIGN PLACEMENT (safety-critical): stackOffset="sign" IS set on <BarChart>,
 *   but NEITHER <Bar> declares a stackId, so nothing is actually sign-stacked —
 *   the setting is inert and direction comes solely from the pre-negated datum
 *   `netDown: -d.net_grid_kwh`. Convention implied by the tooltip is
 *   net >= 0 === "Net import": import → netDown < 0 → bar BELOW zero; export →
 *   netDown > 0 → bar ABOVE zero. Solar is always positive/above. Same
 *   import-below / export-above polarity as PowerTimeline.tsx.
 * - DIRECTION AMBIGUITY TO RESOLVE AT PORT: because export days draw netDown
 *   upward, the net-grid bar shares the upper half-plane with the solar bar,
 *   which contradicts the body copy "Solar production up, net grid down." The
 *   only remaining discriminator is colour
 *   (<Cell fill={r.net < 0 ? CHART_COLORS.gridExport : CHART_COLORS.gridImport} />).
 *   The corner radii also hardcode an assumed direction: solar
 *   radius={[3, 3, 0, 0]} (rounded top) vs netDown radius={[0, 0, 3, 3]}
 *   (rounded bottom), which is wrong for the upward export bars.
 * - NO SINGLE Y-AXIS ID / NO DUAL AXIS: one unnamed <YAxis width={44}>; both
 *   Bars share it, so kWh solar and kWh net grid are on the same scale.
 * - HC-003 / D3 HAZARD: the tooltip calls row.solar.toFixed(1) and
 *   Math.abs(net).toFixed(1) with no null/undefined gate anywhere in the file
 *   (unlike PowerTimeline's empty-bucket gate) — a null day throws, and a
 *   missing field renders NaN.
 * - JSDOM HAZARDS: ResponsiveContainer measures its parent, so it renders 0×0 in
 *   jsdom and the chart children never mount; Recharts also relies on
 *   ResizeObserver. Plus `new Date().getDate()` drives the isToday highlight and
 *   `new Date().toLocaleDateString("en-GB", ...)` drives both the card title and
 *   the tooltip date — clock-, TZ- and ICU/locale-dependent, so tests need fake
 *   timers and a pinned TZ/locale.
 */
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyDay } from "@/types/energy";
import { CHART_COLORS } from "@/lib/energy-format";
import { Card, SectionHeading } from "./primitives";

interface Props {
  days: MonthlyDay[];
  dimmed?: boolean;
  badge?: React.ReactNode;
}

function MonthTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const net = row.net as number;
  return (
    <div className="rounded-lg border border-border-subtle bg-elevated/95 p-3 text-[12px] shadow-lg backdrop-blur">
      <p className="num mb-1.5 text-text-secondary">{row.full}</p>
      <p className="flex justify-between gap-4">
        <span className="text-solar">Solar</span>
        <span className="num text-text-primary">{row.solar.toFixed(1)} kWh</span>
      </p>
      <p className="flex justify-between gap-4">
        <span style={{ color: net >= 0 ? CHART_COLORS.gridImport : CHART_COLORS.gridExport }}>
          {net >= 0 ? "Net import" : "Net export"}
        </span>
        <span className="num text-text-primary">{Math.abs(net).toFixed(1)} kWh</span>
      </p>
    </div>
  );
}

export function MonthlyOverview({ days, dimmed, badge }: Props) {
  const today = new Date().getDate();
  const rows = days.map((d) => {
    const date = new Date(d.date);
    return {
      day: date.getDate(),
      full: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      solar: d.solar_kwh,
      net: d.net_grid_kwh,
      netDown: -d.net_grid_kwh,
      isToday: date.getDate() === today,
    };
  });
  const avg = rows.length ? rows.reduce((s, r) => s + r.solar, 0) / rows.length : 0;
  const monthName = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <Card stale={dimmed} className="flex flex-col gap-4">
      <SectionHeading
        title={monthName}
        meta={
          <div className="flex items-center gap-3">
            {badge}
            <span className="num text-text-primary">
              {avg.toFixed(1)}
              <span className="ml-1 text-[10px] font-light text-text-secondary">kWh avg/day</span>
            </span>
          </div>
        }
      />
      <div className="h-[220px] w-full rounded-lg bg-subtle p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} stackOffset="sign">
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<MonthTooltip />} cursor={{ fill: "#ffffff0a" }} />
            <ReferenceLine y={0} stroke="#33465e" strokeWidth={1.5} />
            <Bar dataKey="solar" radius={[3, 3, 0, 0]} maxBarSize={14}>
              {rows.map((r) => (
                <Cell key={`s${r.day}`} fill={CHART_COLORS.solar} fillOpacity={r.isToday ? 1 : 0.75} />
              ))}
            </Bar>
            <Bar dataKey="netDown" radius={[0, 0, 3, 3]} maxBarSize={14}>
              {rows.map((r) => (
                <Cell
                  key={`n${r.day}`}
                  fill={r.net < 0 ? CHART_COLORS.gridExport : CHART_COLORS.gridImport}
                  fillOpacity={r.isToday ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-text-secondary">
        Solar production up, net grid down. Green days sent more to the grid than they took.
      </p>
    </Card>
  );
}
