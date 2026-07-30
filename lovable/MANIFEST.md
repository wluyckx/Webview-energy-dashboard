# `lovable/` — staged design reference manifest

**Status**: read-only design reference (ADR-010). Staged by story RW-C02 on
2026-07-30 from the Lovable cloud project **"Energy Watch"**.

**Why this directory exists.** ADR-010 recorded the design as "captured in
~2,300 reviewed lines", but the capture was a *review* — the lines themselves
lived only in a vendor SaaS project, one account or credit balance away from
gone, while ten port stories depended on reading them. That was risk **R12**.
This directory closes it.

**Rules.**
- Nothing here is imported into `src/`. The legacy artifact is frozen (ADR-012).
- Nothing here is edited to "fix" it. Every file is verbatim below its banner so
  a future story can diff it against the source. Corrections belong in the port,
  not in the reference. Editing a staged file is a `scope_violation`.
- `lovable/` is in `.prettierignore` for the same reason (RW-M01 AC3b).
- The Lovable project is **not** a pipeline. Re-opening it as a source of truth
  needs decision DEC-05 settled first.

**Not staged, by ADR-010.** 46 shadcn/ui components (zero application imports),
26 `@radix-ui/*` packages, `server.ts` / `start.ts` (SSR + CSRF middleware for
server functions that do not exist), `router.tsx` / `routeTree.gen.ts`,
`error-capture.ts`, `lovable-error-reporting.ts`, the vendor `vite.config.ts` /
`bunfig.toml` / `bun.lock`, `components.json`, `.lovable/`, `robots.txt`,
`package.json`, `use-mobile.tsx`, and the Google Fonts `<link>` tags. That is
~70% of the project, and none of it is coming back.

---

## Staged files

| File | Lines | Port destination | Chart lib |
|---|---:|---|---|
| `src/styles.css` | 304 | RW-E02 | — |
| `src/lib/utils.ts` | 22 | RW-E03 | — |
| `src/lib/energy-format.ts` | 50 | RW-E04 | — |
| `src/types/energy.ts` | 121 | RW-E04 | — |
| `src/lib/mock-energy.ts` | 369 | RW-E05 | — |
| `src/hooks/useEnergyData.tsx` | 102 | RW-E05 | — |
| `src/components/energy/AnimatedNumber.tsx` | 121 | RW-E03 | — |
| `src/components/energy/primitives.tsx` | 140 | RW-E03 | — |
| `src/components/energy/Skeletons.tsx` | 73 | RW-E03 | — |
| `src/components/energy/PowerFlow.tsx` | 302 | RW-E06 | — (ADR-008) |
| `src/components/energy/StatusBar.tsx` | 86 | RW-E07 | — |
| `src/components/energy/KpiStrip.tsx` | 158 | RW-E08 | — |
| `src/components/energy/EnergyBalanceCard.tsx` | 94 | RW-E09 | — |
| `src/components/energy/CostStub.tsx` | 37 | RW-E10 | — |
| `src/routes/index.tsx` | 149 | RW-E11 (anatomy only) | — |
| `src/components/energy/PowerTimeline.tsx` | 230 | RW-E16 | Recharts |
| `src/components/energy/MonthlyOverview.tsx` | 153 | RW-E17 | Recharts |
| `src/routes/peak.tsx` | 284 | RW-E18 | Recharts |
| `src/routes/grid.tsx` | 294 | RW-E19 / RW-E20 | Recharts |

Line counts include each file's banner. Per-file port notes live in the banners;
what follows is what only becomes visible across the whole set.

---

## Main dashboard section order (`routes/index.tsx` — the RW-E11 payload)

Container: `mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-4 md:gap-10`.

1. `StatusBar`
2. `OfflineBanner` — conditional on `status === "offline"`
3. `Card aria-label="Live power flow"` wrapping `PowerFlow` + centred `SectionState`
4. `KpiStrip`
5. two-column `md:grid-cols-2`: `EnergyBalanceCard`, then `CostStub`
6. `PowerTimeline`
7. `MonthlyOverview`

Skeleton branch order: `FlowSkeleton`, `KpiSkeleton`, `BalanceSkeleton`,
`CardSkeleton chartHeight={260}`, `CardSkeleton`.

---

## Findings that are NOT just staging notes

Staging surfaced defects and contract gaps in the reference itself. They are
recorded here because they change what the port stories must do; the code is
left untouched per the read-only rule.

### F1 — `PowerTimeline` derives grid direction from Sungrow, not P1
`grid = (avg_load_power_w - avg_pv_power_w + avg_battery_power_w) / 1000`.
Architecture.md makes **P1 `power_w` the authoritative source for grid
direction**; this computes it from inverter data instead. The polarity happens to
match, but the timeline will not tie out with the P1-sourced KPI card, and it is
the same class of error as D1. **RW-E16 must not port this derivation** — the
timeline needs a P1-sourced series, which for history means it is entangled with
R1. Escalate at port rather than copying.

