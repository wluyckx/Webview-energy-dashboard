/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E04. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - `CHART_COLORS` below is the single most consequential thing in this file.
 *   Every Recharts view (PowerTimeline, MonthlyOverview, grid.tsx, peak.tsx)
 *   takes its colours from here as JS values, because Recharts needs colour
 *   props rather than CSS classes. These nine literals are the concrete target
 *   of RW-E15's token bridge (AC1–AC3): they become a palette module derived
 *   from the FE_design custom properties, with a test asserting the two sides
 *   cannot drift.
 * - The values are hex-identical to the corresponding `styles.css` tokens —
 *   `solar` = --solar, `gridImport` = --grid-import, and so on — with `axis`
 *   and `grid` having no direct token counterpart. Those two are the ones to
 *   escalate under DEC-01 rather than inventing a token for.
 * - `fmtTime` / `fmtDateTime` hardcode the "en-GB" locale, which makes them
 *   both TZ- and ICU-dependent. Every staging agent flagged the same hazard in
 *   the components: any test asserting formatted output needs a pinned
 *   timezone and locale, or it will pass locally and fail elsewhere.
 * - Framework-free — no React import. Keep it that way; this is the kind of
 *   module RW-E04 puts under test without rendering anything.
 */

export const W_TO_KW = 1000;

export function kw(watts: number): number {
  return watts / W_TO_KW;
}

/** Format a power value in kW with sensible precision. */
export function fmtKw(watts: number, digits = 2): string {
  const v = kw(Math.abs(watts));
  return (watts < 0 ? -v : v).toFixed(digits);
}

export function fmtNum(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export function fmtTime(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export const CHART_COLORS = {
  solar: "#F6B93B",
  batteryCharge: "#6C5CE7",
  batteryDischarge: "#A29BFE",
  gridImport: "#E17055",
  gridExport: "#00B894",
  home: "#DFE6E9",
  grid: "#1E2A3A",
  axis: "#4A5568",
  soc: "#74B9FF",
} as const;
