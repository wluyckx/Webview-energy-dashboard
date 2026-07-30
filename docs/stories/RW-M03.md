# RW-M03 — D2: energy balance must not derive import and export from the dead field

**Lane**: M (maintenance, this repo) · **Complexity**: M · **TDD**: mandatory
**Model lane**: Fable · **Branch**: `story/RW-M03-d2-energy-balance` (created at
pipeline start) · **Opened**: 2026-07-30 (contract drafted; pipeline starts
after RW-M02 merges — both Spec Authors would otherwise share a working tree)
**Closes**: defect D2 (ADR-012 item 2)

---

## Story Contract (PM hat; Architect hat authored the derivation and invariants)

**GOAL**: the balance card reports real import and export, so self-consumption
and self-sufficiency stop claiming a perfect household.

**THE DEFECT** (`src/energy-balance.js:37-41`):
```js
if (bucket.avg_export_power_w > 0) {
  totalExport += bucket.avg_export_power_w / 1000;
} else {
  totalImport += Math.abs(bucket.avg_export_power_w) / 1000;
}
```
Both totals derive from `avg_export_power_w` — the series average of the
always-0 firmware field. In production `totalExport = totalImport = 0`, so
`selfConsumption = (1 − 0/prod)·100 = 100` and
`selfSufficiency = (1 − 0/cons)·100 = 100`. The money-adjacent card is
confidently, permanently wrong.

**Why it shipped — same two masks as D1, recorded as evidence**: the existing
tests at `tests/energy-balance.test.js:50,56` pin the invented convention
("export from positive `avg_export_power_w`, import from negative"), and the
mock feeds non-zero values (−650 … +1500) for a field that is 0 on the real
firmware.

**THE FIX (Architect ruling — the derivation, decided not delegated):**
per-bucket signed grid from the conservation identity over **documented,
reliable fields only**:

```
gridSignedW(bucket) = avg_load_power_w − avg_pv_power_w + avg_battery_power_w
```

P1 sign convention throughout: **positive = import, negative = export**
(battery positive = charging adds to demand, which is why it is added). Split:
`grid > 0` → import bucket; `grid < 0` → export bucket; each `|grid|/1000` kWh
per hourly bucket, exactly as the module already converts.

- This is the architecturally sanctioned data path — the balance card is
  specified as "Sungrow series day → computeBalance" (Key Screens §4); no P1
  series exists to prefer (R1). "P1-consistent" in ADR-012 item 2 means
  sign-convention-consistent, not literally P1-sourced.
- It is the same identity the staged Hestia mock uses, so the two
  implementations will agree at RW-E20 test-transfer time.
- **Verified before drafting**: the mock's bucket values are internally
  conservation-consistent (e.g. hour with pv 50, load 800, battery −100 →
  signed grid +650, matching the mock's `avg_export_power_w: −650` under its
  invented positive=export convention). Consequence: mock-mode balance numbers
  are **unchanged** by this fix — the mock's fiction and the identity agree.
- `avg_export_power_w` must not be read anywhere in the module afterwards —
  reading a field Architecture.md records as unreliable is an automatic
  Verification FAIL (§2.3).

**ACCEPTANCE CRITERIA — numbered invariants:**

1. **The D2 pin**: a fixture with real export — buckets
   `[{pv 3000, load 800, battery 0} (grid −2200: exporting),
   {pv 0, load 1000, battery 0} (grid +1000: importing)]` ⇒
   `export = 2.2`, `import = 1.0`, and **both `selfConsumption < 100` and
   `selfSufficiency < 100`** (with production 3.0 and consumption 1.8:
   selfConsumption = (1 − 2.2/3.0)·100 ≈ 26.7; selfSufficiency =
   (1 − 1.0/1.8)·100 ≈ 44.4).
