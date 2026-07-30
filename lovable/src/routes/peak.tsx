/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E18. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - TanStack scaffold to DELETE: `createFileRoute("/peak")` and the whole
 *   `head: () => ({ meta: [...] })` block — four per-route SEO/OG entries
 *   (title, description, og:title, og:description), pointless in an
 *   authenticated PWA, deleted at port. `component: PeakScreen` survives.
 * - Router coupling: `Link to="/"` is INLINED here (chevron SVG + "Dashboard",
 *   `min-h-11`) rather than reusing grid.tsx's `BackLink()` — the same markup
 *   duplicated across two routes. Extract one component at port.
 * - CRITICAL — the capacity gauge numbers, verbatim:
 *     • Reference value:  `const REFERENCE_W = 2500;` — commented "Belgian
 *       residential capacity-tariff reference: 2.5 kW minimum billed peak".
 *     • Full scale maximum: `REFERENCE_W * 1.6` = 4000 W = 4.00 kW. The scale
 *       end is also hardcoded twice in copy: the axis labels read "0 kW" and
 *       "4.00 kW". Two sources of truth for the same number.
 *     • Marker position: `refPct = (REFERENCE_W / (REFERENCE_W * 1.6)) * 100`
 *       = 62.5% of the scale, drawn as a 1px `bg-text-secondary` line.
 *     • Fill width: `gaugePct = Math.min(100, (peakW / (REFERENCE_W * 1.6)) *
 *       100)` — clamped at 100%, so any peak above 4.00 kW looks identical.
 *     • Colour escalation, `toneFor(ratio)` with `ratio = peakW / REFERENCE_W`:
 *         ratio <  0.75  → var(--success)  "comfortable"            (< 1.875 kW)
 *         ratio <  1     → var(--warning)  "approaching the reference"
 *                                                        (1.875 kW – 2.50 kW)
 *         ratio >= 1     → var(--danger)   "above the reference"    (>= 2.50 kW)
 *       Gauge tones correctly use CSS custom properties; the chart below uses
 *       raw hex — inconsistent, tokenise the chart at port.
 * - CRITICAL — the "Live headroom" figure IS computed client-side and is NOT
 *   labelled indicative or approximate:
 *     `const headroom = peakW > 0 ? (liveImportW / peakW) * 100 : 0;`
 *   It is an INSTANTANEOUS reading (`data.p1.import_power_w`) divided by a
 *   15-minute-average peak — not a rolling average, despite the copy "You're at
 *   {N}% of this month's peak right now." and "drawing X kW of Y kW". No hedge
 *   word anywhere. RW-E18 must either compute a real rolling 15-min average or
 *   label the figure approximate.
 *   Latent D3/NaN risk: the tone call `toneFor(liveImportW / peakW)` is NOT
 *   guarded by the `peakW > 0` check that protects `headroom`. With peakW === 0
 *   the ratio is Infinity (or NaN when liveImportW is 0 too), so the display
 *   falls through to --danger while the number reads 0%.
 * - `data.p1.import_power_w` is a field name to check against the captured P1
 *   contract (Architecture.md documents the signed `power_w`); if it is not in
 *   the capture it is an HC-006 escalation, not an assumption.
 *   Other fields read: `capacity.monthly_peak_w`, `capacity.monthly_peak_ts`,
 *   `capacity.peaks` as `{ ts, avg_power_w }[]`.
 * - Hardcoded hex literals (all in the peaks BarChart, all to tokenise):
 *   ReferenceLine stroke "#FDCB6E" (dashed "4 4", at REFERENCE_W / 1000 = 2.5);
 *   Cell fill "#E17055" (coral, the bill-setting max), "#FDCB6E" (amber, above
 *   reference), "#00B894" (green, below); CartesianGrid stroke "#1E2A3A"; axis
 *   tick fill "#4A5568" (×2); Tooltip contentStyle background "#1A2230" with
 *   border "1px solid #1E2A3A"; Tooltip cursor fill "#ffffff0a". No labelStyle
 *   here, unlike grid.tsx.
 * - `export_power_w`: NOT read anywhere in this file.
 * - `recharts` imports: Bar, BarChart, CartesianGrid, Cell, ReferenceLine,
 *   ResponsiveContainer, Tooltip, XAxis, YAxis.
 * - Imports outside the allowed set: `@tanstack/react-router`,
 *   `@/hooks/useEnergyData`,
 *   `@/components/energy/{primitives,Skeletons,AnimatedNumber,StatusBar}`.
 *   (`@/lib/energy-format` fmtDateTime and `@/lib/utils` cn are in the set.)
 * - jsdom hazards: `ResponsiveContainer` needs measured parent dimensions —
 *   assert on `rows`, `gaugePct`, `refPct`, `toneFor()` and `headroom` as pure
 *   functions instead. `new Date(p.ts).getDate()` and `fmtDateTime` are
 *   timezone/ICU dependent. `AnimatedNumber` needs fake timers. The Tooltip
 *   `labelFormatter={(_l, p: any) => …}` uses `any` — will fail a strict
 *   `tsc --noEmit` under Hestia's config.
 * - Minor: `isMax: p.avg_power_w === peakW` is float equality, and `<Cell
 *   key={i}>` keys by array index. Both to fix at port.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEnergyData } from "@/hooks/useEnergyData";
