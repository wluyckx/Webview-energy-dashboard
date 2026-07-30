# RW-M04 — D3: honest unavailable state on the P1 series tabs

**Lane**: M · **Complexity**: S→M (widened by evidence, see below) · **TDD**: mandatory
**Model lane**: Fable · **Branch**: `story/RW-M04-d3-unavailable-state`
**Opened**: 2026-07-30 · **Closes**: defect D3's *rendering* (ADR-012 item 3).
The data itself stays unavailable until RW-C01 closes R1 — that is the point.

---

## Story Contract (PM + Architect hats; every claim below verified at drafting)

**GOAL**: the Day/Month/Year tabs stop rendering NaN bars and instead state
honestly that the data is not available yet — because the P1 series contract
has never been captured, and guessing it is what shipped this defect.

**THE DEFECT — wider than the defect table records** (evidence from reading
`src/p1-card.js` at drafting):
- `computeDeltas` (line 349) reads **four** invented series fields:
  `energy_import_kwh`, `energy_export_kwh`, `avg_power_w`, `max_power_w` —
  none captured from the live API (R1 / HC-006). The real payload lacks them ⇒
  `undefined − undefined = NaN` bars.
- Line 359 contains a "sanity fallback" **built on another invented field**
  (`avg_power_w`) — a guess papering over a guess.
- `fetchAndUpdate` (line 378) fetches `/v1/series` every 5 s while a gated tab
  is open — polling an endpoint whose response shape we do not know.
- `fetchP1Series` is called **only** from p1-card (verified) — after this
  story it has no caller; noted for decommission, left in place (out of scope).
- The live path is clean: `updateLiveView`/`updateHeader` read only the
  documented realtime `power_w` (verified) — the card reads **no** cumulative
  realtime fields, so a zero-reads grep over all four invented names is
  unambiguous.

**ARCHITECT RULINGS**
1. **Gate at the source, delete the guesswork.** Non-live views render the
   unavailable state immediately and make **no API call**. `computeDeltas` and
   the bar-view data path are **deleted, not bypassed** — dead invented-field
   reads left in place are how `charts.js:70` happened.
2. **Header honesty**: on gated tabs the header import/export values show `—`
   (em dash), never stale bar totals, never NaN. Live header behaviour
   unchanged.
3. **The state is styled, not improvised**: a `.p1-card__unavailable` block in
   `index.html`'s stylesheet using CSS custom properties by name
   (`var(--text-secondary)` etc.), `role="status"`, message plus one
   explanatory line. No literal hex introduced anywhere by this story.
4. **Chart lifecycle**: entering a gated view destroys any live chart;
   returning to Live recreates it. No double canvas, no leak.
5. **Mock untouched**: `getMockP1SeriesDay()` invents the R1 shape
   (pre-existing, pinned by mock-data shape tests) — it becomes **unread by
   the card** and dies at decommission; RW-C01's capture re-verifies. Not this
   story's business.

**ACCEPTANCE CRITERIA — numbered invariants**
1. Switching to Day, Month, or Year renders a defined unavailable state
   (`.p1-card__unavailable`, `role="status"`) with explanatory text; **no
   canvas chart** exists in the card while gated; the rendered card never
   contains the strings "NaN" or "undefined".
2. Gated views make **zero API calls**: with `ApiClient` spied,
   `fetchP1Series` and `fetchP1Realtime` are both uncalled by a switch to a
   gated tab AND by the 5 s poll tick while a gated tab is current (fake
   timers).
3. `computeDeltas` no longer exists on the module or in the file; grep-level:
   zero reads of `energy_import_kwh`, `energy_export_kwh`, `avg_power_w`,
   `max_power_w` anywhere in `src/p1-card.js`. No new field name introduced
   (HC-006).
4. Robustness: switching to a gated tab with `Config.getConfig()` returning
   null still renders the unavailable state (it is static) — no throw.
5. Live tab regression pins: `updateLiveView` ring-buffer append and trim at
   60 samples; header shows formatted current power from realtime `power_w`;
   switching Live→Day→Live recreates the chart exactly once per entry.
6. Gated header shows `—` for both import and export values.
7. Chart lifecycle: with a stubbed `Chart` (constructor + `destroy` spies),
   entering a gated view calls `destroy` on an existing chart; no `Chart`
   construction happens while gated; returning to Live constructs one.
8. The gate carries a code comment naming **RW-C01 / R1** as the unlock
   condition (Verifier grep, not a unit test).

**IN SCOPE**: `src/p1-card.js`; `index.html` (one CSS block for the state —
nothing else); `tests/p1-card.test.js` (**new file** — none exists today,
verified; Spec Author owns it).