2. **The identity, exactly**: single-bucket fixtures —
   (a) `{pv 0, load 1000, battery 0}` ⇒ import 1.0, export 0;
   (b) `{pv 3000, load 800, battery 0}` ⇒ export 2.2, import 0;
   (c) `{pv 3000, load 800, battery +2200}` ⇒ import 0 **and** export 0
   (surplus fully charging: grid = 800 − 3000 + 2200 = 0);
   (d) `{pv 0, load 500, battery −1200}` ⇒ export 0.7 (battery discharge
   exceeding load exports: grid = 500 − 0 − 1200 = −700).
3. **Dead-field independence**: two calls identical except
   `avg_export_power_w ∈ {absent, 0, +9999, −9999}` return deep-equal results.
4. **Unchanged aggregations**: production = Σ pv/1000; consumption =
   Σ load/1000; batteryCharge from positive `avg_battery_power_w`;
   batteryDischarge from |negative|; all exactly as today.
5. **Zero edges preserved**: zero production ⇒ selfConsumption 0 (not NaN);
   zero consumption ⇒ selfSufficiency 100 (existing spec); empty series ⇒ all
   zeros, no throw. Both ratios clamped 0–100 (existing tests stay green).
6. **Malformed buckets degrade, never NaN** (the AC10 lesson from RW-M02,
   specified up front this time): a bucket with absent / undefined / NaN /
   non-numeric `avg_load_power_w`, `avg_pv_power_w` or `avg_battery_power_w`
   contributes **0 to every total** (skipped as unusable), and no output field
   is NaN. Fixture: `[good bucket, {avg_pv_power_w: NaN}, {}]` ⇒ totals equal
   the good bucket alone.
7. **Conservation property on mixed fixtures**: for any fixture in the spec,
   `selfConsumedSolar (= production − export) + batteryDischarge + import`
   equals `consumption + batteryCharge − …` — concretely, assert
   `production − export + import + batteryDischarge − batteryCharge ≈
   consumption` (tolerance 1e-9) on the AC1 fixture: the identity guarantees it
   bucket-by-bucket, and the test pins that nothing is double-counted.
8. **Mock rider**: the 16 `avg_export_power_w` values in `src/mock-data.js`
   series buckets are **left in place** (shape fidelity: if the real payload
   carries the field, the mock may too — R1's capture exercise re-verifies) but
   each series block gains one comment line stating the field is unreliable and
   never read. No mock *value* changes — AC-verified by mock-mode balance
   numbers being identical before/after (the conservation-consistency above).

**IN SCOPE**: `src/energy-balance.js` (the `computeBalance` body),
`src/mock-data.js` (comment lines only), `tests/energy-balance.test.js`
(Spec Author only).

**OUT OF SCOPE**: `src/charts.js:70` (D4 — its disposition is decided as an
ADR-012 amendment after this story proves the derivation), `src/power-flow.js`
(RW-M02), the render path (`renderBalance` — value correctness only),
`index.html`.

**BINDING CONSTRAINTS**: Sign Convention Reference (P1 convention: positive =
import), HC-003 (AC6), HC-006 (no invented field; the derivation uses only
documented fields), ADR-012 item 2, §2.3's unreliable-field FAIL rule.

**CONTEXT for the Spec Author**: `const EnergyBalance = (() => { ... })()` with
CommonJS export at the bottom — `require`-able directly, no DOM needed for
`computeBalance`. Existing tests: `tests/energy-balance.test.js`, describes at
lines 43–227. The tests at lines 50 and 56 pin the defective derivation and
must be **replaced** with `// REPLACED (RW-M03 ACn)` comments. The clamp,
zero-production, zero-consumption and empty-series tests (157–227) pin
behaviour this story preserves — they must stay green untouched.

---

## Spec Author deliverable (Sonnet 5)

*Pending — pipeline starts after RW-M02 merges.*

---

## Implementation Report (Builder, Opus 5)

*Pending.*

---

## Verification Report (Verifier, fresh Sonnet 5)

*Pending.*

---

## Review Verdict (Reviewer hat, Fable)

*Pending.*
