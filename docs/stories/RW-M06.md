# RW-M06 — D4: timeline grid series from the proven identity, not the dead field

**Lane**: M · **Complexity**: S · **TDD**: mandatory · **Model lane**: Fable
**Branch**: `story/RW-M06-d4-timeline-grid` · **Opened**: 2026-07-30
**Authorised by**: ADR-012 amendment of 2026-07-30 (maintenance item 4a)
**Closes**: defect D4 (the last open truthfulness defect in the legacy artifact)

---

## Story Contract

The six ACs live in `docs/REWORK_BACKLOG.md` (drafted with evidence under the
new rule). Supplementary evidence from reading `src/charts.js` at pipeline
start:

- The defect is in a **pure, already-tested function**:
  `transformSeriesToDatasets`, `gridData.push(bucket.avg_export_power_w / 1000)`
  (line 70) — the only change site. The grid dataset is `datasets[2]`, styled
  export-positive (`COLORS.gridExport` border).
- **The existing test at `tests/charts.test.js:50` pins the defective
  derivation** ("Grid dataset contains avg_export_power_w / 1000") against
  fixtures with invented non-zero values (600.5, 1200.0, 2200.0) — the same
  mask pattern as D1/D2. It must be REPLACED.
- Target derivation (ADR-012 item 4a):
  `(avg_pv_power_w − avg_load_power_w − avg_battery_power_w) / 1000` —
  export positive, import negative, preserving the chart's orientation. This is
  RW-M03's identity negated; the two must agree in magnitude and oppose in
  sign by construction.
- AC4 malformed-bucket ruling scoped precisely: non-finite pv/load/battery ⇒
  the **grid** point is `null` (Chart.js renders a gap; `spanGaps` is not
  enabled). The other three series keep their existing raw `/1000` behaviour —
  guarding them is new scope in a frozen file and is deliberately NOT this
  story (recorded, not smuggled).
- Numeric strings not coerced (AC10g/AC6b precedent).

---

## Pipeline record (slim log)

**Spec (Sonnet)** — 28 new AC-named tests + 1 defect-pin replaced. RED 27/333,
PM-reproduced, zero module errors. Two honest disclosures: the pre-existing
"handles multiple buckets" fixture coincides with the identity bit-for-bit
(annotated as non-discriminating for the D4 revert — the D1/D2 mask pattern,
caught rather than inherited); and the AS-IS pins on the three untouched
series were designed as a **scope trap** to detect a Builder guarding them.
Mock grid values independently computed: identity differs from the dead field
at 7 of 10 indices.

**Build (Opus)** — GREEN 360/360 first pass, one change site. The scope trap
held: solar/battery/home pushes byte-identical. Builder recorded (not acted
on) that the three raw series still push NaN for malformed buckets and the
shared tooltip callback is unguarded — routed to the parking lot below.
Self-review correctly identified the tooltip as the real residual, and was
honest that its safety argument is inference against an unpinned CDN Chart.js.

**Verify (fresh Sonnet)** — PASS. Scope exact. **All five mandatory mutants
killed**, including the orientation flip (killed by the cross-module bridge
executing RW-M03's fixtures through both modules — `chart.grid =
−balance.gridSignedW` exactly, zero-crossing agreeing at 0) and the coercion
mutant (killed by the numeric-string pin, as designed). Colour mapping
verified against FE_design semantics — and this fix is the first time the
import/export segment colours are exercised with real negative values.
Transform coverage 100%/100% on the changed function. Fixture coincidence
confirmed by recomputation. **Verifier corrected the Builder's risk claim**:
a null reaching the unguarded tooltip `toFixed` would be a NEW crash class
(TypeError) where the pre-existing NaN renders harmless text — safety rests on
unverifiable index-mode skip behaviour of the unpinned CDN Chart.js.

**Governor dispositions**
1. Tooltip risk: **accepted with follow-up**, not waved through as equivalent.
   Fixing it means refactoring the untestable options-builder in a frozen file;
   the exposure needs a malformed API bucket AND the skip assumption failing
   AND a hover on the gap. Parking-lot entry records it jointly with the
   Builder's three-unguarded-series finding as one HC-003-family candidate
   (promotion needs its own ADR-012 consideration).
2. Verifier's R13 caveat acknowledged: this repo now carries two structurally
   different grid sources — P1-authoritative realtime (hero diagram) and
   Sungrow-identity-derived series (balance card, timeline) — which will not
   tie out to the watt at an instant. Pre-authorised (ADR-012 item 4a), no
   P1-series alternative exists until R1 closes; documented, not hidden.

**Review Verdict (Fable): APPROVE.** Diff read: one guarded push, comments at
the point of decision, docblock updated, zero code reads of the dead field.
Gates re-run: lint 0/0, format clean, 360/360, 134.6 KB.

**Production consequence**: the timeline's grid line moves for the first time
— export above zero in green, import below in coral, gaps where data is
unusable. With this, **every ADR-012 truthfulness defect (D1–D4) is fixed**;
the legacy dashboard no longer displays a number it cannot defend.