import { Card, SectionState } from "@/components/energy/primitives";
import { CardSkeleton } from "@/components/energy/Skeletons";
import { AnimatedNumber } from "@/components/energy/AnimatedNumber";
import { OfflineBanner, StatusBar } from "@/components/energy/StatusBar";
import { fmtDateTime } from "@/lib/energy-format";
import { cn } from "@/lib/utils";

/** Belgian residential capacity-tariff reference: 2.5 kW minimum billed peak. */
const REFERENCE_W = 2500;

export const Route = createFileRoute("/peak")({
  head: () => ({
    meta: [
      { title: "Capacity Peak — Avoid a Higher Monthly Bill" },
      {
        name: "description",
        content:
          "Your highest 15-minute average grid import this month, measured against the 2.5 kW Belgian reference, with live headroom and every peak of the month.",
      },
      { property: "og:title", content: "Capacity Peak — Avoid a Higher Monthly Bill" },
      {
        property: "og:description",
        content: "One careless quarter-hour sets your capacity charge for the whole month. Watch it here.",
      },
    ],
  }),
  component: PeakScreen,
});

function toneFor(ratio: number) {
  if (ratio < 0.75) return { color: "var(--success)", label: "comfortable" };
  if (ratio < 1) return { color: "var(--warning)", label: "approaching the reference" };
  return { color: "var(--danger)", label: "above the reference" };
}

function PeakScreen() {
  const { data, isLoading, status, ageSeconds, lastUpdated } = useEnergyData();

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
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dashboard
        </Link>

        {isLoading || !data ? (
          <>
            <CardSkeleton chartHeight={120} />
            <CardSkeleton chartHeight={220} />
          </>
        ) : (
          <PeakContent
            peakW={data.capacity.monthly_peak_w}
            peakTs={data.capacity.monthly_peak_ts}
            peaks={data.capacity.peaks}
            liveImportW={data.p1.import_power_w}
            status={status}
            ageSeconds={ageSeconds}
          />
        )}
      </div>
    </main>
  );
}

