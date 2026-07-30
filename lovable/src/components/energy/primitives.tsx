/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 *
 * Captured verbatim from the Lovable project "Energy Watch" on 2026-07-30.
 * Everything below this banner is the vendor file, unmodified.
 *
 * Do NOT import this into src/ — the legacy artifact is frozen (ADR-012) and
 * this tree is a design reference, not a build input. See lovable/MANIFEST.md.
 *
 * PORT NOTE (destination: RW-E03):
 * - Zero shadcn/Radix imports, as the assessment claimed — only React, `cn()`,
 *   the types and the format lib. Verified at capture.
 * - `StaleBadge` / `HistoricalBadge` / `SectionState` are the HC-003 per-section
 *   degradation treatment. `SectionState` returning null when live is the whole
 *   contract: live sections carry no badge, stale carry an age, offline carry
 *   "Last known".
 * - All ~10 user-facing strings here ("Data from …", "Last known") are inline
 *   literals and must go through Hestia's i18n at port (Hestia HC-004).
 * - `Pill` uses `min-h-11` (44px) — that is the touch-target rule, not a
 *   styling preference. Keep it.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types/energy";
import { fmtAge } from "@/lib/energy-format";

export function Card({
  children,
  className,
  stale = false,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  stale?: boolean;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn("card-surface card-hover p-5 sm:p-6", stale && "dimmed-stale", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 className="truncate text-base font-semibold text-text-primary sm:text-lg">{title}</h2>
      <div className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
        {meta}
        {action}
      </div>
    </header>
  );
}

/** Warning-tinted badge for a section whose data has gone stale. */
export function StaleBadge({ ageSeconds, className }: { ageSeconds: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      Data from {fmtAge(ageSeconds)}
    </span>
  );
}

export function HistoricalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary",
        className,
      )}
    >
      Last known
    </span>
  );
}

/** Per-section state marker: nothing when live, badge when stale/offline. */
export function SectionState({
  status,
  ageSeconds,
}: {
  status: ConnectionStatus;
  ageSeconds: number;
}) {
  if (status === "live") return null;
  if (status === "offline") return <HistoricalBadge />;
  return <StaleBadge ageSeconds={ageSeconds} />;
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} aria-hidden />;
}

export function Pill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "solar" | "export" | "accent";
}) {
  const tones = {
    solar: "border-solar/35 bg-solar/10 text-solar",
    export: "border-grid-export/35 bg-grid-export/10 text-grid-export",
    accent: "border-accent/35 bg-accent/10 text-accent",
  } as const;
  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-full border px-4 py-2",
        tones[tone],
      )}
    >
      <span className="num text-lg font-bold">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}