### F2 — `grid.tsx` imports the mock directly into a production route
`getGridBuckets(tab)` is imported from `@/lib/mock-energy` inside the route,
bypassing the data seam entirely. Fields read: `import_kwh`, `export_kwh`,
`bucket`. `GridBucket` is not even imported by name, so the shape is inferred
from the mock with **no captured contract behind it** — the R1 invention,
confirmed in production code. RW-E20 stays blocked on RW-C01.

### F3 — `peak.tsx` live headroom is instantaneous, not a rolling average
Architecture.md describes "live headroom from a client-side 15-minute rolling
average of `import_power_w` … label it indicative". The actual code is
`headroom = liveImportW / peakW * 100` — an **instantaneous** reading divided by
a 15-minute-average peak, presented as "You're at {N}% of this month's peak
right now." with **no hedge**. Either the architecture's description or the code
is wrong; the architecture's version is the correct one and RW-E18 AC3 already
requires the indicative label. Do not port the unhedged sentence.

### F4 — `peak.tsx` unguarded divide → NaN reaches a colour decision
`headroom` is guarded by `peakW > 0`, but the adjacent
`toneFor(liveImportW / peakW)` is **not**. With `peakW === 0` (day one of a
month) the ratio is `Infinity`/`NaN`, which falls through `toneFor` to
`--danger` — so the gauge shows an alarming red while the number reads 0%. This
is a live HC-003 violation in the reference. RW-E18 AC6 covers the month-rollover
case; this is the concrete bug it must not reproduce.

### F5 — `MonthlyOverview`'s `stackOffset="sign"` is inert, and the corner radii lie
`stackOffset="sign"` is set on `<BarChart>` but neither `<Bar>` carries a
`stackId`, so it does nothing. Direction comes from the pre-negated datum
`netDown: -d.net_grid_kwh`. Consequences: export days draw *upward*, sharing the
upper half-plane with the solar bar and contradicting the copy "Solar production
up, net grid down", with colour as the only discriminator; and the hardcoded
radii (solar `[3,3,0,0]`, netDown `[0,0,3,3]`) are wrong for upward export bars.
RW-E17 AC3 requires real `stackOffset="sign"` with `stackId` — this is why.

### F6 — undocumented shapes beyond R1 (HC-006)
- `MonthlyDay` = `{ date, solar_kwh, net_grid_kwh }` — neither `solar_kwh` nor
  `net_grid_kwh` appears in Architecture.md's API Integration section. The
  monthly view is fed from Sungrow `/v1/series`, so this is a client-derived
  view model whose derivation must be documented before RW-E17.
- `peak.tsx` reads `p1.import_power_w`; Architecture.md documents the signed
  `power_w`. Confirm `import_power_w` in the RW-C01 capture.
- `GridSample` = `{ ts, power_w }` for the live ring buffer — client-side, no API
  behind it, which is correct, but say so explicitly at port.

### F7 — the mock is deterministic, and that is worth protecting
No `Math.random()`, no `Date.now()`. Pseudo-randomness is the pure hash
`seeded(n) = frac(sin(n * 12.9898) * 43758.5453)`; all clock coupling is via
`now = new Date()` **default parameters** on six exported functions. Injecting a
fixed `now` therefore makes the whole module reproducible — exactly what RW-E05
and the test suite need. Two caveats: every value is local-time-derived while
timestamps are emitted as UTC `toISOString()`, so
`new Date(y,m,d).toISOString().slice(0,10)` in `getMonthDays` yields the
**previous** calendar day in Europe/Brussels; and `getGridLive` re-integrates SoC
from midnight inside a 61-sample loop.

### F8 — the mock exercises both signs, but paints "no data yet" as zero
Export *is* exercised (the battery absorbs only 82% of surplus, so midday
`gridSigned` goes negative) and battery discharge is exercised — so the D1
scenario is reproducible from the mock without touching `export_power_w`, which
appears zero times in the whole staged set. But `getDaySeries` emits future hours
as real timestamps with every value `0`, including `avg_battery_soc_pct: 0`,
which the 8% floor makes impossible. A chart cannot distinguish "not yet" from
"zero watts" — RW-E15's empty/gap handling must, and the mock needs an explicit
absent marker at port.

