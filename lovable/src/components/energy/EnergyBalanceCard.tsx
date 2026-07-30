/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E09. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - Flexbox stacked bar, no chart library. Tap-to-reveal switches each segment
 *   between percentage and absolute kWh — that interaction is the design.
 * - `const total = segments.reduce(...) || 1` is load-bearing: it is the only
 *   thing preventing a divide-by-zero on a day with no consumption at all.
 *   Preserve it and test it (RW-E09 AC4).
 * - `selfConsumption` is guarded (`produced_kwh > 0 ? … : 0`) but
 *   **`selfSufficiency` is NOT clamped to 0–100**. It cannot exceed 100 today
 *   because its numerator is a subset of `total`, but RW-E09 AC5 requires an
 *   explicit clamp at both ends rather than relying on that invariant holding.
 * - Segment colours use `var(--…)` tokens correctly — no hex literals here.
 * - The three segment labels, the two pill labels and the summary line are
 *   inline strings for i18n extraction at port (Hestia HC-004).
 * - The segment buttons carry `aria-label` with the kWh figure, so the
 *   tap-to-reveal is reachable without sight. Keep that.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { EnergyBalanceToday } from "@/types/energy";
import { Card, Pill, SectionHeading } from "./primitives";

interface Props {
  balance: EnergyBalanceToday;
  dimmed?: boolean;
  badge?: React.ReactNode;
}

export function EnergyBalanceCard({ balance, dimmed, badge }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const segments = [
    { key: "solar", label: "Solar self-consumed", kwh: balance.solar_self_consumed_kwh, color: "var(--solar)" },
    { key: "battery", label: "Battery discharged", kwh: balance.battery_discharged_kwh, color: "var(--battery-discharge)" },
    { key: "grid", label: "Grid imported", kwh: balance.grid_imported_kwh, color: "var(--grid-import)" },
  ];
  const total = segments.reduce((s, x) => s + x.kwh, 0) || 1;
  const consumed = total;
  const selfConsumption =
    balance.produced_kwh > 0
      ? (balance.solar_self_consumed_kwh / balance.produced_kwh) * 100
      : 0;
  const selfSufficiency =
    ((balance.solar_self_consumed_kwh + balance.battery_discharged_kwh) / consumed) * 100;

  return (
    <Card stale={dimmed} className="flex flex-col gap-4">
      <SectionHeading title="Energy balance · today" meta={badge} />

      <div className="flex h-11 w-full overflow-hidden rounded-lg bg-subtle" role="group" aria-label="Sources covering today's consumption">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setOpen(open === s.key ? null : s.key)}
            className={cn(
              "h-full min-w-[6px] transition-[filter,flex-grow] duration-500 hover:brightness-125",
              open === s.key && "brightness-125",
            )}
            style={{ width: `${(s.kwh / total) * 100}%`, backgroundColor: s.color }}
            aria-label={`${s.label}: ${s.kwh.toFixed(1)} kWh`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[12px] text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span>{s.label}</span>
            <span className={cn("num text-text-primary", open && open !== s.key && "opacity-50")}>
              {open === s.key ? `${s.kwh.toFixed(2)} kWh` : `${Math.round((s.kwh / total) * 100)}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Pill label="self-consumption" value={`${Math.round(selfConsumption)}%`} tone="solar" />
        <Pill label="self-sufficiency" value={`${Math.round(selfSufficiency)}%`} tone="export" />
      </div>

      <p className="num text-[12px] text-text-secondary">
        produced {balance.produced_kwh.toFixed(1)} kWh · exported {balance.exported_kwh.toFixed(1)} kWh ·
        imported {balance.grid_imported_kwh.toFixed(1)} kWh
      </p>
    </Card>
  );
}
