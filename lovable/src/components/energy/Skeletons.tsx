/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E03. See lovable/MANIFEST.md.
 *
 * Note: each skeleton mirrors the layout of the component it stands in for
 * rather than being a generic spinner — that is the HC-003 skeleton
 * requirement, not decoration. `CardSkeleton`'s chartHeight prop is what lets
 * the chart sections reserve their real height and avoid layout shift.
 */

import { Card, Shimmer } from "./primitives";

export function FlowSkeleton() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-6 py-4">
        <Shimmer className="h-14 w-14 rounded-2xl" />
        <div className="flex w-full items-center justify-between">
          <Shimmer className="h-14 w-14 rounded-2xl" />
          <Shimmer className="h-14 w-14 rounded-2xl" />
          <Shimmer className="h-14 w-14 rounded-2xl" />
        </div>
        <Shimmer className="h-4 w-40" />
      </div>
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 min-[415px]:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card-surface p-4">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="mt-3 h-7 w-24" />
          <Shimmer className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ chartHeight = 220 }: { chartHeight?: number }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-3 w-20" />
      </div>
      <div className="shimmer w-full rounded-lg" style={{ height: chartHeight }} aria-hidden />
      <div className="flex gap-3">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-20" />
      </div>
    </Card>
  );
}

export function BalanceSkeleton() {
  return (
    <Card className="flex flex-col gap-4">
      <Shimmer className="h-4 w-44" />
      <Shimmer className="h-11 w-full rounded-lg" />
      <div className="flex gap-3">
        <Shimmer className="h-10 w-40 rounded-full" />
        <Shimmer className="h-10 w-40 rounded-full" />
      </div>
      <Shimmer className="h-3 w-64" />
    </Card>
  );
}
