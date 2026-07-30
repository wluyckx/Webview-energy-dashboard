# Lovable Integration Assessment — Extract the Design, Do Not Adopt the App

**Role**: Architect (independent investigation)
**Date**: 2026-07-29
**Inputs verified first-hand**: full Lovable project "Energy Watch" (`f3f96e50-2057-4bea-908e-8c645da3e710`, 90 files, read over MCP), the Hestia repo (`/home/wlc3xkl/Personal-Assistant-App`), this repo's rewritten `Architecture.md`, `docs/REDESIGN_BRIEF.md`, `docs/FE_design.md`, the legacy `src/` implementation, and the hand-copied `lovable/src/` files.

---

## 1. Verdict (read this if nothing else)

**Yes, the design is extractable — and unusually cheaply, because of a fact the
current Architecture.md does not know: Hestia is a React 19 + Tailwind v4 PWA,
the same rendering substrate as the Lovable output.**

The Lovable project is two things stapled together:

1. **~2,300 lines of application code** (10 energy components, 3 routes, a typed
   data contract, a mock data layer, a formatting lib, one CSS design-system
   file) that honored the brief's §8 integration seam: presentational,
   prop-driven, one data hook, hand-drawn SVG icons, **zero imports from
   shadcn/ui**. This layer is 80–90% copy-paste portable into Hestia.
2. **A vendor scaffold** — TanStack Start + SSR/Nitro (Cloudflare default
   target), an opaque `@lovable.dev/vite-tanstack-config` build package, 46
   vendored shadcn/ui components **none of which the app imports**, and ~44 of
   52 direct runtime dependencies that exist only to serve that dead code. This
   layer is discardable in its entirety and is where nearly all of the risk
   lives.

**Recommendation: reverse ADR-005's "adopt as-is". Extract the application
layer into Hestia as a native `/energy` feature (replacing today's iframe
embed), and discard the scaffold, the dependency tree, and the Lovable build
pipeline.** Estimated cost: roughly 1–2 focused weeks to a live, integrated
feature — comparable to the as-is migration plan (M1–M8) already written, with
a far better end state. Details and the strongest counter-argument in §6.

---

## 2. The fact that changes the calculus: what Hestia actually is

Verified directly from `/home/wlc3xkl/Personal-Assistant-App`:

| Aspect | Hestia reality | Consequence |
|---|---|---|
| Stack | **React 19, TypeScript 5, Vite 6, Tailwind CSS v4** (CSS-first `@theme` in `src/index.css`), Zustand, react-router 7, react-i18next, lucide-react | The Lovable components (React 19 + Tailwind v4) are **native material** for Hestia, not foreign design information to transcribe |
| Form | PWA (manifest, service worker), not Flutter. `SKILL.md`'s "React Native / Expo" framing is stale boilerplate; the code is a Vite web app | The "Flutter WebView" premise running through this repo's Architecture.md Overview, HC-002 Mode A, and R6 is **stale** |
| Energy today | `src/pages/EnergyDashboard.tsx` **iframes `/embed/energy/`** (this repo's v1 dashboard), passing `p1_base=${origin}/api/energy`, `sungrow_base=${origin}/api/solar` | The real production host of this dashboard is already Hestia, via iframe + Caddy — not a Flutter app |
| Auth | Hestia ADR-009: Caddy reverse-proxies `/api/energy/*` and `/api/solar/*` to the P1/Sungrow backends, validates the user's JWT via forward-auth, and **injects the Bearer tokens server-side**. "No tokens leave the server." | The entire WebView-bridge token machinery (this repo's HC-002 Mode A, postMessage bootstrap, URL-token scrubbing) is **dead weight in the Hestia context**. Cookie/same-origin proxy mode is the only path needed |
| Charts | **No chart library.** Hestia hand-rolls SVG bar charts (`SpendingBarChart.tsx`) | Recharts is the one genuinely contested dependency (see §4c and §6) |
| Governance | "Dependencies NOT in Tech Stack (Forbidden Without ADR)"; zero-warning lint gate; Vitest + RTL; CHANGELOG headers | Dropping a 52-dependency app into the Hestia repo as-is is flatly incompatible with Hestia's own rules. Extraction is the only Hestia-legal route |
| Theme | **Light theme** (white cards, slate background) | The dark-only energy screens become a deliberate "dark island" route — exactly what the iframe already produces today. HC-004 needs a scoping amendment, not reversal |

