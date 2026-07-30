# Architecture.md - Energy Dashboard

**Last Updated**: 2026-07-29 (second revision this date)
**Supersedes**: the as-is-adoption architecture of 2026-07-29 (preserved at
`Architecture.md.backup-adopt-asis`) and the vanilla-JS single-file architecture
of 2026-02-15 (preserved at `Architecture.md.backup`).
**Primary input**: `docs/LOVABLE_INTEGRATION_ASSESSMENT.md` (independent
Architect investigation, 2026-07-29) — its findings are adopted in full.

---

## Overview

Residential energy monitoring dashboard for a Belgian solar + battery + grid
setup. Visualizes real-time and historical energy data from two self-hosted
FastAPI backends (P1 smart meter, Sungrow inverter).

**Primary Goal**: Answer "where is my energy going right now?" in under 2
seconds, and increasingly "am I about to set a new monthly capacity peak?"
(Belgian capaciteitstarief).

### Corrected host framing (2026-07-29)

Every prior revision of this document described the production host as "a
Flutter mobile app WebView". That framing is **stale and wrong**, and is
corrected here everywhere it previously appeared (Overview, HC-002, ADR-006
context, risk R6):

- The production host is **Hestia**, the household PWA at
  `hestia.wimluyckx.dev` (`/home/wlc3xkl/Personal-Assistant-App`) — React 19 +
  TypeScript 5 + Vite 6 + Tailwind CSS v4, **seven runtime dependencies**
  (verified against its `package.json`: `react`, `react-dom`, `react-router`,
  `zustand`, `lucide-react`, `i18next`, `react-i18next`).
- Hestia's `src/pages/EnergyDashboard.tsx` **iframes `/embed/energy/`** — this
  repo's vanilla v1 dashboard — passing `p1_base=${origin}/api/energy` and
  `sungrow_base=${origin}/api/solar` as URL parameters.
- Hestia's Caddy reverse proxy (Hestia ADR-009) validates the user's JWT via
  forward-auth and **injects the P1/Sungrow Bearer tokens server-side** on
  `/api/energy/*` and `/api/solar/*`. No token ever reaches the browser.
- No Flutter app, no WebView bridge, and no `postMessage` token handshake
  exist anywhere in the production path.

### The 2026-07-29 reversal

The morning revision of this document (now `Architecture.md.backup-adopt-asis`)
adopted the Lovable-generated TanStack Start application **as-is** as this
repo's new frontend (its ADR-005). An independent assessment
(`docs/LOVABLE_INTEGRATION_ASSESSMENT.md`) then established, first-hand, that:

1. The Lovable project is ~2,300 lines of clean, presentational, prop-driven
   application code stapled to a vendor scaffold: 46 shadcn/ui components with
   **zero application imports**, ~44 of 52 runtime dependencies serving only
   that dead layer, an opaque `@lovable.dev` build package defaulting to an SSR
   server target, and latent editor telemetry hooks.
2. Hestia is the **same rendering substrate** (React 19 + Tailwind v4) as the
   Lovable output — the application layer is native material for Hestia, not
   design information to transcribe.

**Decision (adopted, not re-litigated): extract the Lovable application layer
into Hestia as a native `/energy` feature; discard the scaffold, the dependency
tree, and the Lovable build pipeline.** Recorded as ADR-010, which reverses
ADR-005.

| Superseded premise (morning revision) | Replacement | Recorded in |
|---|---|---|
| Repo re-bases on the Lovable TanStack Start project; lockfile = approved baseline; Bun adopted | Application layer extracted into Hestia; scaffold and dependency tree discarded; Lovable project kept read-only as design reference | ADR-010 |
| "Flutter WebView" host; postMessage token bridge (HC-002 Mode A) | Hestia PWA host; Caddy server-side token injection; bridge mode **deleted, not ported** | ADR-009 amendment, HC-002 rewrite |
| Migration plan M1–M8 (import Lovable output into this repo) | Extraction plan E1–E7 (port into Hestia; decommission this repo) | Extraction Plan |
| Charting = "whatever the Lovable output ships, bundled" | "No CDN" survives; **Recharts is kept** (decided 2026-07-30) — accepted as Hestia's one charting dependency, code-split behind the `/energy` chunk | ADR-007 amendments 1–2 |
| Bundle budgets on this repo's `vite build` | Budgets re-pointed at the Hestia build's `/energy` route chunk | HC-005 amendment |

What does **not** change, under any option: the two external APIs and their
contracts, the Sign Convention Reference, graceful degradation, dark-mode-only
(now scoped), poll cadences, and the FE_design.md token system. All restated in
this document.

---

## What This Repository Is Now (ADR-011)

The most important structural fact, previously unaddressed: **this repository
is a donor and a transitional host, not the future home of the product.**

Three roles, in order of expiry:

1. **Live host of the v1 dashboard (transitional).** The vanilla-JS dashboard
   in `src/` is what serves `/embed/energy/` inside Hestia **today**. It stays
   deployed and minimally maintained (see "Legacy Dashboard During Transition")
   until the native Hestia `/energy` route ships and is verified.
2. **Donor of reviewed material.** The extraction sources are: the Lovable
   project "Energy Watch" (read-only, over MCP), the three staged seam files in
   `lovable/src/` (already annotated with sign conventions, the R1 warning, and
   port notes), the design corpus (`docs/FE_design.md`,
   `docs/REDESIGN_BRIEF.md`, `docs/LOVABLE_INTEGRATION_ASSESSMENT.md`), the
   Jest domain tests and fixtures in `tests/`, and this document's contract and
   sign-convention knowledge.
