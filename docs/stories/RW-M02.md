# RW-M02 — D1: derive solar→grid flow from P1 `power_w`, never Sungrow `export_power_w`

**Lane**: M (maintenance, this repo) · **Complexity**: M · **TDD**: mandatory
**Model lane**: Fable — this contract and the Review Verdict are authored by the
Fable Governor session · **Branch**: `story/RW-M02-d1-solar-to-grid`
**Opened**: 2026-07-30 · **Closes**: risk R7, defect D1 (ADR-012 item 1)

---

## Story Contract (PM hat; Architect hat authored the numbered invariants)

**GOAL**: the hero diagram shows the solar→grid flow whenever the house is
exporting, driven by the meter that actually knows — P1 — so export activity is
never silently hidden again.

**THE DEFECT** (`src/power-flow.js:545-546`):
```js
var solarToGrid =
  sungrowData.export_power_w > 0 && sungrowData.pv_power_w > 0 ? sungrowData.export_power_w : 0;
```
`export_power_w` is **always 0 on this inverter's WiNet-S firmware**
(Architecture.md, Sign Convention Reference), so `solarToGrid` is permanently 0
in production. The hero diagram has never rendered an export flow.

**WHY IT SHIPPED — recorded as evidence, both halves masked it:**
1. The existing test `export when solar producing maps to solarToGrid` feeds a
   fixture with `export_power_w: 750` — the test suite encodes the firmware
   fiction, so the defective code passes.
2. `src/mock-data.js:75` sets `export_power_w: 750.5` alongside `power_w: +450`
   — physically contradictory (importing 450 W while exporting 750 W), and it
   made mock mode draw an export line, so the defect was invisible in dev.
This is the fixture-drift failure mode the conventions warn about: a fixture
that drifts from Architecture.md is a defect in one of the two.

**THE FIX (Architect ruling)**: `solarToGrid = max(0, -p1.power_w)` — a pure
function of the signed, authoritative P1 reading and nothing else.
- No `pv_power_w > 0` gate. Rationale: the gate is what hid export; P1 is
  authoritative for grid direction (DP-003), and in the rare night-export edge
  (battery discharging past load) showing the export on the only export edge the
  diagram has is less wrong than hiding it. The attribution limitation is
  documented in a code comment, not silently absorbed.
- `gridToHome` stays derived from `import_power_w` (documented, reliable,
  already pinned). Minimal change: this story fixes `solarToGrid` only.

**ACCEPTANCE CRITERIA — numbered invariants (Architect hat; the Spec Author
translates these into tests and invents nothing):**

