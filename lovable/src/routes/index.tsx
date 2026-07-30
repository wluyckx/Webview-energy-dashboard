/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E11. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - TanStack scaffold to DELETE at port: `createFileRoute("/")` and the whole
 *   `head: () => ({ meta: [...] })` block. That block carries four per-route SEO
 *   entries (title, name="description", property="og:title",
 *   property="og:description") — pointless in an authenticated PWA behind a
 *   session cookie, and deleted outright. What survives is `component: Dashboard`
 *   → the `Dashboard()` function body. No `<Link>` in this file.
 * - REAL DESIGN INFORMATION — the section order, top to bottom, and the
 *   component rendering each. This ordering is the reason RW-E11 exists:
 *     1. <StatusBar>          — sticky header; takes status, lastUpdated,
 *                               ageSeconds, batterySoc, solarKw, loading
 *     2. <OfflineBanner>      — conditional, only when status === "offline"
 *     3. <Card aria-label="Live power flow"> wrapping <PowerFlow>, with a
 *        centred <SectionState> badge underneath (`mt-2 flex justify-center`)
 *     4. <KpiStrip>
 *     5. two-column grid (`grid gap-4 md:grid-cols-2`):
 *        <EnergyBalanceCard> then <CostStub>
 *     6. <PowerTimeline series={data.daySeries}>
 *     7. <MonthlyOverview days={data.monthDays}>
 *   Container: `mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-4 md:gap-10`.
 * - Loading branch mirrors that order with skeletons, in this sequence:
 *   FlowSkeleton, KpiSkeleton, BalanceSkeleton, CardSkeleton chartHeight={260},
 *   CardSkeleton. Single `isLoading || !data` gate for the whole page — there is
 *   no per-section loading state (relevant to the D3 unavailable-state work).
 * - Hardcoded hex literals: NONE in this file. Colour comes entirely from
 *   Tailwind token classes (bg-base) and the child components.
 * - `recharts` imports: NONE here; charting lives in PowerTimeline /
 *   MonthlyOverview.
 * - Imports outside the allowed set: `@tanstack/react-router` (scaffold),
 *   `@/hooks/useEnergyData` (the data seam — becomes Hestia's useEnergyData at
 *   RW-E13), and eight local `@/components/energy/*` modules.
 * - `export_power_w`: NOT read anywhere. Fields consumed are
 *   sungrow.{pv_power_w, battery_power_w, battery_soc_pct, load_power_w,
 *   pv_daily_kwh}, p1.power_w, capacity.{monthly_peak_w, monthly_peak_ts},
 *   plus data.balance / data.daySeries / data.monthDays. Grid flow is driven by
 *   the signed `p1.power_w` alone — the D1-correct source.
 * - jsdom risk: no ResponsiveContainer or matchMedia in this file, but the
 *   rendered children (PowerTimeline, MonthlyOverview) carry both, so a
 *   full-page render test inherits the measured-dimension problem. The
 *   `rise-in` class is a CSS entry animation only.
 * - No React import (new JSX transform assumed by the toolchain).
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEnergyData } from "@/hooks/useEnergyData";
import { OfflineBanner, StatusBar } from "@/components/energy/StatusBar";
import { PowerFlow } from "@/components/energy/PowerFlow";
import { KpiStrip } from "@/components/energy/KpiStrip";
import { EnergyBalanceCard } from "@/components/energy/EnergyBalanceCard";
import { PowerTimeline } from "@/components/energy/PowerTimeline";
import { MonthlyOverview } from "@/components/energy/MonthlyOverview";
import { CostStub } from "@/components/energy/CostStub";
import { Card, SectionState } from "@/components/energy/primitives";
import {
  BalanceSkeleton,
  CardSkeleton,
  FlowSkeleton,
  KpiSkeleton,
} from "@/components/energy/Skeletons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home Energy — Live Solar, Battery & Grid Dashboard" },
      {
        name: "description",
        content:
          "Live residential energy monitoring: solar production, home battery state of charge, grid import and export, and your monthly capacity peak.",
      },
      { property: "og:title", content: "Home Energy — Live Solar, Battery & Grid Dashboard" },
      {
        property: "og:description",
        content:
          "See where your energy is going right now: solar, battery, home and grid in one calm instrument panel.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, status, ageSeconds, lastUpdated } = useEnergyData();
  const dimmed = status !== "live";
  const badge = <SectionState status={status} ageSeconds={ageSeconds} />;

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

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-4 md:gap-10">
        {isLoading || !data ? (
          <>
            <FlowSkeleton />
            <KpiSkeleton />
            <BalanceSkeleton />
            <CardSkeleton chartHeight={260} />
            <CardSkeleton />
          </>
        ) : (
          <>
            <Card className="rise-in pt-6" aria-label="Live power flow">
              <PowerFlow
                pvW={data.sungrow.pv_power_w}
                batteryW={data.sungrow.battery_power_w}
                socPct={data.sungrow.battery_soc_pct}
                loadW={data.sungrow.load_power_w}
                gridW={data.p1.power_w}
                dimmed={dimmed}
              />
              <div className="mt-2 flex justify-center">{badge}</div>
            </Card>

            <KpiStrip
              gridW={data.p1.power_w}
              socPct={data.sungrow.battery_soc_pct}
              batteryW={data.sungrow.battery_power_w}
              pvDailyKwh={data.sungrow.pv_daily_kwh}
              pvW={data.sungrow.pv_power_w}
              monthlyPeakW={data.capacity.monthly_peak_w}
              monthlyPeakTs={data.capacity.monthly_peak_ts}
              dimmed={dimmed}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <EnergyBalanceCard balance={data.balance} dimmed={dimmed} badge={badge} />
              <CostStub />
            </div>

            <PowerTimeline series={data.daySeries} dimmed={dimmed} badge={badge} />
            <MonthlyOverview days={data.monthDays} dimmed={dimmed} badge={badge} />
          </>
        )}
      </div>
    </main>
  );
}