**Integration into Hestia in practice** means: a `/energy` route already exists;
replace the iframe with native React components; fetch same-origin
`/api/energy/*`, `/api/solar/*` with the session cookie; obey Hestia's
dependency gate and i18n extraction path (HC-004: hardcoded strings need an
extraction path — the Lovable components hardcode ~40 English strings including
a Belgian-tariff explainer paragraph).

---

## 3. Q1 — What is "the design", and how much is portable?

### 3a. Design decisions that are pure information (portable at ~zero cost)

| Asset | Where | Portability | Notes |
|---|---|---|---|
| Color token system | `src/styles.css` `:root` block | **Drop-in** | Verified hex-for-hex identical to `docs/FE_design.md` / brief §4 — Lovable carried the tokens faithfully, including the shadcn compatibility mapping (which extraction can simply delete) |
| Custom utilities: `num` (tabular mono), `label-caps`, `card-surface`, `card-hover`, `dimmed-stale`, `shimmer` | `src/styles.css` `@utility` blocks | **Drop-in** | Written in Tailwind v4 `@utility` syntax — Hestia is Tailwind v4, so these paste directly into a scoped stylesheet |
| Motion vocabulary: `shimmer-sweep` 1.6s, `flow-dash` 3s, `warn-pulse` 2.4s, `solar-glow` 4s, `rise-in` 400ms cubic-bezier(0.22,1,0.36,1), battery fill 700ms, direction-flip flash 300ms, counter 400ms ease-out, global `prefers-reduced-motion` collapse | `styles.css` + component code | **Drop-in** | This is the interaction spec v1 failed to deliver, now expressed as ~80 lines of CSS + timings |
| Power-flow geometry: 340×286 viewBox, node coordinates, stroke formula `width = 1.5 + min(1,|W|/3500)·4.5`, `opacity = 0.35 + mag·0.6`, 40 W active threshold, dashed-hint idle state | `PowerFlow.tsx` | **Drop-in** (as information or as code) | The "gauge settling" feel is these numbers |
| **Capacity-peak screen concept**: 2.5 kW Belgian reference gauge with marker at 62.5% of a 4.0 kW scale, green→warning→danger escalation at 75%/100% of reference, "you're at N% of this month's peak right now" live-headroom sentence, per-day peaks chart coloring the bill-setting bar coral, plain-language tariff explainer | `src/routes/peak.tsx` | **Drop-in concept** | The highest-value new screen; the concept and thresholds are the design |
| Grid-detail concept: Live/Day/Month/Year segmented tabs, import-above/export-below zero mirroring, deliberate off-palette import `#8B7BF0` / export `#00C9A7` | `src/routes/grid.tsx` | Drop-in concept | Day/Month/Year remain **blocked by R1** (unknown P1 series contract) regardless of stack |
| Screen anatomy: status bar w/ quick-glance SoC+solar, per-section stale badges, offline banner w/ last-known framing, energy-balance stacked source bar + tap-to-reveal kWh + self-consumption/sufficiency pills, monthly paired bars (solar up / net down, green net-export days, today emphasized), cost-stub "coming soon" treatment | routes + components | Drop-in concept | All three mandated degradation states designed, as briefed |

### 3b. Small self-contained code that ports trivially (hours each, mostly copy-paste)

All verified to import nothing beyond React, `cn()`, the types, and the format
lib — no router, no chart library, no shadcn:

