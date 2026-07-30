/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E10. See lovable/MANIFEST.md.
 *
 * PORT NOTE: the blurred overlay plus "Coming soon" pill is what makes this
 * read as deliberate rather than as a failed load (RW-E10 AC1). The inline
 * `#8899AA` in the icon is a hardcoded-hex violation to fix at port.
 */

import { Card } from "./primitives";

export function CostStub() {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-elevated/25 backdrop-blur-[1px]" aria-hidden />
      <div className="relative flex flex-col items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border-subtle bg-subtle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="8.4" stroke="#8899AA" strokeWidth="1.6" />
            <path d="M14.4 9.4A2.9 2.9 0 0 0 12 8.2c-1.5 0-2.5.8-2.5 1.9 0 2.7 5.2 1.4 5.2 4.1 0 1.1-1.1 1.9-2.7 1.9a3 3 0 0 1-2.5-1.2M12 6.6v10.8" stroke="#8899AA" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h3 className="text-base font-semibold text-text-primary">Cost tracking</h3>
          <p className="mt-1 max-w-sm text-[13px] text-text-secondary">
            Once your tariff details are connected, this card will translate every kWh above into euros —
            including the monthly capacity charge.
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center rounded-lg border border-border-subtle px-4 text-[13px] font-medium text-text-secondary">
          Coming soon
        </span>
      </div>
    </Card>
  );
}