### F9 — jsdom hazards, consistent across every chart file
Every Recharts view uses `ResponsiveContainer`, which measures 0×0 under jsdom
and never mounts its children — confirming RW-E15 AC4's mock is mandatory rather
than convenient. Also present throughout: `toLocaleTimeString`/
`toLocaleDateString("en-GB")` (ICU- and TZ-dependent), `getHours()`/`getDate()`
(local time), `AnimatedNumber`'s `requestAnimationFrame` + `performance.now`
(needs fake timers), and `window.matchMedia` in `usePrefersReducedMotion`.
`peak.tsx`'s `labelFormatter={(_l, p: any) => …}` will not survive strict
`tsc --noEmit`.

### F10 — hardcoded hex inventory (the RW-E15 AC3 target)
Correct `var(--token)` usage exists in `PowerFlow`'s edges, `EnergyBalanceCard`'s
segments and `peak.tsx`'s gauge. Violations to tokenise at port:

| File | Literals |
|---|---|
| `PowerFlow.tsx` | `#F6B93B`, `#4A5568`, `#A29BFE`, `#6C5CE7`, `#DFE6E9`, `#E17055`, `#00B894` — all four inline icons |
| `KpiStrip.tsx` | `#FDCB6E`, `#6C5CE7`, `#A29BFE` in the battery bar `boxShadow` |
| `CostStub.tsx` | `#8899AA` ×2 in the icon |
| `PowerTimeline.tsx` | `#33465e` (zero reference line) |
| `MonthlyOverview.tsx` | `#33465e`, `#ffffff0a` |
| `grid.tsx` | `#8B7BF0` / `#00C9A7` (**DEC-01**, module consts, 6 inline-style usages), plus `#1E2A3A`, `#4A5568`, `#1A2230`, `#8899AA`, `#33465e`, `#ffffff0a` |
| `peak.tsx` | `#FDCB6E`, `#E17055`, `#00B894`, `#1E2A3A`, `#4A5568`, `#1A2230`, `#ffffff0a` |
| `energy-format.ts` | the nine `CHART_COLORS` values — the real bridge target |

Note the pattern: the chart files are the offenders, because Recharts takes
colour props rather than classes. That is precisely the permanent cost RW-E15
exists to pay down once.

### F11 — capacity gauge constants (`peak.tsx`, for RW-E18 AC2)
- `REFERENCE_W = 2500` → the 2.5 kW Belgian residential reference.
- Scale maximum `REFERENCE_W * 1.6` = 4000 W — **also hardcoded again** in the
  label string `"4.00 kW"`, so there are two sources of truth. Fix at port.
- Marker at `refPct = 62.5%` of the scale.
- Fill `gaugePct = min(100, peakW / 4000 * 100)` — clamped, so every peak above
  4.00 kW looks identical.
- `toneFor(ratio)` with `ratio = peakW / 2500`: `< 0.75` → `--success`
  ("comfortable", below 1.875 kW); `< 1` → `--warning` (1.875–2.50 kW); `>= 1` →
  `--danger` (from 2.50 kW).

### F12 — smaller things to fix at port, not here
- `usePrefersReducedMotion` is defined inside `AnimatedNumber.tsx` but needed by
  `PowerFlow` and by RW-E15's central animation switch — hoist it.
- `styles.css` `@import "tw-animate-css"` is an **unapproved dependency** that
  nothing in the portable set appears to use. Discard; wanting it is an
  escalation (only Recharts is pre-approved).
- `styles.css`'s `@layer base` sets `html`/`body` background and
  `color-scheme: dark` **globally** — the exact leak HC-004's `.energy` scoping
  must prevent.
- `KpiStrip`'s `importing = gridW >= 0` renders 0 W in the import colour while
  labelling it "balanced"; `grid.tsx` does the same and says "importing from the
  grid". Pick one behaviour at port and assert it.
- `MonthlyOverview` has no null gate at all (`row.solar.toFixed(1)`), unlike
  `PowerTimeline` which gates empty buckets. Missing field → NaN on screen.
- `index.tsx` has a single page-wide `isLoading || !data` gate and no
  per-section unavailable state — RW-E07 needs the per-section version.
- `peak.tsx` inlines its own back-link instead of reusing `grid.tsx`'s
  `BackLink`; extract one.
- `peak.tsx` `isMax: p.avg_power_w === peakW` is float equality.

---

## Provenance

Captured with the Lovable MCP `read_file` tool against project
`"Energy Watch"`, ref `HEAD`, on 2026-07-30. Vendor content is byte-identical to
what that tool returned; each file's banner is the only addition. Three files
(`types/energy.ts`, `lib/energy-format.ts`, `hooks/useEnergyData.tsx`) were
staged earlier during the assessment and were retro-fitted with the standard
banner by RW-C02.

Secrets sweep before commit: no credential, API token, internal IP, hostname,
Tailscale address or LAN reference anywhere in the staged tree. The remote is
public; this check is a security rule, not hygiene.
