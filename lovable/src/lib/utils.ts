/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 *
 * Captured verbatim from the Lovable project "Energy Watch" on 2026-07-30.
 * Everything below this banner is the vendor file, unmodified.
 *
 * Do NOT import this into src/ — the legacy artifact is frozen (ADR-012) and
 * this tree is a design reference, not a build input. See lovable/MANIFEST.md.
 *
 * PORT NOTE: this is the `cn()` helper the whole component set depends on.
 * It pulls in `clsx` + `tailwind-merge`. DEC-03 decides whether Hestia accepts
 * those two dependencies or replaces this with a ~10-line local helper —
 * usage across the energy components is simple conditional concatenation, so
 * the local helper is viable. Port destination: RW-E03.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
