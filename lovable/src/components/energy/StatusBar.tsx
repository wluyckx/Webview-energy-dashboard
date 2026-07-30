/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E07. See lovable/MANIFEST.md.
 */

import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types/energy";
import { fmtAge, fmtTime } from "@/lib/energy-format";
import { ValueUnit } from "./AnimatedNumber";

interface StatusBarProps {
  status: ConnectionStatus;
  lastUpdated: Date | null;
  ageSeconds: number;
  batterySoc?: number;
  solarKw?: number;
  loading?: boolean;
}

const dot = {
  live: "bg-success shadow-[0_0_8px_var(--success)]",
  stale: "bg-warning shadow-[0_0_8px_var(--warning)]",
  offline: "bg-danger",
} as const;

const label = { live: "Live", stale: "Delayed", offline: "Offline" } as const;

export function StatusBar({
  status,
  lastUpdated,
  ageSeconds,
  batterySoc,
  solarKw,
  loading = false,
}: StatusBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border-subtle bg-base/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dot[status])} aria-hidden />
          <span className="text-[13px] font-medium text-text-primary">{label[status]}</span>
          <span className="truncate text-[12px] text-text-secondary">
            {loading
              ? "connecting…"
              : lastUpdated
                ? status === "live"
                  ? `updated ${fmtTime(lastUpdated)}`
                  : fmtAge(ageSeconds)
                : "—"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-[13px]">
          <span className="flex items-baseline gap-1 text-battery-discharge">
            <ValueUnit
              value={batterySoc ?? 0}
              unit="%"
              digits={0}
              valueClassName="text-[15px] font-semibold"
            />
          </span>
          <span className="flex items-baseline gap-1 text-solar">
            <ValueUnit
              value={solarKw ?? 0}
              unit="kW"
              digits={2}
              valueClassName="text-[15px] font-semibold"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

export function OfflineBanner({ lastUpdated }: { lastUpdated: Date | null }) {
  return (
    <div
      role="status"
      className="border-b border-danger/40 bg-danger/12 px-4 py-2.5 text-center text-[13px] text-danger"
    >
      No connection to your meter — showing last known values from{" "}
      <span className="num">{lastUpdated ? fmtTime(lastUpdated) : "earlier"}</span>.
    </div>
  );
}