3. **Archive.** After cutover, the repo is archived read-only. Git history is
   the record; nothing is deleted before its knowledge has been transferred
   (extraction step E5 makes the Sign Convention Reference and API contracts
   part of Hestia's documentation — they must not die with this repo).

The energy **product** lives on in Hestia's repo under Hestia's governance,
gates, and toolchain. This repo does not become a shared library or npm
package: a two-repo source of truth for ~2,300 lines is coordination overhead
with no consumer besides Hestia (rationale in ADR-011).

### Fate of the existing artifacts

| Artifact | During transition | End state |
|---|---|---|
| `src/` (9 vanilla modules), `index.html` | **Live in production.** Frozen except the maintenance lane defined in ADR-012 | Retired with the standalone deployment; archived in git |
| `tests/` (Jest suites + fixtures) | Kept green; the ADR-012 fixes extend them with pinning tests | Assertions and fixtures ported into Hestia's Vitest suite (E5), then archived |
| `scripts/build.js` | Unchanged — still produces `dist/dashboard.html` (< 200 KB) for the live embed | Retired at decommission |
| `Dockerfile` / `nginx.conf` / `docker-compose.yml` / `deploy.sh` | Unchanged — the live deployment path | Container stopped, Caddy `/embed/energy/*` route removed, files archived (E6) |
| `lovable/src/` (3 staged seam files) | Extraction input — the annotated reference copies of `types/energy.ts`, `useEnergyData.tsx`, `energy-format.ts` | Superseded by their ported Hestia counterparts; archived |
| `docs/` | Governance record; FE_design.md remains the binding token spec for the port | Key content transferred to Hestia docs (E5); archived |
| Lovable project "Energy Watch" | Read-only design reference | Remains available; never re-adopted as scaffold |

---

## System Context — Hestia Integration

Facts verified directly against `/home/wlc3xkl/Personal-Assistant-App`
(its `Architecture.md`, `package.json`, `src/pages/EnergyDashboard.tsx`,
Caddy configuration):

| Aspect | Hestia reality | Consequence for this architecture |
|---|---|---|
| Stack | React 19, TypeScript 5, Vite 6, Tailwind CSS v4 (CSS-first `@theme` in `src/index.css`; `tailwind.config.js` intentionally empty), Zustand, react-router 7, react-i18next, lucide-react | Lovable components port near-verbatim; Tailwind v4 `@utility` blocks paste directly |
| Runtime dependencies | **7** (listed in Overview) | Hestia's "Dependencies NOT in Tech Stack (Forbidden Without ADR)" rule governs every addition the port needs |
| Form | PWA (manifest, service worker), static Vite build served by Caddy | ADR-006's substance (no server runtime) is already Hestia's reality |
| Energy today | `/energy`-equivalent page iframes `/embed/energy/` (this repo's v1) with same-origin `p1_base`/`sungrow_base` | Cutover = replace the iframe with native components; the deployment slot already exists |
| Auth | Caddy forward-auth validates JWT; proxies `/api/energy/*` → P1 backend and `/api/solar/*` → Sungrow backend with `header_up Authorization "Bearer {env.*_TOKEN}"` | "No tokens leave the server." The client-side credential machinery in this repo is dead weight — deleted, not ported |
| Charts | No chart library; hand-rolled SVG (`SpendingBarChart.tsx`) | **Recharts is added** for the energy feature (ADR-007, 2026-07-30), code-split behind `/energy`; `SpendingBarChart` stays hand-rolled |
| Theme | Light theme (white cards, slate background) | The energy feature is a deliberate scoped **dark island** — HC-004 amendment |
| i18n | Hestia HC-004: hardcoded UI strings require an extraction path (react-i18next) | The ~40 hardcoded English strings in the Lovable components (incl. the Belgian-tariff explainer) get i18n extraction at port time |

### Data path

```
TODAY (transitional)                          AFTER CUTOVER (target)

Hestia PWA (hestia.wimluyckx.dev)             Hestia PWA
  EnergyDashboard.tsx                           /energy route (native React)
    └─ <iframe /embed/energy/?p1_base=…>          └─ useEnergyData() data layer
         └─ this repo's v1 dashboard                   └─ fetch /api/energy/*, /api/solar/*
              └─ fetch p1_base/sungrow_base                (same-origin, session cookie)
                  (same-origin, credentials:include)
                        │                                     │
                        ▼                                     ▼
              Caddy: validate JWT (forward-auth),   Caddy: same — unchanged
              inject Bearer tokens server-side,
              proxy → P1 API / Sungrow API
```

In both states the browser never holds an API token, never learns a backend
hostname, and never crosses origins. The native route additionally removes the
iframe boundary, the URL-parameter config surface, and the per-frame document
overhead.

---

## Tech Stack

Two scopes now exist. This repo owns only the first.

### Scope A — legacy live dashboard (this repo, transitional)

| Component | Technology | Notes |
|---|---|---|
| Application | Vanilla JavaScript (IIFE modules), single inlined HTML | Unchanged since v1; **frozen** except ADR-012 maintenance lane |
| Charting | Chart.js via CDN (`cdn.jsdelivr.net`) | Known weaknesses (no SRI, dead offline) accepted until decommission — ADR-002 history |
| Build | `node scripts/build.js` → `dist/dashboard.html` (< 200 KB) | Unchanged |
| Testing | Jest 29 + jsdom (265 tests) | Kept green; extended only by ADR-012 pinning tests |
| Lint / format | ESLint 8, Prettier 3 (`npx eslint src/`, `npx prettier --check .`) | Unchanged |
| Serving | nginx:alpine in Docker, behind Caddy, `edge` network | Unchanged |

No runtime npm dependencies. Bun, Vite, TanStack, Tailwind, and shadcn/ui are
**not** part of this repo's stack — the morning revision's adoption of them is
reversed (ADR-010) and none of it was ever installed here.

### Scope B — extraction target (Hestia's repo, referenced not owned)

The ported energy feature runs on Hestia's existing toolchain — React 19,
Vite 6, Tailwind 4, Vitest 3, ESLint 9, Prettier 3, npm. Hestia's
`Architecture.md` is authoritative for that stack; this document only records
what the energy feature is allowed to add:

| Candidate addition | Status |
|---|---|
| `recharts` (+ its d3 transitive set) | **APPROVED 2026-07-30** — ADR-007 amendment 2. The one charting dependency, bundled never CDN, code-split behind the `/energy` route chunk. Hestia's E1(b) ADR records it locally; no second chart library |
| `clsx` + `tailwind-merge` (for the Lovable `cn()` helper) | Optional; usage in the energy components is simple concatenation — a ~10-line local helper is the zero-dependency alternative. Hestia ADR note either way |
| Fonts: DM Sans + JetBrains Mono, **self-hosted woff2 subsets** (~60–120 KB, estimate) | Required if the FE_design typography is kept; Google Fonts CDN links are never ported (assessment R-A5) |
| Everything else from the Lovable dependency tree | **Forbidden.** No TanStack packages, no shadcn/ui, no Radix, no Bun, no `@lovable.dev` build config, no telemetry/error-capture files, no `robots.txt` |

---

## Extraction Inventory

Per the assessment (§3, verified file-by-file). Approximate line counts are
from that review.

### Pure design information — portable at ~zero cost

| Asset | Source | Notes |
|---|---|---|
| Color token system | Lovable `src/styles.css` `:root` | Verified **hex-identical** to `docs/FE_design.md`. The shadcn compatibility mapping in the same file is deleted at port |
| Tailwind v4 `@utility` blocks: `num` (tabular mono), `label-caps`, `card-surface`, `card-hover`, `dimmed-stale`, `shimmer` | `styles.css` | Paste into a scoped stylesheet — Hestia is Tailwind v4 |
| Motion vocabulary: `shimmer-sweep` 1.6 s, `flow-dash` 3 s, `warn-pulse` 2.4 s, `solar-glow` 4 s, `rise-in` 400 ms cubic-bezier(0.22,1,0.36,1), battery fill 700 ms, direction-flip flash 300 ms, counter 400 ms ease-out, global `prefers-reduced-motion` collapse | `styles.css` + components | The interaction spec v1 never delivered, as ~80 lines of CSS + timings |
| Power-flow geometry: 340×286 viewBox, node coordinates, stroke `width = 1.5 + min(1, |W|/3500)·4.5`, `opacity = 0.35 + mag·0.6`, 40 W active threshold, dashed-hint idle | `PowerFlow.tsx` | The "gauge settling" feel is these numbers |
| Capacity-peak screen concept: 2.5 kW Belgian reference gauge (marker at 62.5% of a 4.0 kW scale), `--success`→`--warning`→`--danger` escalation at 75%/100% of reference, live-headroom sentence, per-day peaks chart with the bill-setting bar in coral, plain-language tariff explainer | `peak.tsx` | Highest-value new screen |
| Grid-detail concept: Live/Day/Month/Year tabs, import-above/export-below mirroring, deliberate off-palette import `#8B7BF0` / export `#00C9A7` | `grid.tsx` | Day/Month/Year **blocked by R1** regardless of stack |
| Screen anatomy: status bar with quick-glance SoC + solar, per-section stale badges, offline banner with last-known framing, energy-balance stacked bar + tap-to-reveal kWh + self-consumption/sufficiency pills, monthly paired bars (green net-export days, today emphasized), cost-stub treatment | routes + components | All three mandated degradation states designed |

### Portable code — copy with at most import swaps (~13 files)

All verified to import nothing beyond React, `cn()`, the types, and the format
lib — no router, no chart library, no shadcn:

| File | ~Lines | Port cost |
|---|---|---|
| `AnimatedNumber.tsx` (+ `ValueUnit`, `usePrefersReducedMotion`) | 120 | Copy — rAF counter, cubic ease-out, reduced-motion collapse |
| `PowerFlow.tsx` | 250 | Copy — pure SVG/CSS (ADR-008 realized) |
| `primitives.tsx` (Card, SectionHeading, StaleBadge, HistoricalBadge, SectionState, Shimmer, Pill) | 130 | Copy |
| `StatusBar.tsx` + `OfflineBanner` | 100 | Copy |
| `Skeletons.tsx` | 80 | Copy |
| `EnergyBalanceCard.tsx` | 90 | Copy — flexbox bar, no chart lib |
| `CostStub.tsx` | 35 | Copy |
| `KpiStrip.tsx` | 170 | Copy; swap 2 TanStack `<Link>` → react-router `<Link>` |
| `types/energy.ts` | 120 | Copy — staged in `lovable/src/`, already annotated with sign conventions and the R1 `GridBucket` warning |
| `lib/energy-format.ts` | 50 | Copy — staged in `lovable/src/`; fix `CHART_COLORS` literal-hex violations at port (see Design System) |
| `lib/mock-energy.ts` | 280 | Copy — deterministic, pure TS; remains the HC-003 fallback behind `?mock=true` |
| `hooks/useEnergyData.tsx` | 100 | Copy the **shape**; replace the mock transport with the live client. Staged copy carries the PORT NOTE: add visibility gating + real backoff |
| `lib/utils.ts` (`cn`) | 4 | Local helper or `clsx`+`tailwind-merge` per Hestia ADR note |

### Welded to Recharts / TanStack — the real porting cost

| Asset | Welded to | Cost |
|---|---|---|
| `PowerTimeline.tsx` (~200), `MonthlyOverview.tsx` (~110), charts in `grid.tsx` (~150 of 250), `peak.tsx` chart (~60 of 230) | Recharts (Area/Bar/Composed, dual axis, sign-stacked bars, custom tooltips) | **Resolved 2026-07-30 — Recharts is kept (ADR-007, Option A)**: near copy-paste, ~1 day, `recharts` accepted as a Hestia dependency and code-split behind the `/energy` chunk. The rejected Option B (rewrite in Hestia's hand-rolled SVG idiom) was 3–5 days, hardest at the timeline's multi-series crosshair tooltip and the dual SoC axis |
| Route shells (`createFileRoute`, head/meta, `Link`) | TanStack Router | Mechanical: ~10 import/JSX swaps to react-router routes in Hestia's `App.tsx`. Per-route SEO/OG meta blocks are pointless in an authenticated PWA — delete |

### Discard in its entirety (~70% of the Lovable codebase)

46 shadcn/ui components (zero application imports), 26 `@radix-ui/*` packages
and the rest of the ~44 dead runtime dependencies, `server.ts` / `start.ts`
(SSR + CSRF middleware for server functions that don't exist),
`router.tsx` / `routeTree.gen.ts`, `error-capture.ts`,
`lovable-error-reporting.ts` (latent editor telemetry hooks — no active
exfiltration, but unowned plumbing), the vendor `vite.config.ts` /
`bunfig.toml` / `bun.lock`, `components.json`, `.lovable/`, `robots.txt`,
Google Fonts `<link>` tags, TanStack Query (vestigial — a QueryClient is
created and never used).

---

## Extraction Plan (replaces M1–M8)

Work items E2–E6 execute **in the Hestia repo under Hestia's governance**;
this repo's Governor tracks them because decommissioning here is gated on them.
E7 and the ADR-012 maintenance lane execute here.

The story-level breakdown of everything below — 29 stories across the three
lanes, with acceptance criteria, allowed scope, the blocked register, and the
open Governor decisions — is `docs/REWORK_BACKLOG.md`. This table is the plan;
that file is the work queue.

| Step | Work | Exit criterion |
|------|------|----------------|
| E1 | **Hestia ADRs**: (a) accept the energy feature as a native route (scope, dark-island theming, dependency additions); (b) record the **Recharts acceptance decided here in ADR-007 (2026-07-30)** in Hestia's own dependency ADR — the option question is closed; what E1(b) owes is the local record plus the code-split and d3-transitive-audit commitments | Both ADRs recorded in Hestia's `Architecture.md` |
| E2 | Port the design layer: `styles.css` tokens + utilities **scoped under an `.energy` wrapper** (dark island must not leak into light-themed Hestia), the ~13 portable files, router-link swaps; delete the shadcn variable mapping; i18n-extract the ~40 hardcoded strings (Hestia HC-004) | `/energy` renders all screens from `mock-energy.ts`; Hestia lint/format/typecheck green |
| E3 | Build the live data layer once, in Hestia: same-origin fetch client (`/api/energy/*`, `/api/solar/*`, session cookie), response schema validation, 5 s / 60 s / 5 min cadence, **visibility-gated polling**, **per-source exponential backoff**, cache-on-failure with staleness metadata; keep `mock-energy.ts` behind `?mock=true` as the HC-003 fallback of last resort | Live data on all main-route sections; degradation states reachable by killing the network |
| E4 | Chart views: **port the four Recharts-welded views** (ADR-007, Option A) with `recharts` added to Hestia and code-split behind the route chunk; `CHART_COLORS` hex literals replaced by FE_design tokens | Timeline, monthly, grid-live, capacity charts live; first real bundle measurement taken and budgets pinned (HC-005) |
| E5 | Test + knowledge transfer: port the pure-logic assertions (sign-convention pins including the solar→grid invariant, balance edges, formatting, config/backoff schedules) into Hestia's Vitest suite; transfer the **Sign Convention Reference and API endpoint contracts** into Hestia's documentation verbatim in substance | Hestia suite covers the ported domain logic; sign conventions documented in Hestia independent of this repo |
| E6 | Cutover and decommission: replace the iframe in `EnergyDashboard.tsx` with the native route; verify live flows, degradation states, and capacity screen; remove the `/embed/energy/*` Caddy route; stop the `energy-dashboard` container; archive this repo | Native `/energy` verified in production; standalone deployment gone; repo archived read-only |
| E7 | **R1 capture** (this repo / API side, any time): capture the real P1 `/v1/series` bucket contract from the live API (and re-verify the Sungrow series bucket field names in the same exercise), record it in this document and in Hestia's copy | Grid Day/Month/Year unblocked; `GridBucket` invention replaced by the captured shape |

Cost calibration (assessment §6, **estimates, not measurements**): with Recharts
kept (ADR-007), E2 ≈ 2–4 days and E4's chart port ≈ 1 day; E3 ≈ 2–3 days; plus
i18n extraction and ADR paperwork — roughly 1–1.5 focused weeks end to end. Every
"blocked by R1" feature ships only after E7, regardless of other progress.

---

## Legacy Dashboard During Transition (ADR-012)

The v1 dashboard stays live until E6. It carries three known defects, all
rooted in the same class of error — reading fields the Sign Convention
Reference or HC-006 forbids:

| # | Defect | Location | Effect in production |
|---|---|---|---|
| D1 | `computeFlows` derives solar→grid from Sungrow `export_power_w`, which is **always 0 on this firmware** | `src/power-flow.js:546` | The solar→grid flow line never renders; the hero diagram silently hides all export activity |
| D2 | Energy balance derives both export and import from `bucket.avg_export_power_w` — the same dead field | `src/energy-balance.js:37–41` | Export and import totals read 0.0 kWh; **self-consumption and self-sufficiency are pinned at 100%** — confidently wrong numbers on a money-relevant card |
| D3 | P1 card reads invented series fields `energy_import_kwh` / `avg_power_w` from P1 buckets (the R1 contract was guessed) | `src/p1-card.js:350–365` | Day/Month/Year tabs render NaN bars |
| D4 | Timeline chart's grid series reads `bucket.avg_export_power_w` — the series average of the always-0 field | `src/charts.js:70` | The timeline's grid line is flat 0 in production; grid activity silently hidden (D1's failure mode). **Recorded 2026-07-30 while drafting RW-M02; disposition decided 2026-07-30 after RW-M03 proved the derivation** — ADR-012 amended to add maintenance item 5: fix in place (RW-M06) by plotting the negated conservation identity, `(avg_pv_power_w − avg_load_power_w − avg_battery_power_w)/1000`, preserving the chart's export-positive orientation. The identity is test-precedented (RW-M03: five mutants killed, cross-module direction check executed) and the pinning tests transfer. The Hestia timeline is unaffected: its grid series is already governed by R13/F1 |

**Decision: D1 and D2 are fixed in place now; D3 is gated honestly, not
fixed.** Rationale (full text in ADR-012):

- The transition end date is an estimate. A dashboard whose stated principles
  are "flow direction is sacred" and "honest about data" (Design Principles
  below) must not spend an open-ended period displaying fabricated 100%
  self-sufficiency to a user who opens it 5–10× a day.
- The D1/D2 fixes are small, pure-function changes (derive export from **P1
  `power_w < 0`**, never Sungrow `export_power_w`), and the pinning tests they
  require are **deliverables of extraction step E5 anyway** — writing them now
  against the legacy modules is double duty, not throwaway work.
- D3 cannot be fixed without violating HC-006: the real P1 series contract is
  unknown (R1), and guessing it is what shipped the bug. The honest in-place
  remedy is to replace the NaN rendering with an explicit "data unavailable"
  state on those tabs until E7 closes R1. No field names are invented.

### Maintenance lane (the only permitted changes to `src/`)

1. **D1 fix**: `computeFlows` solar→grid from P1 `power_w < 0` magnitude;
   pinned by the invariant *"with P1 `power_w = -2000` and Sungrow
   `export_power_w = 0`, solar→grid flow is non-zero"*.
2. **D2 fix**: `computeBalance` export/import derived from P1-consistent data,
   not `avg_export_power_w`; pinned by tests asserting self-consumption /
   self-sufficiency < 100% on a fixture with real export.
3. **D3 gate**: Day/Month/Year tabs render a defined unavailable state (HC-003
   styling), never NaN. Removed only when R1 closes.
4a. **D4 fix (added by ADR-012 amendment, 2026-07-30)**: the timeline chart's
   grid series derives from the negated conservation identity instead of the
   dead `avg_export_power_w` (RW-M06). Amendment rationale: D4 is D1's failure
   mode (silently hidden grid activity) in a surface the original defect table
   missed; the fix reuses a derivation that is now proven, test-pinned, and
   cross-module-verified, so the marginal risk of touching the frozen file is
   below the truthfulness cost of leaving the grid line flat at 0 for the
   remaining transition period.
4. **Hardening rider** (approved, may ride along): delete the dead
   `postMessage` bridge listener and URL-token fallback from `config.js`
   (closing R6 in the live artifact by removal), and replace the
   `https://`-prefix base-URL check with a **same-origin host requirement** —
   which is the only usage production has ever had (closing R3). CSP
   `connect-src` remains the backstop, not the defense.

Everything else in `src/` is frozen. Explicitly **accepted until retirement**:
the forever-5s polling with no visibility gating and no failure backoff. These
are efficiency defects, not truthfulness defects — they cost battery, not
trust — and they are fixed properly and permanently by the Hestia data layer
(E3). Fixing them twice buys nothing.

All maintenance-lane work follows the normal CLAUDE.md pipeline (Story
Contract → Spec Author tests RED → Builder GREEN → Verifier), using this
repo's actual toolchain (npm / Jest / ESLint — see Open Questions on the
CLAUDE.md gate-command amendment).

---

## Key Screens (target feature, unchanged in substance)

The screen inventory is unchanged from the redesign brief and the morning
revision; it now describes the native Hestia `/energy` feature. Every screen
component is presentational and prop-driven; no component fetches its own data.

### `/energy` — main dashboard

| # | Section | Data dependency | Cadence |
|---|---------|----------------|---------|
| 1 | Status bar (sticky): Live/Delayed/Offline dot, last-update time, quick battery % / solar kW | staleness state from data layer | derived |
| 2 | **Power flow diagram (hero)**: Solar/Battery/Home/Grid nodes, animated lines, battery SoC fill, solar glow by production | P1 realtime + Sungrow realtime → `computeFlows` | 5 s |
| 3 | KPI strip (4 cards): Grid (signed, coral/green accent), Battery (SoC + bar, warning pulse < 20%), Solar today, Month peak (entry to capacity view) | realtime pair + P1 capacity month | 5 s; capacity on load + month rollover |
| 4 | Energy balance (today): stacked source bar, self-consumption / self-sufficiency, summary line | Sungrow series day → `computeBalance` | 60 s |
| 5 | Power timeline (24 h): solar/grid/battery areas around zero, home load overlay, battery SoC curve on secondary axis | Sungrow series day | 5 min |
| 6 | Monthly overview: paired daily bars, net-export days green, today highlighted | Sungrow series month | on load |
| 7 | Cost tracking stub: intentional "coming soon" card | none | — |

### Grid detail

Large signed readout; live area chart of the last ~5 minutes (client-side ring
buffer over 5 s realtime samples — no API exists for sub-minute history);
Live/Day/Month/Year tabs. **Day/Month/Year remain blocked by R1** — do not
build them against the invented `GridBucket` shape.

### Capacity peak

Belgian capacity tariff bills on the highest 15-minute average import of the
month. Data: P1 `/v1/capacity/month/{YYYY-MM}` plus P1 realtime. Current
monthly peak with timestamp; threshold gauge against the 2.5 kW Belgian
residential reference with `--success` → `--warning` → `--danger` escalation;
live headroom from a client-side 15-minute rolling average of `import_power_w`
(an approximation of the meter's quarter-hour alignment — label it
indicative); `peaks[]` chart across the month; plain-language cost explainer.

### Mandated states (HC-003 — not edge cases)

- **Skeleton loading**: shimmer placeholders matching each component's layout.
- **Stale section**: per-section `--warning`-tinted badge ("Data from 45s
  ago"), content visible but dimmed. The staged `useEnergyData` reference uses
  stale ≥ 12 s / offline ≥ 40 s since last success; final thresholds are pinned
  at E3 with tests.
- **Offline**: top banner; last-known values retained and visibly historical.

### Design Principles (carried forward)

- **DP-001 Numbers First** — the key number is the largest element.
- **DP-002 Honest About Data Freshness** — never a number without source and age.
- **DP-003 Flow Direction is Sacred** — wrong direction is worse than no data.
- **DP-004 Glanceable** — flow, SoC, and solar visible without scrolling on mobile.

Direction remains **"Calm Control Room"** (FE_design.md). Numbers count to new
values over ~400 ms ease-out — they never snap.

---

## API Integration

Two external REST APIs; we own no backend. All communication over HTTPS. In
production both are reached exclusively through Hestia's Caddy proxy
(`/api/energy/*`, `/api/solar/*`) — the browser never sees a backend hostname.

### P1 API (grid meter) — authoritative for grid direction

| Endpoint | Returns | Used by |
|----------|---------|---------|
| `GET /v1/realtime?device_id=` | `power_w` (signed), `import_power_w`, `energy_import_kwh`, `energy_export_kwh`, `ts` | flow diagram, Grid KPI, grid live tab, capacity headroom |
| `GET /v1/series?device_id=&frame=` | frame `day` = hourly, `month` = daily, `year` = monthly buckets — **bucket field names never captured, see R1** | Grid detail Day/Month/Year (**blocked**) |
| `GET /v1/capacity/month/{YYYY-MM}?device_id=` | `monthly_peak_w`, `monthly_peak_ts`, `peaks[]: {ts, avg_power_w}` | Month-peak KPI, capacity screen |
| `GET /health` | `{status: "ok"}`, no auth | status bar |

### Sungrow API (solar + battery)

| Endpoint | Returns | Used by |
|----------|---------|---------|
| `GET /v1/realtime?device_id=` | `pv_power_w`, `pv_daily_kwh`, `battery_power_w`, `battery_soc_pct`, `battery_temp_c`, `load_power_w`, `export_power_w` (**dead — always 0, never read**) | flow diagram, Battery/Solar KPIs |
| `GET /v1/series?device_id=&frame=` | buckets `{bucket, avg_pv_power_w, max_pv_power_w, avg_battery_power_w, avg_battery_soc_pct, avg_load_power_w, …}` | energy balance, timeline (incl. SoC curve), monthly overview |
| `GET /health` | `{status: "ok"}`, no auth | status bar |

Series frames on both APIs: `day` = hourly buckets, `month` = daily, `year` =
monthly.

### Contract discipline

**Guessing an API contract is forbidden** (HC-006; CLAUDE.md escalation reason
`api_contract_unknown`). This is not theoretical: the shipped `p1-card.js`
reads `energy_import_kwh` / `avg_power_w` from P1 series buckets — fields that
were never documented and do not exist — and every bar in that view renders
NaN (defect D3). The Lovable mock repeated the pattern: its `GridBucket
{bucket, import_kwh, export_kwh}` is an invention, flagged with an UNVERIFIED
CONTRACT warning in `lovable/src/types/energy.ts`. The P1 series bucket
contract must be **captured from the live API and recorded** (here and in
Hestia's copy) before any P1-series feature is built, in any codebase (E7 /
R1). The assessment additionally verified that the mock's P1 realtime,
capacity `peaks[]`, and Sungrow shapes match the contracts above exactly.

---

## Authentication & Configuration

### One mode: same-origin proxy (Caddy token injection)

The WebView-bridge token mode (postMessage bootstrap, `'null'`-origin
acceptance, URL-token fallback with `history.replaceState` scrubbing) is
**deleted from the architecture as of 2026-07-29** (ADR-009 amendment). It was
designed for a Flutter host that does not exist in the production path, and
removing it closes two open risks (R3's prefix-only validation surface, R6's
bridge re-verification) by removal rather than by audit.

The production credential path, both today (iframe) and after cutover
(native):

1. The user authenticates to Hestia (JWT in an httpOnly cookie).
2. Energy requests go to same-origin paths — `/api/energy/*`, `/api/solar/*`.
3. Caddy validates the JWT via forward-auth, strips the prefix, and proxies to
   the backend **injecting `Authorization: Bearer <token>` server-side** from
   its environment.
4. The frontend never sees, stores, parses, or forwards an API token, in any
   mode, ever (HC-002).

### Configuration surface

| State | Config | Delivery |
|---|---|---|
| Legacy iframe (today) | `p1_base` / `sungrow_base` (same-origin proxied paths), `p1_device_id` / `sungrow_device_id`, `mock` | URL parameters set by Hestia's `EnergyDashboard.tsx`. Base URLs must resolve **same-origin** (maintenance-lane hardening #4); `https://`-prefix checking alone is a recorded weakness (R3) |
| Native route (target) | API paths hardcoded as same-origin constants; device IDs via Hestia's `VITE_*` env; `?mock=true` flag | No base-URL parameter exists at all — the allowlist question collapses to "same-origin only" |

### Input validation (hard rules, both states)

| Input | Validation |
|-------|-----------|
| API JSON responses | Schema guards (types, null-safety, range sanity) before data enters state; malformed responses count as fetch failures (feed the backoff/staleness path, never the UI) |
| URL parameters | Known-name allowlist; type/format checks; base URLs same-origin (legacy only); unknown params ignored |
| Timer callbacks | Stale-data detection; errors contained per source; never crash the UI |
| Rendered values | React's default escaping; no `dangerouslySetInnerHTML` for data-derived content (verified: none exists in the Lovable application layer) |

---

## State Management & Polling

Normative for the Hestia data layer (E3), wherever it is implemented. The
staged `lovable/src/hooks/useEnergyData.tsx` documents the intended shape and
carries the PORT NOTE for the two missing behaviors.

### Poll cadence (unchanged, binding)

| Data | Interval |
|------|----------|
| Realtime (P1 + Sungrow, parallel) | 5 s |
| Energy balance (Sungrow series day) | 60 s |
| Timeline (Sungrow series day) | 5 min |
| Monthly overview (Sungrow series month) | on load |
| Capacity month | on load + month rollover |

### Visibility-gated polling (required — fixes a live defect)

The legacy app polls forever, including while backgrounded. The data layer
**must** subscribe to `document.visibilitychange`: on hidden, all polling
pauses; on visible, an immediate refresh of every feed fires and intervals
restart. A backgrounded PWA tab must produce zero energy-poll network
activity.

### Failure backoff (required — fixes a live defect)

Per-source exponential backoff on consecutive failures: 5 s → 10 s → 20 s →
40 s, capped at 60 s; any success resets to base cadence. Staleness badges and
the offline banner (both sources failing) reflect state per HC-003. Fetch
timeout 30 s via `AbortController`.

### Caching

Last-known values per feed retained in memory with last-success timestamps;
failures serve the cached value flagged stale (HC-003). No persistent storage.

Time-dependent logic takes an injectable clock — never `Date.now()` inline in
business logic — so cadence, backoff, and staleness are unit-testable with
fake timers (E5).

---

## Design System

`docs/FE_design.md` remains the authoritative token source. The Lovable
`styles.css` `:root` block was verified **hex-for-hex identical** to it — the
design survived generation intact, so the port carries tokens, not
approximations.

- **Scoped dark island**: the energy feature's tokens and dark surfaces live
  under an `.energy` wrapper (or equivalent scoping mechanism) inside
  light-themed Hestia. One palette, no `.dark` class switching, no theme
  toggle (HC-004 as amended). The dark island must not leak styles outward,
  and Hestia's light chrome must not bleed in.
- **Tokens, never literal hex**: components reference CSS custom properties
  (`--solar`, `--grid-import`, `--bg-surface`, …). Known violations to fix at
  port time (assessment R-A8): the `CHART_COLORS` map in `energy-format.ts`,
  chart-internal literals (`#4A5568`, `#1E2A3A`, `#33465e`), and `grid.tsx`'s
  `IMPORT`/`EXPORT` constants — either promote the two grid-detail colors
  (`#8B7BF0` / `#00C9A7`) to named tokens in FE_design.md or bind them to
  existing ones; a deliberate design choice still gets a token name.
- **Typography**: JetBrains Mono (data, `font-variant-numeric: tabular-nums`
  so digits hold width while counters animate) and DM Sans (labels/body),
  **self-hosted** — the Google Fonts CDN links are never ported. Type scale
  and units-smaller-than-numbers per FE_design.md.
- **Spacing**: 8 px grid (4, 8, 12, 16, 24, 32, 48, 64).
- **Motion**: the vocabulary in the Extraction Inventory, everything collapsing
  under `prefers-reduced-motion`.
- **Accessibility**: WCAG AA contrast, 44×44 px touch targets, visible focus
  rings (`--border-focus`), aria-labels on chart data.

FE_design conformance review (CLAUDE.md §2.3 DESIGN gate) applies to every
presentation change — in the maintenance lane here, and as the standard the
Governor holds the Hestia port to at E2/E4 review.

---

## Testing Strategy

### Legacy (this repo, until decommission)

The 265-test Jest + jsdom suite stays green and is extended only by the
ADR-012 pinning tests. Gates for maintenance-lane stories: `npx eslint src/`
(zero warnings), `npx prettier --check .`, `npx jest` (all pass),
`node scripts/build.js` (< 200 KB).

### Ported (Hestia's Vitest suite, at E5)

The pure-calculation tests encode hard-won domain knowledge — port the
assertions, not the files:

1. **Sign-convention pins**: `computeFlows` with negative `power_w` (export),
   negative `battery_power_w` (discharge), `export_power_w = 0` firmware quirk;
   the D1 invariant (*P1 `power_w = -2000` ⇒ non-zero solar→grid despite
   Sungrow `export_power_w = 0`*) must exist in both suites.
2. **Energy balance**: bucket summation, self-consumption / self-sufficiency
   derivation and clamping, zero-production and zero-consumption edges; the D2
   pin (< 100% on a fixture with real export).
3. **Data layer**: cadence schedule, visibility gating, backoff progression
   and reset, staleness thresholds — fake timers + injectable clock.
4. **Formatting**: W/kW thresholds and precision.
5. **Components** (RTL): skeleton/stale/offline states, sign-driven rendering
   (accent flips, direction).

Rules carried forward: no test touches real network or services; fixtures
mirror real captured API shapes (a fixture that drifts from this document is a
defect in one of the two — escalate, don't silently pick a side); a mock that
invents an unobserved shape is an `api_contract_unknown` escalation, not a
fixture. Coverage target: 80%+ on the ported domain logic.

---

## Build & Deployment

### Legacy pipeline (unchanged until E6)

```
node scripts/build.js  →  dist/dashboard.html   # CSS+JS inlined, 200 KB gate
Dockerfile             →  nginx:alpine + COPY dist/dashboard.html → index.html
deploy.sh              →  scp artifact + compose up on the VPS (edge network)
Caddy                  →  serves it same-origin under hestia.wimluyckx.dev/embed/energy/
                          (deploy.sh's status output still names the standalone
                          dashboard.energy.wimluyckx.dev hostname)
```

Known and accepted until decommission: the CSP allows
`script-src 'unsafe-inline' https://cdn.jsdelivr.net` (Chart.js CDN, no SRI);
`docker-compose.yml` pulls `ghcr.io/wluyckx/energy-dashboard:latest` while
`deploy.sh` runs `docker compose build` on the VPS — the provenance mismatch
(R8) is **resolved by decommission**, not by investment in a retiring
pipeline. Any maintenance-lane deploy uses the existing `deploy.sh` path under
the CLAUDE.md §2.5 Deployment Contract, with the Operator confirming which
path actually produced the running image.

### Target build (Hestia, at E2–E4)

The energy feature rides Hestia's existing `vite build` → static `dist/` →
Caddy pipeline. No new server runtime, no new deploy path (HC-005 as amended).
Requirements the port must meet:

- **Code-split** the energy route **and Recharts** behind the route chunk so the
  rest of the PWA pays nothing (ADR-007 condition, not a nice-to-have).
- **CSP**: `script-src 'self'` with no CDN — an upgrade over the legacy CSP.
  `style-src 'unsafe-inline'` (or `style-src-attr`) remains required: React
  inline `style` attributes are pervasive in the energy components and in
  Recharts (assessment R-A6, confirmed). Bounded weakness; post-port audit
  item.
- **Bundle budget**: uncalibrated until the first real build (the assessment's
  figures — Recharts + d3 ≈ 140 KB gz, app code + CSS ≈ 30 KB gz — are
  **estimates, not measurements**). At E4, measure, then pin the `/energy`
  route-chunk budget in Hestia's tooling. If the measured cost is
  disproportionate, the remedy is Recharts-side per the ADR-007 conditions
  (deeper splitting, narrower imports, one view hand-rolled) — the charting
  decision itself is not reopened.

---

## Hard Constraints

HC numbering is continuous across all revisions; retired numbers are not
reused.

### HC-001: Single-File Delivery — **RETIRED 2026-07-29**
Retired in the morning revision; still retired. The 200 KB inlined artifact
survives only as the legacy pipeline's build gate until decommission — it is a
pipeline fact, not a constraint on the product's future.

### HC-002: No Tokens in the Client — **REWRITTEN 2026-07-29**
**Constraint**: no API token, in any form, is ever present in the energy
frontend. Caddy injects Bearer tokens server-side; the client makes same-origin
requests carrying only the Hestia session cookie. Token-handling code —
postMessage bridges, URL-token fallbacks, scrubbing, token storage — is
**forbidden in the energy feature outright**; there is nothing to handle.
Where base-URL configuration exists at all (legacy iframe only), URLs must
resolve same-origin — an `https://` prefix check alone is a vulnerability.
**Forbidden**: tokens in code, bundles, URLs, storage, or logs; any client
request to a non-same-origin API host; porting any part of the bridge
machinery.
*(Previous text — WebView bridge + scrubbed URL fallback — assumed a Flutter
host that does not exist in the production path. See ADR-009 amendment.)*

### HC-003: Graceful Degradation — **UNCHANGED**
**Constraint**: never a blank screen. Every component has defined skeleton,
stale, and offline states; last-known values are cached and shown with
staleness indicators; deterministic mock data (`mock-energy.ts`, behind
`?mock=true`) is the fallback of last resort and ships in production; mock
mode always works without credentials.
**Forbidden**: blank screens, raw error strings, NaN or `undefined` rendered
as data (defect D3 is the standing example), unhandled exceptions crashing the
surface (error boundaries required), removing the mock module from the bundle.

### HC-004: Dark Mode Only — **SCOPE AMENDED 2026-07-29**
**Constraint**: the energy feature is dark-mode only — one token set, no
toggle, no `prefers-color-scheme` switching, no theme parameter. **New scope**:
this binds *within the energy feature*, which is a deliberately scoped dark
island inside the light-themed Hestia PWA. Tokens are scoped so neither theme
leaks into the other. HC-004 makes no claim about Hestia's own theme.

### HC-005: Static Artifact, No Server Runtime — **RE-POINTED 2026-07-29**
**Constraint**: the energy feature ships as static assets with no server
runtime of its own. Already true twice over: the legacy artifact is static
nginx-served HTML, and Hestia's Vite build is a static SPA behind Caddy. The
Lovable scaffold's SSR/Nitro server output is discarded with the scaffold
(assessment R-A3 closes by extraction). Bundle budgets now apply to the
**Hestia `/energy` route chunk**, pinned at E4 from the first real
measurement.
**Forbidden**: SSR/server functions for this feature, any deploy shape
requiring a JS runtime, runtime environment variables as a config channel for
the energy screens.

### HC-006: API Contracts Are Captured, Never Guessed — **REAFFIRMED 2026-07-29**
**Constraint**: no code may read an API field that is not documented in this
file's API Integration section (or `docs/project_idea.md` for register-level
legacy detail). An undocumented response shape blocks the story
(`api_contract_unknown`) until captured from the live API and recorded.
**Reaffirmed because the failure repeated**: the guessed P1-series fields
shipped NaN bars (D3), and the Lovable mock independently invented `GridBucket`
(R1). Sungrow `export_power_w` remains the standing example of a field that
exists but must never be read.

### Domain rules (bind every change, in either repo)

- Poll cadences exactly as specified (5 s / 60 s / 5 min); polling pauses when
  the document is hidden; failures back off.
- All API communication over HTTPS, same-origin from the client's perspective.
- Sign conventions per the Sign Convention Reference — non-waivable review
  gate for any story touching flow or balance logic.
- Colors by token, never literal hex; typography and spacing per FE_design.md;
  energy values with correct units and precision.
- Animations respect `prefers-reduced-motion`; touch targets ≥ 44×44 px;
  numeric transitions animate (~400 ms ease-out), never snap.

---

## Architecture Decision Records (ADRs)

### ADR-001: Vanilla JavaScript Over Framework — **SUPERSEDED**
Superseded by ADR-005, 2026-07-29 (originally approved 2026-02-15). The
manual-DOM approach under-delivered the interaction spec. Original text in
`Architecture.md.backup`. *(ADR-005 itself has since been reversed by ADR-010,
but not back to vanilla JS — the vanilla app survives only as the transitional
live artifact under ADR-011/012.)*

### ADR-002: Chart.js via CDN — **SUPERSEDED**
Superseded by ADR-007, 2026-07-29 (originally approved 2026-02-15). The
unpinned, SRI-less CDN dependency remains a known weakness of the legacy
artifact until decommission; it is not carried anywhere.

### ADR-003: SVG for Power Flow Diagram — **SUPERSEDED (substance restated)**
Superseded by ADR-008, 2026-07-29 (originally approved 2026-02-15). SVG was
correct and survives; the `createElementNS` mechanics do not.

### ADR-004: Dark Mode Only — **REAFFIRMED, SCOPE AMENDED**
Approved 2026-02-15; reaffirmed 2026-07-29 (morning); **scope amended
2026-07-29 (this revision)**: dark-only binds within the energy feature, which
becomes a scoped dark island inside the light-themed Hestia PWA. Enforced as
HC-004.

### ADR-005: Adopt the Lovable-Generated React Frontend As-Is — **REVERSED**
**Status**: Reversed by ADR-010, 2026-07-29 (approved earlier the same day)
The decision to re-base this repo on the Lovable TanStack Start project, adopt
its lockfile as the dependency baseline, and adopt Bun is reversed in full.
What the assessment showed: ~70% of the adopted codebase would have been dead
vendor material (46 unimported shadcn components, ~44 unused runtime
dependencies), the build pipeline a vendor black box with an SSR default
target, and the whole tree a recurring supply-chain audit surface inside a
security-sensitive household app — while the actually-valuable application
layer is directly portable to Hestia's identical rendering substrate. A
one-time porting tax beats a permanent trust tax. Original text in
`Architecture.md.backup-adopt-asis`.

### ADR-006: Static SPA Build — No Server Runtime in Production — **AMENDED**
**Status**: Approved 2026-07-29; amended 2026-07-29 (this revision)
**Amendment**: the substance — no server runtime for this feature — survives
and transfers to the Hestia context, where it is already reality (Hestia's
Vite build is a static SPA served by Caddy). The TanStack-specific SPA-flag
hunt ("exact `vite.config.ts` flag TBC") disappears with the scaffold; the
original context's "Flutter WebView" framing is corrected per the Overview.
Enforced as HC-005 (re-pointed).

### ADR-007: Bundled Charting Library (No CDN Resources of Any Kind) — **AMENDED TWICE**
**Status**: Approved 2026-07-29; amended 2026-07-29; **charting decided
2026-07-30**

**Amendment 1 (2026-07-29)**: "no CDN-loaded scripts, styles, or fonts anywhere
in the feature" survives unchanged and now binds the Hestia port (`script-src
'self'`, self-hosted fonts).

**Amendment 2 (2026-07-30) — Recharts is kept. Option A is adopted.** The
choice the morning revision deferred to Hestia's ADR log is settled here:
**`recharts` is accepted as a runtime dependency of Hestia's `/energy`
feature**, and the four Recharts-welded views (`PowerTimeline`,
`MonthlyOverview`, the `grid.tsx` charts, the `peak.tsx` chart) port
near-verbatim rather than being rewritten. Rationale: the assessment's lean, and
the ~1-day-versus-3–5-day gap buys nothing when the alternative rewrite's
hardest parts — the timeline's multi-series crosshair tooltip and the dual SoC
axis — are precisely the interactions the redesign exists to deliver. One heavy,
mainstream, code-splittable dependency is a smaller trust cost than
hand-maintaining chart interaction code.

**Conditions on the acceptance** (all binding, none optional):
- **Bundled, never CDN.** Recharts and its d3 subdependencies ship from the
  bundle. Amendment 1 is unaffected — there is no SRI-and-CDN escape hatch.
- **Code-split behind the `/energy` route chunk** so the rest of the Hestia PWA
  pays nothing for it (HC-005).
- **Hestia's dependency gate still applies**: Hestia's E1(b) ADR records the
  acceptance in its own log — this decision is the input to that record, not a
  bypass of it. Recharts arrives with its d3 transitive set; that tree is the
  one dependency-audit surface this feature adds, and it is owned, not inherited
  by accident.
- **No second chart dependency.** Recharts is the whole charting allowance;
  anything further is a normal dependency escalation.
- **Hardcoded-hex violations in the chart code are fixed at port time** (the
  `CHART_COLORS` literals become FE_design tokens) — unchanged from before, and
  independent of the option chosen.
- **Measurement still gates**: R9 stands. If the measured `/energy` chunk at E4
  is disproportionate, the remedy is Recharts-side (deeper code-splitting,
  narrower imports, dropping a view to hand-rolled SVG), not a re-litigation of
  this decision.

Hestia's existing `SpendingBarChart` stays hand-rolled; nothing about this
decision obliges the rest of that app to adopt Recharts.

### ADR-008: Power Flow Diagram as Inline SVG in React — **SURVIVES UNCHANGED**
**Status**: Approved 2026-07-29
`PowerFlow.tsx` is exactly this decision realized: pure inline SVG driven by
`computeFlows` output props, CSS dash animation, direction-flip flash,
`prefers-reduced-motion` guards, no dependencies beyond React. Flow math stays
in pure functions outside the components so DP-003 is enforced by unit tests,
not visual inspection.

### ADR-009: Dual Authentication Modes with Base-URL Allowlist — **AMENDED**
**Status**: Approved 2026-07-29; amended 2026-07-29 (this revision)
**Amendment**: dual modes are reduced to one. Mode A (WebView postMessage
bridge, `'null'`-origin acceptance, URL-token fallback + scrubbing) is
**deleted, not ported** — it served a Flutter host that does not exist in the
production path, and its removal closes R3 (prefix-only validation as a
token-leak vector) and R6 (bridge re-verification) by removal. Mode B —
same-origin proxy with server-side Caddy token injection — is the only mode,
and inside Hestia it is not a "mode" but the ambient architecture. The
base-URL allowlist requirement survives in collapsed form: same-origin only,
where base-URL configuration exists at all (legacy iframe); the native route
has no base-URL parameter. The legacy artifact's prefix-only check is fixed by
maintenance-lane item 4.

### ADR-010: Extract the Lovable Application Layer into Hestia — **NEW**
**Status**: Approved
**Date**: 2026-07-29
**Reverses**: ADR-005

**Context**: see "The 2026-07-29 reversal" (Overview) and
`docs/LOVABLE_INTEGRATION_ASSESSMENT.md` §§1–6 — the full evidence base:
extraction inventory (§3), risk ledger for as-is adoption (§4), verified
claims (§5), cost comparison and the strongest counter-argument (§6).

**Decision**: Port the Lovable application layer (design tokens, utilities,
motion vocabulary, ~13 presentational files, the data-hook shape, the mock
layer, the three screen concepts) into Hestia as a native `/energy` feature,
replacing the iframe embed. Discard the TanStack/shadcn/Radix scaffold, the
~44 dead runtime dependencies, the vendor build pipeline, the telemetry hooks,
and the Google Fonts links. The Lovable project remains a read-only design
reference; individual components may be round-tripped through a scratch
Lovable project later without re-adopting the scaffold.

**Consequences**:
- The extraction work (E1–E6) lands in the Hestia repo under Hestia's
  governance, dependency gate, i18n rule, and Vitest suite.
- The live data layer is built once, in Hestia (E3) — required under every
  option; the Lovable app never had one.
- The as-is risk ledger (assessment §4) closes structurally: dependency
  surface (R-A1), vendor build box (R-A2), SSR artifact (R-A3), telemetry
  (R-A4), fonts CDN (R-A5), second toolchain/Bun (R-A8) — all by discard.
  The two that persist are `style-src 'unsafe-inline'` (R-A6) and the Recharts
  bundle cost (R-A7) — now a **deliberately accepted** cost after the 2026-07-30
  charting decision, bounded by code-splitting and tracked as R9.
- The acknowledged cost: the live Lovable feedback loop is orphaned — future
  visual iteration becomes manual diff-and-port. Accepted; the design is
  captured in ~2,300 reviewed lines and this repo's documents.

### ADR-011: Repository Disposition — Donor, Transitional Host, then Archive — **NEW**
**Status**: Approved
**Date**: 2026-07-29

**Context**: with the product moving into Hestia, this repo needed an explicit
answer to "what is it now?" Three options: (a) become a long-lived source
repository for the design system and energy-domain logic that Hestia consumes;
(b) transitional donor, then archive; (c) host the standalone iframe build
indefinitely alongside the native route.

**Decision**: (b). The repo serves the live `/embed/energy/` build and the
extraction inputs until E6, then is archived read-only.

**Rationale**:
- Against (a): Hestia's governance consumes vetted code in its own tree, not
  unpublished cross-repo source; there is no second consumer to justify
  package infrastructure; a two-repo source of truth for ~2,300 lines is pure
  coordination overhead for a solo project. Durable knowledge (sign
  conventions, contracts) transfers as documentation (E5), not as a live
  dependency.
- Against (c): two live frontends for one household dashboard doubles the
  maintenance, audit, and deployment surface indefinitely — the exact
  recurring-cost trap ADR-010 exists to avoid. The iframe is a transitional
  artifact, not a product.

**Consequences**: the artifact-fate table in "What This Repository Is Now";
decommission checklist in E6; nothing is deleted before its knowledge is
transferred; git history is the permanent archive.

### ADR-012: Legacy Defect Remediation During Transition — **NEW**
**Status**: Approved
**Date**: 2026-07-29

**Context**: the live v1 dashboard carries defects D1–D3 (table in "Legacy
Dashboard During Transition"), all instances of reading fields the Sign
Convention Reference or HC-006 forbids. The transition to the native route has
an estimated, not guaranteed, end date.

**Decision**: fix D1 and D2 in place now; gate D3 behind an honest
unavailable state (no contract guessing — R1 stays blocking); take the
hardening rider (delete dead bridge code, same-origin base-URL check);
explicitly accept the polling inefficiencies (no visibility gating, no
backoff) until retirement.

**Rationale**: truthfulness defects are fixed immediately because the
dashboard's core promise (DP-002/DP-003) is violated every day they stand, and
their pinning tests are E5 deliverables anyway — the work is double-duty.
Efficiency defects are accepted because they cost battery, not trust, and are
fixed permanently by the Hestia data layer; fixing them twice buys nothing.
D3's only HC-006-compliant in-place remedy is honesty, not invention.

**Consequences**: a bounded maintenance lane (items 1–4) is the only permitted
change to `src/` until decommission; each item runs through the standard
CLAUDE.md pipeline with the SIGN CONVENTION gate; the D1/D2 invariants must
exist in both the Jest suite (now) and Hestia's Vitest suite (E5).

---

## Sign Convention Reference

The one table this project cannot afford to get wrong. Every field read by
flow or balance logic — in the legacy modules today, in Hestia's
`lib/energy` equivalents after the port — must match this table; the SIGN
CONVENTION review gate (CLAUDE.md §2.3) is mandatory and non-waivable for any
story touching flow or balance logic. At E5 this table is transferred verbatim
in substance into Hestia's documentation.

| Field | Positive means | Negative means | Notes |
|-------|---------------|----------------|-------|
| P1 `power_w` | Importing from grid | Exporting to grid | **Authoritative source for grid direction** |
| P1 `import_power_w` | Importing (always >= 0) | N/A | |
| Sungrow `battery_power_w` | Charging | Discharging | Source: register 5213 S16, scale=−1 (confirmed 2026-02-18) |
| Sungrow `battery_soc_pct` | N/A (0–100 %) | N/A | **Field name has `_pct` suffix.** Source: register 13022 U16 scale=0.1 (confirmed 2026-02-18). Leads GoSungrow cloud by ~15 min. |
| Sungrow `export_power_w` | Exporting to grid | Importing from grid | **Always 0 on this WiNet-S firmware — never read it.** Use P1 `power_w` for grid direction (confirmed 2026-02-18) |
| Sungrow `pv_power_w` | Producing (always >= 0) | N/A | AC output power (register 5016), not DC — confirmed 2026-02-18 |
| Sungrow `load_power_w` | Consuming (always >= 0) | N/A | House consumption. Source: register 13007 U16 (confirmed 2026-02-18) |

These conventions are also written into the doc comments of
`lovable/src/types/energy.ts` (the staged port source) so they travel with the
types into Hestia.

---

## Operational Assumptions

1. **Runtime**: modern browsers (Safari 16+, Chrome 90+) — Hestia's support
   envelope; the dashboard is used phone-first (360–414 px) with tablet and
   desktop as secondary.
2. **Storage**: none persistent for energy data — in-memory state, refreshed
   on load.
3. **Network**: all API access same-origin via Caddy on
   `hestia.wimluyckx.dev`; backends on the VPS `edge` Docker network.
4. **Serving (transitional)**: the `energy-dashboard` nginx container on the
   `edge` network behind Caddy; `/health` returns 200 for container health
   checks. Retired at E6.
5. **Auth boundary**: the dashboard itself has no auth UI, by design, and its
   static shell contains no secrets. The protected surface is the data: every
   `/api/energy/*` / `/api/solar/*` request is JWT-gated by Caddy forward-auth
   regardless of how the shell was reached.

---

## Open Risks

| Id | Risk | Status |
|----|------|--------|
| R1 | **P1 series bucket contract unknown — blocking.** No document defines P1 `/v1/series` bucket field names; guessing them shipped D3, and the Lovable mock re-invented them (`GridBucket`). Capture from the live API (E7), record here and in Hestia, **before** any P1-series feature in any codebase. While capturing, re-verify the Sungrow series bucket field names too (no history of invention there, but the exercise is cheap) | **Open, blocking** Grid Day/Month/Year |
| R3 | Legacy base-URL validation is prefix-only (`config.js`) | Fix scheduled: maintenance-lane item 4 (same-origin requirement). CSP `connect-src` is the current backstop. Closed structurally for the native route (no base-URL parameter exists) |
| R5 | `style-src 'unsafe-inline'` required by React/Recharts inline styles — persists after extraction | Open, bounded (no injection vector identified; no `dangerouslySetInnerHTML` in the app layer). Post-port audit item in Hestia (`style-src-attr` tightening) |
| R7 | Legacy `computeFlows` reads dead `export_power_w` (D1) | Fix scheduled: maintenance-lane item 1, with the pinning invariant required in both test suites |
| R8 | Deploy provenance mismatch (ghcr image pull vs on-VPS build) | Accepted; resolves by decommission (E6). Any interim deploy requires the Operator to confirm the actual artifact path |
| R9 | **Bundle budget uncalibrated** for the Hestia `/energy` route chunk; all current figures are estimates, and Recharts + d3 (~140 KB gz estimated) is now a committed cost | Open; measure and pin at E4. Over-budget is answered Recharts-side per the ADR-007 conditions (deeper splitting, narrower imports, one view hand-rolled), not by reopening the charting decision |
| R10 | **Knowledge stranding**: sign conventions, contracts, and the R1 warning currently live only in this soon-to-be-archived repo | Mitigation is E5 (documentation transfer is an exit criterion, not an afterthought) |
| R11 | **Cross-repo coordination**: E1–E6 execute under Hestia's governance; this repo's Governor cannot gate them directly | Mitigation: decommission (E6) is gated on this repo's Governor verifying the cutover evidence; the two ADR logs cross-reference each other |
| ~~R12~~ | **The design reference was vendor-hosted, not captured.** ADR-010 recorded the design as "captured in ~2,300 reviewed lines" while local `lovable/` held only three files; everything else existed solely in the Lovable cloud project, with ten port stories depending on it | **CLOSED 2026-07-30 by RW-C02.** 19 files (~2,900 lines incl. banners) staged locally with `lovable/MANIFEST.md`: the full portable set, `styles.css`, and the four Recharts views. Nothing ADR-010 discards was staged; secrets sweep clean before commit |
| R13 | **`PowerTimeline` in the design reference derives grid direction from Sungrow, not P1.** It computes `grid = (avg_load_power_w − avg_pv_power_w + avg_battery_power_w)` instead of reading the authoritative P1 `power_w`. The polarity coincidentally matches, so it looks right — but it is the **same class of error as D1**, it will not tie out with the P1-sourced KPI card, and a P1-sourced history series runs into R1. Discovered while staging (RW-C02), recorded as `lovable/MANIFEST.md` finding F1 | **Open.** RW-E16 must not port the derivation; the timeline's grid series is an escalation at port, not a copy. The reference file is left unmodified by the read-only rule |

Retired risks from the morning revision: R2 (Lovable output unverified — the
assessment verified it file-by-file), R4 (superseded by R9), R6 (bridge
re-verification — closed by removal, ADR-009 amendment).

---

## Open Questions for the Governor

1. ~~**Chart implementation**~~ — **CLOSED 2026-07-30. Recharts is kept**
   (Option A): accepted as a Hestia dependency, code-split behind the `/energy`
   route chunk, bundled never CDN, hex literals tokenised at port time. Full
   conditions in the ADR-007 second amendment. E1(b) now records the decision in
   Hestia's log rather than making it.
2. ~~**CLAUDE.md amendments**~~ — **CLOSED 2026-07-30.** `CLAUDE.md` §0 now
   carries the three-lane model (maintenance / extraction / donor), §3's gates
   are npm·Jest·ESLint·`scripts/build.js` for this repo with Hestia's own gates
   left to Hestia, the constraints table carries HC-002…HC-006 as rewritten
   here, and the Recharts allowance is stated as a non-escalating dependency in
   the extraction lane only.
3. **R1 capture timing (E7)**: schedule the live-API capture session; it is
   cheap, independent of the port, and unblocks the highest-value grid
   features.
4. **Grid-detail off-palette colors**: promote `#8B7BF0`/`#00C9A7` to named
   FE_design.md tokens, or bind the grid screen to the existing
   import/export tokens — an FE_design.md decision to make before E4 renders
   them.
5. **Font carry**: self-host DM Sans + JetBrains Mono in Hestia (est.
   60–120 KB woff2) versus falling back to Hestia's system-font stack for the
   energy feature — a small FE_design conformance vs. bundle trade to settle
   at E2.
6. **Lovable round-trip policy**: if visual iteration through Lovable is
   wanted later, define the scratch-project workflow (component in, diff out)
   before anyone re-opens the original project as a source of truth.

---

## Related Documents

- `docs/LOVABLE_INTEGRATION_ASSESSMENT.md`: the 2026-07-29 independent
  assessment this revision implements — extraction inventory, risk ledger,
  verified claims
- `CLAUDE.md`: governance operating model — roles, contracts, review gates
- `docs/FE_design.md`: authoritative visual token system and component anatomy
- `docs/REDESIGN_BRIEF.md`: the brief the Lovable screens were generated from
  (screen inventory, data contract, integration seam)
- `docs/REWORK_BACKLOG.md`: **the active task list** — E1–E7 and the ADR-012
  maintenance lane as governed stories (RW-M/RW-C/RW-E), with the blocked
  register and the open Governor decisions
- `docs/BACKLOG.md`: Phases 1–5, complete 2026-02-15; historical record
- `docs/project_idea.md`: original API contract detail (register-level
  reference)
- `SKILL.md`: security guidelines (binds every role)
- `/home/wlc3xkl/Personal-Assistant-App/Architecture.md`: Hestia's
  architecture — authoritative for the target stack, the Caddy route table,
  and the ADRs the extraction adds there
- `Architecture.md.backup`: the 2026-02-15 vanilla-JS architecture, verbatim
- `Architecture.md.backup-adopt-asis`: the 2026-07-29 as-is-adoption
  architecture reversed by ADR-010, verbatim