function PeakContent({
  peakW,
  peakTs,
  peaks,
  liveImportW,
  status,
  ageSeconds,
}: {
  peakW: number;
  peakTs: string;
  peaks: { ts: string; avg_power_w: number }[];
  liveImportW: number;
  status: "live" | "stale" | "offline";
  ageSeconds: number;
}) {
  const ratio = peakW / REFERENCE_W;
  const tone = toneFor(ratio);
  const headroom = peakW > 0 ? (liveImportW / peakW) * 100 : 0;
  const gaugePct = Math.min(100, (peakW / (REFERENCE_W * 1.6)) * 100);
  const refPct = (REFERENCE_W / (REFERENCE_W * 1.6)) * 100;
  const dimmed = status !== "live";

  const rows = peaks.map((p) => {
    const d = new Date(p.ts);
    return {
      day: d.getDate(),
      full: fmtDateTime(p.ts),
      kw: p.avg_power_w / 1000,
      isMax: p.avg_power_w === peakW,
    };
  });

  return (
    <>
      <Card className={cn("flex flex-col gap-5", dimmed && "dimmed-stale")}>
        <div className="flex items-center justify-between gap-3">
          <p className="label-caps">Monthly capacity peak</p>
          <SectionState status={status} ageSeconds={ageSeconds} />
        </div>

        <div>
          <p className="flex items-baseline gap-2 text-[46px] font-bold leading-none" style={{ color: tone.color }}>
            <AnimatedNumber value={peakW / 1000} digits={2} className="text-[46px]" />
            <span className="text-[16px] font-light text-text-secondary">kW</span>
          </p>
          <p className="mt-2 text-[13px] text-text-secondary">set on {fmtDateTime(peakTs)}</p>
        </div>

        <div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${gaugePct}%`, backgroundColor: tone.color, boxShadow: `0 0 12px ${tone.color}` }}
            />
            <span className="absolute inset-y-0 w-px bg-text-secondary" style={{ left: `${refPct}%` }} aria-hidden />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
            <span className="num shrink-0">0 kW</span>
            <span className="truncate text-center">2.50 kW reference · {tone.label}</span>
            <span className="num shrink-0">4.00 kW</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-subtle p-4">
          <p className="label-caps">Live headroom</p>
          <p className="mt-2 text-[15px] text-text-primary">
            You're at{" "}
            <span className="num inline-block text-[28px] font-bold leading-none" style={{ color: toneFor(liveImportW / peakW).color }}>
              {Math.round(headroom)}
              <span className="text-[14px] font-light text-text-secondary">%</span>
            </span>{" "}
            of this month's peak right now.
          </p>
          <p className="mt-1 num text-[12px] text-text-secondary">
            drawing {(liveImportW / 1000).toFixed(2)} kW of {(peakW / 1000).toFixed(2)} kW
          </p>
        </div>

        <p className="text-[13px] leading-relaxed text-text-secondary">
          In Belgium your capacity charge is billed on the highest 15-minute average import of the month — so a
          single quarter-hour with the oven, dryer and car charger together sets the price for all thirty days.
          Spreading big loads apart keeps this number, and your bill, down.
        </p>
      </Card>

      <Card className={cn("flex flex-col gap-4", dimmed && "dimmed-stale")}>
        <h2 className="text-base font-semibold">Recorded peaks this month</h2>
        <div className="h-[240px] w-full rounded-lg bg-subtle p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#1E2A3A" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fill: "#4A5568", fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip
                cursor={{ fill: "#ffffff0a" }}
                contentStyle={{ background: "#1A2230", border: "1px solid #1E2A3A", borderRadius: 10, fontSize: 12 }}
                labelFormatter={(_l, p: any) => p?.[0]?.payload?.full ?? ""}
                formatter={(v: number) => [`${v.toFixed(2)} kW`, "15-min average"]}
              />
              <ReferenceLine y={REFERENCE_W / 1000} stroke="#FDCB6E" strokeDasharray="4 4" />
              <Bar dataKey="kw" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {rows.map((r, i) => (
                  <Cell
                    key={i}
                    fill={r.isMax ? "#E17055" : r.kw > REFERENCE_W / 1000 ? "#FDCB6E" : "#00B894"}
                    fillOpacity={r.isMax ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-text-secondary">
          Dashed line marks the 2.5 kW reference. The coral bar is the peak currently setting your bill.
        </p>
      </Card>
    </>
  );
}
