/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E19 (Live tab) and RW-E20
 * (Day/Month/Year tabs). See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - TanStack scaffold to DELETE: `createFileRoute("/grid")` and the entire
 *   `head: () => ({ meta: [...] })` block — four per-route SEO/OG entries
 *   (title, description, og:title, og:description) which are pointless in an
 *   authenticated PWA and go at port. `component: GridDetail` survives as the
 *   function body.
 * - Real router coupling: `Link` from `@tanstack/react-router` in `BackLink()`
 *   (`to="/"`, chevron SVG + "Dashboard"). The affordance and its 44px target
 *   (`min-h-11`) are design and port; the `Link` import swaps for Hestia's
 *   router. Note peak.tsx inlines the same markup instead of reusing BackLink —
 *   extract one shared component at port.
 * - DEC-01 SUBJECT — the deliberately off-palette literals ARE PRESENT, as
 *   module-level consts with the authoring comment
 *   "This view leans slightly off-palette: import purple, export emerald.":
 *     const IMPORT = "#8B7BF0";   // purple
 *     const EXPORT = "#00C9A7";   // emerald
 *   Used in six places: the 46px hero number (`style={{ color: importing ?
 *   IMPORT : EXPORT }}`), the two totals spans in the chart header, AreaChart
 *   `<Area stroke/fill>` ×2, BarChart `<Bar fill>` ×2, and the two legend dots
 *   (`style={{ background: ... }}`). Every one is an inline style, so none of
 *   them can be re-tokenised by a CSS change alone.
 * - Other hardcoded hex literals (all Recharts styling, all to tokenise):
 *   CartesianGrid stroke "#1E2A3A" (×2); axis tick fill "#4A5568" (×4);
 *   Tooltip contentStyle background "#1A2230" with border "1px solid #1E2A3A"
 *   (×2); Tooltip labelStyle color "#8899AA" (×2); ReferenceLine y={0} stroke
 *   "#33465e" (×2); BarChart Tooltip cursor fill "#ffffff0a".
 * - CRITICAL — R1 / HC-006. The Day/Month/Year tabs DO read the invented P1
 *   series bucket shape. Source is `getGridBuckets(tab)` from
 *   `@/lib/mock-energy` (a mock module imported directly into a production
 *   route — the data seam is bypassed here). Field names read off each bucket:
 *     • `b.import_kwh`  and  `b.export_kwh`  in the `totals` reduce
 *     • `b.bucket`      (fed to `new Date(...)` for the x label),
 *       `b.import_kwh`, and `-b.export_kwh` in `bucketRows`
 *   The `GridBucket` type is NOT imported by name — only `SeriesFrame` comes
 *   from `@/types/energy`, so the bucket shape is inferred from the mock and has
 *   no captured contract behind it. This is exactly the pattern that shipped the
 *   NaN-rendering defect: RW-E20 must not be built until /v1/series is captured.
 * - The Live tab reads `data.gridLive` as `{ ts, power_w }[]`, splitting the
 *   signed `power_w` into imp/exp lanes (`Math.max(0, kw)` /
 *   `-Math.max(0, -kw)`). Also reads `data.p1.power_w`,
 *   `data.p1.energy_import_kwh`, `data.p1.energy_export_kwh`. `gridLive` is a
 *   second uncaptured shape — verify before RW-E19.
 * - `export_power_w`: NOT read. Import/export direction is derived purely from
 *   the sign of `p1.power_w` (`importing = gridW >= 0`), which is D1-correct.
 *   Note 0 W renders with the IMPORT colour and the text "importing from the
 *   grid" — pin that boundary in the spec.
 * - `recharts` imports: Area, AreaChart, Bar, BarChart, CartesianGrid,
 *   ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis.
 * - Imports outside the allowed set: `@tanstack/react-router`,
 *   `@/hooks/useEnergyData`, `@/lib/mock-energy`,
 *   `@/components/energy/{primitives,Skeletons,AnimatedNumber,StatusBar}`.
 * - jsdom hazards: `ResponsiveContainer` measures its parent and renders nothing
 *   at 0×0 — assert on data-shaping (liveRows / bucketRows / totals) in pure
 *   tests, not on rendered chart output. `toLocaleTimeString("en-GB", …)` and
 *   `toLocaleDateString("en-GB", …)` are ICU/timezone dependent; `getHours()` /
 *   `getDate()` are local-time dependent. `AnimatedNumber` uses rAF-style
 *   animation (fake timers needed).
 * - `stackOffset="sign"` on the BarChart is what makes export render below zero;
 *   the negative sign is applied at map time (`exp: -b.export_kwh`) rather than
 *   coming from the API.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEnergyData } from "@/hooks/useEnergyData";