| File | Lines (approx.) | Cost to carry into Hestia |
|---|---|---|
| `AnimatedNumber.tsx` (+ `ValueUnit`, `usePrefersReducedMotion`) | 120 | Copy. The single biggest quality lever from the brief, done correctly (rAF, cubic ease-out, reduced-motion collapse) |
| `PowerFlow.tsx` | 250 | Copy. Pure SVG/CSS; no dependencies at all beyond React |
| `primitives.tsx` (Card, SectionHeading, StaleBadge, HistoricalBadge, SectionState, Shimmer, Pill) | 130 | Copy |
| `StatusBar.tsx` + `OfflineBanner` | 100 | Copy |
| `Skeletons.tsx` | 80 | Copy |
| `EnergyBalanceCard.tsx` | 90 | Copy (no chart lib — it's a flexbox bar) |
| `CostStub.tsx` | 35 | Copy |
| `KpiStrip.tsx` | 170 | Copy; swap 2 TanStack `<Link>` → react-router `<Link>` |
| `types/energy.ts` | 120 | Copy — already annotated locally with sign conventions and the R1/HC-006 GridBucket warning |
| `lib/energy-format.ts` | 50 | Copy |
| `lib/mock-energy.ts` | 280 | Copy — pure TS, deterministic; remains the HC-003 fallback of last resort |
| `hooks/useEnergyData.tsx` | 100 | Copy the shape; replace the mock transport with the live client (required under **every** option — the Lovable app has no real data layer, per the brief). Local copy already carries the PORT NOTE: add visibility gating + real backoff |
| `lib/utils.ts` (`cn`) | 4 | Either add `clsx`+`tailwind-merge` to Hestia (2 tiny deps, ADR note) or replace with a 10-line local helper — usage here is simple concatenation |

### 3c. Genuinely welded to React/Recharts/TanStack (the real porting cost)

| Asset | Welded to | Cost |
|---|---|---|
| `PowerTimeline.tsx` (~200 loc), `MonthlyOverview.tsx` (~110), charts inside `grid.tsx` (~150 of 250), `peak.tsx` chart (~60 of 230) | **Recharts** (Area/Bar/Composed charts, dual axis, sign-stacked bars, custom tooltips) | Two options: **(i)** adopt `recharts` in Hestia via a Hestia ADR — then these files are near copy-paste (~1 day), at the price of one heavy dependency (~140 KB gz incl. d3 internals, the dominant bundle term); **(ii)** rewrite in Hestia's hand-rolled SVG idiom — 3–5 days, hardest part is the timeline's multi-series crosshair tooltip and dual SoC axis. This is the one real trade-off decision (see §6) |
| Route shells (`createFileRoute`, head/meta, `Link`) | TanStack Router | Mechanical: ~10 import/JSX swaps to react-router routes registered in Hestia's `App.tsx`. The per-route SEO/OG meta blocks are pointless inside an authenticated PWA — delete |
| React itself | — | Not a cost for Hestia integration. It **would** be the cost if the design were ported back to the legacy vanilla-JS architecture (a full rewrite of 3b as DOM code, ~2–3 weeks) — that path is not recommended and nobody is proposing it |

### 3d. Bulk with no value to this project (discard, ~70% of the codebase)

Verified by reading every application file's imports:

- **46 shadcn/ui components** (`src/components/ui/*`): **zero are imported by
  any application file.** Their only consumers are each other and
  `use-mobile.tsx` (itself only used by `ui/sidebar.tsx`).
- **~44 of the 52 direct runtime dependencies** exist solely for that dead
  layer: 26 `@radix-ui/*` packages, `react-hook-form`, `@hookform/resolvers`,
  `zod`, `date-fns`, `react-day-picker`, `cmdk`, `embla-carousel-react`,
  `input-otp`, `react-resizable-panels`, `sonner`, `vaul`, `lucide-react`
  (every icon in the energy screens is hand-drawn inline SVG),
  `class-variance-authority`, `tw-animate-css`. What the app actually uses at
  runtime: `react`, `react-dom`, `@tanstack/react-router`,
  `@tanstack/react-start`, `@tanstack/react-query` (vestigial — a QueryClient
  is created and never used for a single query), `recharts`, `clsx`,
  `tailwind-merge`.
- **Framework/vendor plumbing**: `server.ts`, `start.ts` (SSR error wrapper +
  CSRF middleware for server functions that don't exist here), `router.tsx`,
  `routeTree.gen.ts`, `error-capture.ts`, `error-page.ts`,
  `lovable-error-reporting.ts`, `vite.config.ts`, `bunfig.toml`, `bun.lock`,
  `components.json`, `.lovable/`, `AGENTS.md`, `robots.txt` (which invites
  every crawler into a private dashboard).

### Q1 conclusion

**Can we extract just the design? Yes — and more than the design.** Because
Hestia shares the rendering substrate, extraction means carrying over one CSS
file and ~13 application files nearly verbatim, re-targeting ~10 router
references, deciding the chart question, and writing the live data layer that
no option escapes. Ballpark: **2–4 days** if Recharts is accepted into Hestia
by ADR, **5–9 days** if the four chart views are rewritten in Hestia's
hand-rolled SVG idiom — plus **2–3 days** for the live data layer
(fetch client, response validation, 5s/60s/5min cadence, visibility gating,
backoff), which the as-is path also requires (its own M2/M4/M5). Add i18n
string extraction (~40 strings) to be Hestia-HC-004 compliant.

---

## 4. Q2 — Risks of adopting the app as-is, ranked by severity

"As-is" = the current Architecture.md plan: this repo re-bases on the Lovable
project, deploys it standalone (nginx behind Caddy), Hestia keeps iframing it.

### R-A1. Dependency surface out of all proportion to the product — **High / structural under as-is, fully mitigable only by extraction**
52 direct runtime + 16 dev dependencies (68 total; transitive tree estimated in
the several hundreds — not enumerated here), of which **~44 runtime deps serve
code the app never imports**. Every one is npm-supply-chain surface inside an
app that runs authenticated, same-origin with a personal assistant holding
private household data. The lockfile pins `nitro` at a **beta**
(`3.0.260603-beta`). Likelihood of *some* vulnerable-or-compromised package
event across that tree over the app's life: high (this is the base rate of
large npm trees, and 2025's npm worm campaigns hit exactly this class of
package). Impact in context: high. The Architecture.md "Dependency Gate"
freezes the lockfile as the *approved baseline* — i.e., it institutionalizes
the bloat rather than removing it. Extraction reduces the runtime set to ~4–8
packages Hestia already largely has.

### R-A2. Build pipeline is a vendor black box — **High / structural until replaced**
`vite.config.ts` delegates the *entire* plugin chain to
`@lovable.dev/vite-tanstack-config` v2.8.0, which (per its own header comment)
bundles: TanStack devtools, the Start plugin, React, Tailwind, tsconfig paths,
**Nitro "using cloudflare as a default target"**, VITE_* env injection,
**"error logger plugins"**, and **"sandbox detection"**. What those error
loggers and detectors do inside a production build is not inspectable without
auditing the vendor package on every update. `bunfig.toml` additionally
**exempts six `@lovable.dev` packages from its own 24-hour supply-chain guard**
(`minimumReleaseAgeExcludes`) — the vendor's own code ships to you faster than
any other package is allowed to. For a security-sensitive embed this is the
wrong trust posture. Mitigable by replacing with a ~20-line explicit Vite
config (a day's work) — but then you have already started extracting.

### R-A3. The delivered artifact is an SSR server, not a static site — **High impact if unnoticed / mitigable by config**
As delivered, `bun run build` produces a **Nitro server bundle (Cloudflare
default)** with SSR, a server entry (`src/server.ts`), and CSRF middleware for
server functions. ADR-006 (static SPA, no server runtime) is the right call
but is currently only words — the "exact `vite.config.ts` flag TBC" was never
resolved. Running the output as delivered would put a new Node/Bun runtime in
production for an app with literally nothing to compute server-side, violating
HC-005 from day one. Under extraction this risk evaporates (Hestia's Vite build
is already a static SPA).

### R-A4. Latent telemetry hooks and dev plumbing shipped to production — **Medium / trivially removable — the "phones home" claim is PARTIALLY confirmed, see §5**
`lovable-error-reporting.ts` forwards every boundary-caught error (message,
stack, route) to `window.__lovableEvents.captureException` /
`window.__lovableReportRuntimeError`. **No network call exists in the app
code**; those globals are injected only by lovable.js inside the Lovable
editor preview, so in a standalone deployment they are undefined and the calls
no-op. It is therefore *not* active exfiltration — but it is a latent hook
that hands full error context to any script that defines those globals, plus
dead vendor plumbing (`error-capture.ts` monkey-patches `console.error`
server-side) that nobody on the project understands or owns. Keep-as-is means
auditing this on every Lovable re-sync; extraction deletes it in minutes.

### R-A5. Third-party network egress: Google Fonts — **Medium / confirmed / easily mitigable**
`__root.tsx` loads DM Sans + JetBrains Mono from `fonts.googleapis.com` /
`fonts.gstatic.com` at runtime: every user's IP/UA goes to Google on every cold
load (a GDPR finding in EU case law), it requires two extra CSP hosts, and the
instrument dies typographically when offline — for an app whose ethos is
graceful degradation. Architecture.md already mandates self-hosting; that work
exists under every option. (Hestia currently uses system fonts; self-hosted
woff2 subsets ≈ 60–120 KB.)

### R-A6. CSP consequences — **Medium / confirmed / partially structural**
Confirmed: React inline `style={{…}}` attributes are pervasive in every energy
component and throughout Recharts, so **`style-src 'unsafe-inline'` (or
`style-src-attr 'unsafe-inline'`) is required** on any stack that keeps this
code — including after extraction into Hestia. This is a real but bounded
weakness (inline-style injection is a data-exfiltration channel only if an
injection vector exists elsewhere; React escapes by default and no
`dangerouslySetInnerHTML` exists in the app layer — the only instance is in the
**unused** `ui/chart.tsx`, which extraction discards). The win available
everywhere: `script-src 'self'` with no CDN, an upgrade over the legacy CSP's
`script-src 'unsafe-inline' https://cdn.jsdelivr.net`.

### R-A7. Bundle and runtime cost in a phone WebView — **Medium / structural to the stack**
Estimates (not measured — no build was run for this assessment): React 19 +
ReactDOM ~60 KB gz, TanStack Router/Start/Query ~40 KB gz, **Recharts + d3
internals ~140 KB gz** (and it cannot be code-split away — it renders on the
main `/` route), app code + CSS ~30 KB gz → **~250–300 KB gz, roughly
0.9–1.1 MB parsed**, matching the provisional HC-005 budget at its ceiling.
Legacy v1 totals ~100 KB gz (133 KB HTML + CDN Chart.js). On a mid-range phone
that is roughly half a second of extra parse/execute on cold open, partly
hidden by the (excellent) skeleton states. Extraction into Hestia amortizes
React/router across the whole PWA; the chart choice (§6) then dominates.

### R-A8. Maintenance of ~10,000 lines nobody on the project wrote — **Medium-high / structural under as-is**
Under as-is, the project owns: 46 stock shadcn files (~4,000 lines) that drift
from upstream the moment they land; a fast-moving framework pair (TanStack
Start 1.x + Vite 8 + Nitro beta) on a **second package manager (Bun)** and a
second toolchain, next to Hestia's npm/Vite 6; and chart code that hardcodes
hex values (`#4A5568`, `#1E2A3A`, `#33465e`, the `CHART_COLORS` map, grid.tsx's
`IMPORT`/`EXPORT`) in violation of this repo's own "tokens, never literal hex"
domain rule. Extraction keeps only the ~2,300 lines that were actually
reviewed here, on Hestia's existing toolchain and gates.

### R-A9. Auth/session in the embedding context — **Medium / a cost, not a defect**
The Lovable app contains **no auth, no config parsing, no URL-parameter
handling, no input validation at all** — correctly, per the brief ("frontend
only… drive everything from a mock data layer"). As-is adoption still requires
building the entire credential path (this repo's M4: allowlist validation,
proxy mode, bridge mode). Extraction into Hestia needs strictly less: same-origin
`credentials: 'include'` fetches against Caddy-proxied `/api/energy/*` — no
tokens in the client ever, no base-URL parameters to validate, the WebView
bridge (HC-002 Mode A) and its `'null'`-origin acceptance deleted rather than
re-verified (closing risk R6 by removal). One item to check at cutover: v1's
iframe embed relied on `X-Frame-Options SAMEORIGIN` / `frame-ancestors 'self'`
holding because Caddy serves it same-origin under `/embed/energy/` — native
integration removes the iframe and this concern entirely.

### R-A10. Invented API contract in the types — **Confirmed / already flagged / low residual**
`GridBucket { bucket, import_kwh, export_kwh }` is the mock's invention; the
real P1 `/v1/series` bucket shape has never been captured (Open Risk R1,
HC-006). The local copy in `lovable/src/types/energy.ts` already carries an
explicit UNVERIFIED CONTRACT warning. Verified additionally: the mock's
`peaks[]`, P1 realtime, and Sungrow shapes match the documented contracts and
sign conventions exactly (`power_w` signed positive-import, `battery_power_w`
positive-charge, `export_power_w` correctly absent from the Sungrow type with
an explanatory comment). Residual risk is process, not code: anyone building
Grid Day/Month/Year against the mock ships v1's NaN bug again. Blocked until
R1 closes, under every option.

---

## 5. Specific claims — verified or refuted

| Claim | Verdict | Evidence |
|---|---|---|
| Error files send errors to Lovable infrastructure | **Partially confirmed — dev/editor-only in practice, but a latent hook** | `lovable-error-reporting.ts` calls `window.__lovableEvents?.captureException` and `window.__lovableReportRuntimeError?.(…)` with message/stack/route. Optional-chained; no fetch/XHR/beacon anywhere in app code; the comment states the hook "is present only inside the editor preview". `error-capture.ts` is SSR-side error recovery (monkey-patches `console.error`), no network. Removable in minutes; both die with extraction |
| `vite.config.ts` delegates everything to a vendor package with Nitro/Cloudflare default | **Confirmed** | Single import from `@lovable.dev/vite-tanstack-config`; header comment enumerates bundled plugins incl. "nitro (build-only using cloudflare as a default target)" and "error logger plugins". Plus `bunfig.toml` exempts 6 `@lovable.dev` packages from the 24 h supply-chain age guard |
| `__root.tsx` loads DM Sans + JetBrains Mono from Google Fonts CDN | **Confirmed** | Two `preconnect` links + stylesheet link to `fonts.googleapis.com/css2?family=DM+Sans…JetBrains+Mono…` |
| `cdn.gpteng.co` scaffold reference remains somewhere | **Not found — appears already gone** | Read all 40+ non-binary files that emit or configure HTML/head/build (routes, root, configs, README, robots, error page): no occurrence. Not audited: the 46 stock shadcn `ui/*` files (which emit no head content) and `bun.lock`. Confidence high, not absolute |
| `GridBucket` fields are invented; real P1 series contract never captured | **Confirmed** | Mock derives them from Sungrow data; matches Open Risk R1 and HC-006; warning annotation already present in the local copy |
| ~50 shadcn components present; how many used? | **46 present, 0 used by application code** | Checked every import in all routes, energy components, hooks, root: none reference `@/components/ui/*` |
| React/Recharts inline styling forces `style-src 'unsafe-inline'` | **Confirmed** | Inline `style` attributes throughout app components and Recharts props; `ui/chart.tsx` (unused) even injects a `<style>` via `dangerouslySetInnerHTML` |
| Stack as described (~60 deps, Bun, TanStack Start, Vite 8, Tailwind 4, shadcn, Recharts) | **Confirmed, refined** | 52 runtime + 16 dev direct deps; `bun.lock` + `bunfig.toml`; template `tanstack_start_ts_current`; Vite 8.1.5, Tailwind 4.2.1, React 19.2, Recharts 2.15.4, nitro 3.0.260603-beta |

---

## 6. Recommendation, cost, and the strongest argument against it

### Recommendation

**Extract; do not adopt.** Concretely:

1. Port the §3a CSS (scoped under an `.energy` wrapper so the dark island
   doesn't leak into light-themed Hestia) and the §3b files into
   Hestia as a native `/energy` feature, replacing the iframe in
   `EnergyDashboard.tsx`.
2. Decide the chart question **as a Hestia ADR**, on its merits:
   - *Option A — accept `recharts`*: fastest (§3c ≈ 1 day), one heavy but
     mainstream dependency, code-split behind the `/energy` route so the rest
     of Hestia pays nothing.
   - *Option B — rewrite the 4 chart views in Hestia's hand-rolled SVG idiom*:
     +3–5 days, zero new dependencies, consistent with `SpendingBarChart`;
     the timeline crosshair/dual-axis is the hard part.
   The Architect's lean is **Option A with the route code-split**, revisitable
   once real usage data exists — but either is defensible.
3. Build the live data layer once, in Hestia: same-origin cookie fetches via
   Caddy, response schema validation, 5 s/60 s/5 min cadence, visibility
   gating, exponential backoff, cache-on-failure. Keep `mock-energy.ts` behind
   a `?mock=true` flag as the HC-003 fallback.
4. Do not import: TanStack anything, shadcn/ui, Radix, Bun, the vendor Vite
   config, the error/telemetry files, Google Fonts links (self-host the two
   families), `robots.txt`.
5. Decommission path for this repo: the standalone deployment and the iframe
   can retire once the native route ships; the Lovable project remains
   available read-only as the design reference.
6. Close the loop on R1 before building Grid Day/Month/Year, exactly as
   HC-006 demands.

### Rough cost

| Path | Estimate |
|---|---|
| Extraction into Hestia (recommended) | ~1–2 weeks: 2–4 days port (Option A) or 5–9 days (Option B), + 2–3 days live data layer, + i18n extraction, + Hestia ADR/gate paperwork |
| As-is adoption (current Architecture.md M1–M8) | Comparable or larger: same data-layer work (M2/M4/M5), plus SPA-mode conversion, dep-tree ownership, CSP/deploy rework (M3/M6), governance amendments (M7) — and the §4 risk ledger persists indefinitely |

### Strongest argument against this recommendation

**As-is adoption preserves the Lovable feedback loop; extraction orphans the
design source.** Keeping the project connected means future design iteration
stays a prompt away, with a live preview, and the deployment slot
(`/embed/energy/` iframe) already works today — the as-is migration plan is
written, and every file touched during extraction is a chance to introduce a
regression that Lovable's preview had already visually validated. If the owner
expects to keep iterating the *visuals* through Lovable for months, extraction
converts each iteration into a manual diff-and-port exercise.

Why it doesn't win: the design is now captured (tokens, geometry, motion, and
screens all live in ~2,300 reviewed lines); the port is mechanical for 80% of
files on an identical rendering substrate; and the as-is path's costs are not
one-time — the 52-package tree, the vendor build box, and the unowned shadcn
layer are *recurring* audit surface inside the security boundary of an app the
owner has declared security-critical. A one-time porting tax beats a permanent
trust tax. If Lovable-driven iteration is genuinely wanted later, individual
components can be round-tripped through a scratch Lovable project without
re-adopting the scaffold.

---

## 7. Decisions in the current Architecture.md that need reversing or amending

The 2026-07-29 rewrite assumed as-is standalone adoption and predates the
"integrate into Hestia" direction. If the recommendation is accepted:

| Item | Action |
|---|---|
| **ADR-005** (adopt Lovable output as-is; repo re-bases on its layout; lockfile = approved dependency baseline; Bun adopted) | **Reverse.** Replace with "extract application layer into Hestia; scaffold and dependency tree discarded; Lovable project kept as read-only design reference" |
| **ADR-006** (static SPA, no server runtime) | **Substance survives, premise changes**: Hestia's Vite build is already a static SPA — the ADR's real content ("no server runtime for this feature") transfers; the TanStack-specific flag hunt disappears |
| **ADR-007** (bundled charting, no CDN) | **Amend**: "no CDN" survives; the library decision moves to a **Hestia** ADR (Recharts vs hand-rolled SVG, §6). Fix the hardcoded-hex violations at port time |
| **ADR-008** (power flow as inline SVG in React) | **Survives unchanged** — `PowerFlow.tsx` is exactly this |
| **ADR-009** (dual auth modes + base-URL allowlist) | **Amend**: in Hestia-native integration only proxy/same-origin mode exists; Mode A (WebView bridge, postMessage, `'null'` origin, URL-token scrubbing) is deleted, not ported — which also closes R3 (prefix-only validation) and R6 (bridge re-verification) by removal. The allowlist collapses to "same-origin only" |
| **HC-002** | Rewrite for the Hestia context: no tokens client-side ever (Caddy injects); forbid token handling in the energy feature outright |
| **HC-005** (static artifact, bundle budgets) | Survives; budgets re-pointed at the Hestia build (`/energy` route chunk) |
| **HC-006** (contracts captured, never guessed) + **R1** | **Reaffirm** — this investigation re-confirmed the GridBucket invention |
| **HC-004** (dark mode only) | Amend scope: dark-only *within the energy feature*, scoped tokens, inside a light PWA |
| **Overview / R6 "Flutter WebView" framing** | **Correct the record**: the production host is the Hestia PWA (today via same-origin iframe; after integration, native route). No Flutter bridge exists in the embedding path |
| **Migration plan M1–M8** | Replace with an extraction plan (§6 steps 1–6); M5's test-porting content (sign-convention pins incl. R7, config/backoff tests) carries over into Hestia's Vitest suite largely unchanged |
| **CLAUDE.md** command set / HC table (M7) | Amend against the Hestia toolchain instead of Bun |

---

## 8. Stated uncertainties

- **Bundle figures in §R-A7 are estimates**, not measurements — no build was
  executed during this assessment. Calibrate at the first real build (the
  extraction plan's equivalent of M3).
- The 46 stock shadcn `ui/*` files and `bun.lock` were not read line-by-line;
  the `cdn.gpteng.co` verdict and "no other egress" verdict carry that caveat.
  No mechanism was found by which those files could execute (nothing imports
  them).
- What `@lovable.dev/vite-tanstack-config` actually injects at build time was
  characterized from its documented plugin list, not a package audit — under
  extraction this is moot; under as-is it must be audited per update.
- Whether the Sungrow **series** endpoint's real bucket field names match the
  mock's `SungrowBucket` was not re-verified against the live API here; the
  documented contract in Architecture.md matches, and unlike the P1 case there
  is no history of invention — risk low, but the R1 capture exercise should
  cover both APIs while it's at it.