1. **The D1 pin** (required in this suite now, and in Hestia's at RW-E20):
   `p1 = {power_w: -2000, import_power_w: 0}`,
   `sungrow = {pv_power_w: 3000, load_power_w: 800, battery_power_w: 0,
   battery_soc_pct: 50, export_power_w: 0}` ⇒ `solarToGrid === 2000`.
2. **The formula, exactly** `max(0, -power_w)`:
   (a) `power_w: -1` ⇒ 1 · (b) `power_w: 0` ⇒ 0 · (c) `power_w: +800` ⇒ 0 ·
   (d) `power_w: -3200` with `pv: 4000, load: 600, battery: +200` ⇒ 3200.
3. **Dead-field independence**: two calls identical except
   `export_power_w ∈ {0, 9999, undefined / absent}` return deep-equal results.
   This is the property that makes reintroducing the dead field impossible.
4. **Direction exclusivity** on physically consistent fixtures: exporting
   (`power_w < 0, import_power_w: 0`) ⇒ `gridToHome === 0 && solarToGrid > 0`;
   importing (`power_w > 0, import_power_w === power_w`) ⇒
   `solarToGrid === 0 && gridToHome > 0`. Never both.
5. **Battery conventions unchanged**: `battery_power_w < 0` ⇒
   `batteryToHome === |battery_power_w|` and `solarToBattery === 0`;
   `battery_power_w > 0` ⇒ `solarToBattery === max(0, pv − solarToHome −
   solarToGrid)` and `batteryToHome === 0`.
6. **Conservation with real export**: `pv: 3000, load: 800,
   battery_power_w: +500, power_w: -1700, import_power_w: 0` ⇒
   `solarToHome === 800`, `solarToGrid === 1700`, `solarToBattery === 500`
   — the panel's 3000 W fully attributed with nothing invented.
7. **Unchanged surface**: `solarToHome === min(pv, load)`; `gridToHome` from
   `import_power_w` as today; the passthrough fields (`solarTotal`, `homeTotal`,
   `gridTotal`, `batterySoc`, `batteryPower`) unchanged.
8. **Night-export edge, decided not dodged**: `power_w: -500, pv_power_w: 0` ⇒
   `solarToGrid === 500`. The old test asserting 0 for a no-production export
   asserted the defect's behaviour; the direction is real and must render.
9. **Mock rider**: `src/mock-data.js` realtime `export_power_w: 750.5` → `0`,
   with a comment stating the field is always 0 on this firmware. Mock tests pin
   shape only (verified before drafting), so this cannot break them.

**IN SCOPE**: `src/power-flow.js` (the `computeFlows` body), `src/mock-data.js`
(the one rider line + comment), `tests/power-flow.test.js` (Spec Author only).

**OUT OF SCOPE**: `src/energy-balance.js` (that is RW-M03), `src/charts.js`
(frozen — see the D4 note below), `src/p1-card.js` (RW-M04), any rendering
change beyond what corrected flow values produce, `index.html`.

**BINDING CONSTRAINTS**: DP-003 (flow direction is sacred), HC-006 (the dead
field is the standing example), Sign Convention Reference (P1 `power_w`
authoritative for grid direction), ADR-012 item 1, the §3 gates.

**CONTEXT for the Spec Author** (self-contained; no repo exploration needed):
the module is a browser IIFE — `var PowerFlow = (function () { ... })()` —
loaded in jsdom tests via the existing harness in `tests/power-flow.test.js`;
`computeFlows(p1Data, sungrowData)` is pure and exported on the module object.
Existing `describe('computeFlows')` sits at lines 282–392. Two existing tests
interact with the change: *"export when solar producing"* uses
`power_w: -750` **and** `export_power_w: 750`, so it passes under both old and
new code — non-discriminating, may stay but must not be counted as RED
evidence; *"no export when solar not producing"* uses `power_w: 0` with
`export_power_w: 100`, which under the new formula still yields 0 — it becomes a
dead-field-independence case and survives.

---

## Architect note recorded while reading the code — new defect instance D4

`src/charts.js:70` pushes `bucket.avg_export_power_w / 1000` as the grid series
of the timeline chart. That is the same dead field family — the series average
of an always-0 field — so the timeline's grid line is flat 0 in production:
D1's failure mode (silently hidden grid activity) in a file ADR-012 froze and
whose defect table missed it. **Not folded into this story** (scope discipline);
recorded in Architecture.md's defect table as D4 with the disposition decision
routed to the Governor: fix in place via an ADR-012 amendment, or accept until
decommission like the polling defects. The Hestia timeline is unaffected — its
grid series is already governed by R13/F1.

---

## Spec Author deliverable (Sonnet 5) — APPROVED

**TEST SPEC**: AC1–AC9 → 14 named, AC-numbered tests (13 in
`tests/power-flow.test.js` under a nested RW-M02 describe, 1 in
`tests/mock-data.test.js` for the AC9 mock rider). The two existing tests the
contract called out were kept with explanatory comments rather than deleted:
*"export when solar producing"* marked NON-DISCRIMINATING (its fixture sets
`export_power_w == -power_w`, so it passes under both old and new code);
*"no export when solar not producing"* survives as a dead-field case. No
existing test contradicted the new formula, so nothing was removed.

**RED EVIDENCE**: 9 failed / 261 passed / 270 total — the discriminating set is
AC1, AC2a, AC2d, AC3, AC4a, AC5b, AC6, AC8, AC9. The Spec Author explicitly
listed the 5 GREEN-today tests (AC2b, AC2c, AC4b, AC5a, AC7) as regression
cover rather than letting them inflate the RED count.

**PM verification before approval**: RED reproduced independently (9/261/270),
zero module/syntax errors among the failures, `src/` untouched by the Spec
Author. Approved.

**Spec Author's self-flagged weak point**: AC3's independence proof uses one
fixture shape (exporting, battery idle) — a mutant that read `export_power_w`
only inside the battery-charging branch would evade it. Handed to the Verifier
as a directed mutation probe.

---

## Implementation Report (Builder, Opus 5) — change-cycle 0

**STATUS**: DONE (superseded by change-cycle 1 below for the AC10 gap)

**CHANGES**: `src/power-flow.js` — `solarToGrid = Math.max(0, -p1Data.power_w)`
per the Architect ruling, with the HC-006 comment at the point of decision;
`src/mock-data.js` — realtime `export_power_w: 750.5` → `0` with a
shape-fidelity comment (AC9).

**TDD EVIDENCE**: 270 passed / 270. AC5b and AC6 (conservation) went green
without touching the battery branch — `solarToBattery` naturally subtracts the
now-real `solarToGrid`, which is exactly what the Architect predicted in the
contract.

**GATES**: lint zero/zero · format clean · build 133,617 bytes (130.5 KB),
9 scripts inlined.

**GREP**: no code read of `export_power_w` anywhere in `src/power-flow.js`; the
two surviving prose mentions are the CHANGELOG entry and the mandated HC-006
comment. Remaining reads across `src/` mapped to owners: `energy-balance.js`
(RW-M03), `charts.js:70` (D4), mock series values (RW-M03).

**DEVIATION, accepted by the Reviewer**: the contract said the field must appear
"NOWHERE" in the file and, in the same paragraph, mandated a comment naming it.
The Builder kept the comment and produced the empty code-read grep as the
substantive evidence. Correct resolution — the named field at the point of
decision is what makes the HC-006 record auditable; the contract's wording was
self-contradictory, another instance of the recurring contract-precision defect.

**SELF-REVIEW that changed the story**: the Builder probed its own change and
found the new formula is less null-safe than the defective one it replaced —
`computeFlows({}, sungrow)` yields `solarToGrid: NaN` because
`Math.max(0, -undefined)` is NaN, where the old comparison-based expression
degraded to 0. `app.js` guards object truthiness only, so a payload missing
`power_w` would propagate NaN to the diagram — an HC-003 violation the contract
failed to specify. It correctly declined to fix unspecified behaviour and
flagged it instead.

---

## Governor action on the gap — AC10, spec-first

The NaN edge is a **contract defect (mine)**: the formula change altered
malformed-input behaviour and the contract said nothing about it. Third
contract-precision defect this session (RW-M01 file count, RW-M05 scope,
RW-M02 malformed input). Per the TDD rule — no production code without a
pre-existing failing test — the fix goes **spec-first**: the same Spec Author
adds AC10a–f (absent / undefined / NaN / wrong-type / null `power_w` ⇒
`solarToGrid === 0`, plus a finite-negative regression guard so the guard cannot
over-suppress), RED against the Builder's current code, then the same Builder
implements to green as change-cycle 1. Architect ruling:
`Number.isFinite(p1Data.power_w) ? Math.max(0, -p1Data.power_w) : 0`.

---

## Change-cycle 1 (Builder) — AC10 guard

`solarToGrid = Number.isFinite(p1Data.power_w) ? Math.max(0, -p1Data.power_w) : 0`
per the Architect ruling. 276 → green. The Builder then flagged that
`Number.isFinite` does not coerce, so a NUMERIC STRING `'-1200'` degrades to 0
rather than reading as 1200 — and correctly declined to decide the semantics
itself. **Architect ruling: no coercion, ratified** — a stringified `power_w` is
an unobserved contract shape; coercing it would let it render as authoritative
(the HC-006 failure mode). Pinned as AC10g (green regression lock) so a future
`parseFloat`-style refactor cannot change it while staying green. 277 passed.

---

## Verification Report (Verifier, fresh Sonnet 5)

**GATES**: lint zero/zero · format clean · 277/277 (278 after AC3b below) ·
build 133,881 bytes (130.7 KB), 9 scripts · coverage `power-flow.js` 81.9%
stmts (uncovered lines are untouched DOM helpers), `mock-data.js` 100% stmts.

**TDD AUDIT — four mutants**:
| Mutant | Result |
|---|---|
| (a) revert to the dead-field derivation | killed — 9 failures (AC1, AC2a, AC2d, AC3, AC4a, AC5b, AC6, AC8, AC10f) |
| (b) drop the sign: `Math.max(0, power_w)` — the direction flip | killed — 12 failures; AC2c and AC4b are the cleanest single-symptom catches. **DP-003's worst case is test-guarded** |
| (c) drop the non-finite guard | killed — AC10a–d NaN pins plus AC10g |
| (d) read `export_power_w` only inside the battery-charging branch | **SURVIVED** — every charging fixture used `export_power_w: 0` |

Mutant (d) was the Spec Author's own pre-flagged blind spot, confirmed real by
the Verifier rather than silently passed.

**SIGN CONVENTION (non-waivable)**: per-field PASS across `power_w`,
`import_power_w`, `battery_power_w`, `export_power_w` (zero code reads;
prose-only mentions), and the mock realtime block no longer contradicts itself
(importing 450 W with export 0, not 750.5).

**ADVERSARIAL**: `p1={}` → 0 not NaN; `sungrow={}` → `solarToGrid` now fully
independent of Sungrow data (`solarToHome` NaN exposure is pre-existing and
untouched — no regression); `-0` does not leak; `-1e9` no overflow,
stroke-width clamps; floats exact; night-export comment present as required;
secrets sweep clean.

**VERDICT**: PASS, one non-blocking finding — mutant (d).

---

## Gap closure — AC3b

The Governor sent mutant (d) back to the Spec Author rather than logging it:
AC3b now pins dead-field independence **with the battery charging**
(`export_power_w` 0 vs 9999, `battery_power_w: +500`, deep-equal + explicit
`solarToBattery === 500` both times). Green-today regression lock; kills
mutant (d) by construction. Final count: **278 passed / 278**.

---

## Review Verdict (Reviewer hat, Fable)

**VERDICT**: APPROVE

**CHECKED** — the diff itself: the logic change is a single line, with the
sign-convention rationale, the HC-006 prohibition, the night-export attribution
limit, and the HC-003 guard all documented at the point of decision; the mock
rider is one value plus a comment explaining why the field stays in the shape;
no test file in the Builder's changes; gates re-run by the Reviewer directly
(lint 0/0, format clean, 278/278, 130.7 KB).

**FINDINGS**: none blocking.

**NOTES**
1. The D1 pin (AC1) now exists in this suite; RW-E20 owes its twin in Hestia's.
2. Process observation for the memory file: the Builder's self-review produced
   the AC10 class (NaN guard), the Builder's implementation surprise produced
   AC10g (string non-coercion), and the Verifier's mutation testing produced
   AC3b — **three of the strongest tests in this story came from workers
   reporting what the contract missed, each routed spec-first instead of being
   patched inline.** The pipeline's overhead paid for itself in this story.
3. Pre-existing exposures deliberately not absorbed: `solarToHome` NaN on a
   malformed Sungrow payload and the unguarded passthroughs — recorded for the
   RW-M04 contract draft to consider, since that story owns the honest-state
   treatment of malformed data.

**COMMIT**: recorded in `docs/REWORK_BACKLOG.md` with the story marked done.