import { getGridBuckets } from "@/lib/mock-energy";
import type { SeriesFrame } from "@/types/energy";
import { Card, SectionState } from "@/components/energy/primitives";
import { CardSkeleton } from "@/components/energy/Skeletons";
import { AnimatedNumber } from "@/components/energy/AnimatedNumber";
import { OfflineBanner, StatusBar } from "@/components/energy/StatusBar";
import { cn } from "@/lib/utils";

/** This view leans slightly off-palette: import purple, export emerald. */
const IMPORT = "#8B7BF0";
const EXPORT = "#00C9A7";

export const Route = createFileRoute("/grid")({
  head: () => ({
    meta: [
      { title: "Grid Detail — Import & Export Over Time" },
      {
        name: "description",
        content:
          "Live grid power with import above zero and export below, plus import-versus-export totals per day, month and year.",
      },
      { property: "og:title", content: "Grid Detail — Import & Export Over Time" },
      {
        property: "og:description",
        content: "Track exactly when your home pulls from the grid and when it pushes solar back.",
      },
    ],
  }),
  component: GridDetail,
});

const TABS: { key: "live" | SeriesFrame; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Dashboard
    </Link>
  );
}

function GridDetail() {
  const { data, isLoading, status, ageSeconds, lastUpdated } = useEnergyData();
  const [tab, setTab] = useState<"live" | SeriesFrame>("live");

  const buckets = tab === "live" ? [] : getGridBuckets(tab);
  const totals = buckets.reduce(
    (a, b) => ({ imp: a.imp + b.import_kwh, exp: a.exp + b.export_kwh }),
    { imp: 0, exp: 0 },
  );

  const liveRows =
    data?.gridLive.map((s) => {
      const kw = s.power_w / 1000;
      return {
        ts: new Date(s.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        imp: Math.max(0, kw),
        exp: -Math.max(0, -kw),
      };
    }) ?? [];

  const bucketRows = buckets.map((b) => {
    const d = new Date(b.bucket);
    return {
      label:
        tab === "day"
          ? `${String(d.getHours()).padStart(2, "0")}h`
          : tab === "month"
            ? String(d.getDate())
            : d.toLocaleDateString("en-GB", { month: "short" }),
      imp: b.import_kwh,
      exp: -b.export_kwh,
    };
  });

  const gridW = data?.p1.power_w ?? 0;
  const importing = gridW >= 0;

  return (
    <main className="min-h-screen bg-base pb-16">
      <StatusBar
        status={status}
        lastUpdated={lastUpdated}
        ageSeconds={ageSeconds}
        batterySoc={data?.sungrow.battery_soc_pct}
        solarKw={(data?.sungrow.pv_power_w ?? 0) / 1000}
        loading={isLoading}
      />
      {status === "offline" && <OfflineBanner lastUpdated={lastUpdated} />}

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-4">
        <BackLink />

        {isLoading || !data ? (
          <CardSkeleton chartHeight={240} />
        ) : (
          <>
            <Card className={cn("flex flex-col gap-2", status !== "live" && "dimmed-stale")}>
              <div className="flex items-center justify-between gap-3">
                <p className="label-caps">Grid power now</p>
                <SectionState status={status} ageSeconds={ageSeconds} />
              </div>
              <p
                className="flex items-baseline gap-2 text-[46px] font-bold leading-none"
                style={{ color: importing ? IMPORT : EXPORT }}
              >
                <AnimatedNumber value={gridW / 1000} digits={2} signed className="text-[46px]" />
                <span className="text-[16px] font-light text-text-secondary">kW</span>
              </p>
              <p className="text-[13px] text-text-secondary">
                {importing ? "importing from the grid" : "exporting to the grid"} · lifetime{" "}
                <span className="num text-text-primary">{data.p1.energy_import_kwh.toFixed(0)}</span> kWh in /{" "}
                <span className="num text-text-primary">{data.p1.energy_export_kwh.toFixed(0)}</span> kWh out
              </p>
            </Card>

            <div className="flex gap-1 rounded-xl border border-border-subtle bg-surface p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "min-h-11 flex-1 rounded-lg px-3 text-[13px] font-medium transition-colors",
                    tab === t.key
                      ? "bg-elevated text-text-primary"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                  aria-pressed={tab === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Card className="flex flex-col gap-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate text-base font-semibold">
                  {tab === "live" ? "Last 5 minutes" : `Import vs export · ${tab}`}
                </h2>
                {tab !== "live" && (
                  <p className="num shrink-0 text-[13px]">
                    <span style={{ color: IMPORT }}>{totals.imp.toFixed(1)}</span>
                    <span className="mx-1 text-text-tertiary">/</span>
                    <span style={{ color: EXPORT }}>{totals.exp.toFixed(1)}</span>
                    <span className="ml-1 text-[10px] font-light text-text-secondary">kWh</span>
                  </p>
                )}
              </div>

              <div className="h-[260px] w-full rounded-lg bg-subtle p-2">
                <ResponsiveContainer width="100%" height="100%">
                  {tab === "live" ? (
                    <AreaChart data={liveRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="#1E2A3A" vertical={false} />
                      <XAxis dataKey="ts" tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} interval={11} />
                      <YAxis tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => v.toFixed(1)} />
                      <Tooltip
                        contentStyle={{ background: "#1A2230", border: "1px solid #1E2A3A", borderRadius: 10, fontSize: 12 }}
                        labelStyle={{ color: "#8899AA" }}
                        formatter={(v: number, n: string) => [`${Math.abs(v).toFixed(2)} kW`, n === "imp" ? "Import" : "Export"]}
                      />
                      <ReferenceLine y={0} stroke="#33465e" strokeWidth={1.5} />
                      <Area dataKey="imp" stroke={IMPORT} fill={IMPORT} fillOpacity={0.22} strokeWidth={1.8} isAnimationActive={false} />
                      <Area dataKey="exp" stroke={EXPORT} fill={EXPORT} fillOpacity={0.22} strokeWidth={1.8} isAnimationActive={false} />
                    </AreaChart>
                  ) : (
                    <BarChart data={bucketRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} stackOffset="sign">
                      <CartesianGrid stroke="#1E2A3A" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} interval={tab === "day" ? 3 : 1} />
                      <YAxis tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => v.toFixed(1)} />
                      <Tooltip
                        cursor={{ fill: "#ffffff0a" }}
                        contentStyle={{ background: "#1A2230", border: "1px solid #1E2A3A", borderRadius: 10, fontSize: 12 }}
                        labelStyle={{ color: "#8899AA" }}
                        formatter={(v: number, n: string) => [`${Math.abs(v).toFixed(2)} kWh`, n === "imp" ? "Import" : "Export"]}
                      />
                      <ReferenceLine y={0} stroke="#33465e" strokeWidth={1.5} />
                      <Bar dataKey="imp" fill={IMPORT} radius={[3, 3, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="exp" fill={EXPORT} radius={[0, 0, 3, 3]} maxBarSize={18} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex gap-4 text-[11px] text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: IMPORT }} /> Import (above zero)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: EXPORT }} /> Export (below zero)
                </span>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
