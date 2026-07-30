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