**OUT OF SCOPE**: `src/api-client.js` (`fetchP1Series` stays, unused),
`src/mock-data.js` and its tests, `src/charts.js` (RW-M06), every other card.

**BINDING CONSTRAINTS**: HC-003 (never NaN/undefined as data; defined states),
HC-006 (no invented field, no guessed contract), ADR-012 item 3, DESIGN gate
(custom properties by name, WCAG AA, 44 px tabs unchanged), §2.3
SIGN CONVENTION gate applies to p1-card by name (the live path's `power_w`
reads are sign-audited).

**CONTEXT for the Spec Author**: `src/p1-card.js` is an IIFE with the standard
`module.exports` guard — plain `require('../src/p1-card.js')` works (verified;
same pattern as `tests/charts.test.js:15`). Public API: `init`, `switchView`,
`fetchAndUpdate`. jsdom harness needs: a `#section-p1-card` container element,
`global.Chart` stubbed (constructor spy returning `{destroy, update, data:…}`),
`Config.getConfig` stubbed, `ApiClient` spy object with `fetchP1Realtime` /
`fetchP1Series` returning resolved promises. Fake timers for the poll-tick
assertions. The card builds its DOM via `buildCard()` on `init`.

---

## Pipeline record (slim log)

**Spec (Sonnet)** — new `tests/p1-card.test.js` (the module's FIRST tests), 20
AC-named tests, RED 14 / green-pins 6, reproduced by the PM (zero
module/syntax errors). Honest translation call on AC3: `computeDeltas` is not
exported, so the module-level assertion could not discriminate — replaced with
an observable-behaviour test per the contract's own instruction; the file-level
grep assigned to the Verifier. Flagged its one assumption (canvas removed vs
hidden); Architect ruled **removed from the DOM** — a hidden canvas stays in
the a11y tree.

**Build (Opus)** — GREEN 330/330 first pass, net −68 lines. Deleted
`computeDeltas`, `updateBarView`, `createBarChart`, `barChartOptions`,
`formatKwh` (only caller died); zero occurrences of the four invented names,
including comments. One CSS hunk in index.html, tokens by name, and the Builder
deliberately rejected `--text-tertiary` for the detail line (≈2.4:1 — would
fail AA) in favour of `--text-secondary` (6.1:1). **Deviation, ratified**: the
header live-value dot resets to idle on gating — without it the last reading
froze next to a pulsing "live" dot, the exact HC-003 failure mode this story
removes. Pinned as AC9 (331). Copy ("History is not available yet…") is the
Builder's; Governor accepted it — honest, homeowner-plain, no invented
technical claims.

**Verify (fresh Sonnet)** — PASS. Scope exact; CSP/script/id lines untouched
(grep-verified); coverage for p1-card 0% → 92.4% stmts. **All five mandatory
mutants killed** (un-gate, stale header, hidden canvas, skipped dot reset —
AC9 discriminates as claimed — and the full sign swap). Then it went further:
the narrower single-leg mutant (export negation dropped alone) **SURVIVED** —
every fixture used positive `power_w`, so the export leg was pinned by
coincidence. Adversarial: rapid tab-cycling clean (one canvas, one Chart per
Live entry), 30 s gated = zero API calls, `onRealtimeData` while gated does not
corrupt the state, malformed live payloads render "0 W" never NaN
(pre-existing guard), a11y real-text pass.

**Gap closure** — AC10 (two tests): negative `power_w` routes to the export
leg (`export_w 1800`, plotted −1800, below zero) and a mixed positive/negative
sequence pins both legs in one buffer. The Spec Author independently dodged the
`-0`/`+0` `Object.is` trap with `toBeCloseTo`. Final: **333 / 333**.

**Review Verdict (Fable): APPROVE.** Read the diff: `renderUnavailableState`
builds DOM via `textContent` (no injection surface), `role="status"`, static
and config-independent; the gate comments name RW-C01/R1 at four sites; header
em dashes; canvas genuinely removed. Gates re-run by the Reviewer: lint 0/0,
format clean, 333/333, 132.6 KB. index.html CSP byte-identical.

**Production consequence**: the Day/Month/Year tabs stop lying. No NaN bars,
no fabricated series — an honest gate that names its unlock condition, removed
only when RW-C01 captures the real contract.

**Recurring-lesson tally**: the Verifier's "pinned by coincidence" find is the
session's third demonstration that mutation testing, not line coverage, is what
proves a suite pins behaviour (92% statement coverage still missed the export
leg entirely).
