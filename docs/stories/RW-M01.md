# RW-M01 — Clean the red gates on main

**Lane**: M (maintenance, this repo) · **Complexity**: S · **TDD**: not-applicable
**Model lane**: Opus · **Branch**: `story/RW-M01-gate-cleanup`
**Opened**: 2026-07-30 · **Closed**: 2026-07-30

---

## Story Contract (PM hat, Fable-authored spec in `docs/REWORK_BACKLOG.md`)

**STORY**: RW-M01 — Clean the red gates on main

**GOAL**: `npm run lint`, `npm run format`, `npm test` and `npm run build` all
pass on `main`, so that every subsequent maintenance story's gate evidence is
readable rather than drowned in pre-existing noise.

**ACCEPTANCE CRITERIA**: AC1–AC5 plus AC3b, verbatim from
`docs/REWORK_BACKLOG.md`.

**IN SCOPE**: `.eslintrc.json`, `.prettierignore`, and formatting-only changes to
`docker-compose.yml`, `index.html`, `src/app.js`, `src/charts.js`,
`src/p1-card.js`.

**OUT OF SCOPE**: any behavioural change; any other `src/` file; test files;
tokenising the pre-existing hex literals in `src/p1-card.js` (legacy debt in a
frozen file — not this story's business).

**BINDING CONSTRAINTS**: ADR-012 (maintenance lane); the `src/` freeze outside
the four approved items; CLAUDE.md §3 gate set.

---

## Execution route — Governor, not Builder

Executed directly by the Governor under CLAUDE.md §1's trivial-fix allowance
("typo, config one-liner, prettier reflow are allowed when spawning an agent is
disproportionate — note them in the commit message"). This story is exactly that
case: one `.eslintrc.json` entry, one `.prettierignore` entry, three dead
constant deletions, and `prettier --write`. No Spec Author was spawned because
the story is `tdd="not-applicable"` — there is no behaviour to pin, and the
gates *are* the test. Recorded here so the deviation from the normal
Spec Author → Builder → Verifier route is visible rather than implicit.

---

## Implementation Report

**STATUS**: DONE

**CHANGES**
| File | Purpose |
|---|---|
| `.eslintrc.json` | Add `"P1Card": "readonly"` to globals |
| `.prettierignore` | Ignore `lovable/` with rationale comment |
| `src/p1-card.js` | Delete 3 dead constants; CHANGELOG entry; prettier reflow |
| `src/app.js` | Prettier reflow only |
| `src/charts.js` | Prettier reflow only |
| `index.html` | Prettier reflow only (inline CSS) |
| `docker-compose.yml` | Prettier reflow only (quote style) |

**AC EVIDENCE**

- **AC1 — lint zero errors and zero warnings.** `npm run lint` exits 0 with no
  output. Root cause confirmed before fixing: every IIFE module in `src/` uses
  the same `// eslint-disable-next-line no-unused-vars` + `var X = (function(){})()`
  pattern and is registered in `.eslintrc.json` globals — `P1Card` was added in
  commit `d5bb726` without its globals entry. Fixed by adding the entry
  (consistent with the other nine modules), not by editing `src/app.js` and not
  by an inline disable, as the AC required.
- **AC2 — the three warnings.** `IMPORT_GLOW` (was line 20), `EXPORT_GLOW`
  (line 22) and `BG_CARD` (line 23) each appeared exactly once in the file —
  their own declaration — so all three were genuinely dead and were deleted.
  **None is needed by RW-M04**: they are a glow pair for chart gradients and a
  card background, whereas RW-M04's unavailable state needs dim text/border
  treatment, and RW-M04 AC6 requires CSS custom properties rather than the hex
  literals these constants held.
- **AC3 — format passes.** `npm run format` → "All matched files use Prettier
  code style!". The five files that are ours were fixed with `npm run
  format:fix`; no manual edits.
- **AC3b — `lovable/` not restyled.** Added to `.prettierignore` with a comment
  explaining why: it is a read-only design reference (ADR-010) staged verbatim,
  and reformatting it would obscure the diff against the source it was captured
  from. This also pre-satisfies RW-C02 AC7.
- **AC4 — test count unchanged.** 8 suites, 265 tests, all passing — identical
  to the pre-change count, confirming the reflow altered no behaviour.
- **AC5 — build under budget.** 133,799 bytes (130.7 KB) against the 200 KB
  gate.

**GATES** (real output, 2026-07-30)
```
npm run lint     → exit 0, no output                (was: 2 errors, 3 warnings)
npm run format   → All matched files use Prettier code style!   (was: 8 files)
npm test         → 8 suites, 265 tests, all passed
npm run build    → 133799 bytes (130.7 KB), within 200 KB budget
```

**CHANGELOG**: `src/p1-card.js` carries a dated RW-M01 entry. `src/app.js`,
`src/charts.js`, `index.html` and `docker-compose.yml` received whitespace-only
reflow and therefore no changelog entry — recorded in the backlog notes as the
intended treatment.

**DEVIATIONS**: Governor-executed rather than Builder-executed (see above).
`.prettierignore` was not in the backlog's original allowed-scope list; it was
added when the measured gate output showed 8 failing files rather than the 5 the
story assumed, and AC3b was written into the backlog to cover it before the work
was done.

**SELF-REVIEW**: The riskiest change is the prettier pass over
`docker-compose.yml`, since YAML indentation is semantic and that file describes
the live deployment. Verified rather than assumed — see below.

---

## Verification Report

**GATES**: as above, all four green.

**SEMANTIC-EQUIVALENCE AUDIT** (this story's substitute for a TDD audit, since
there is no new behaviour to pin):

- `git diff -w --ignore-blank-lines -- src/` reviewed line by line. Every
  surviving change is line rewrapping, string-concatenation splitting, callback
  expansion, or array expansion. The only non-formatting changes in `src/` are
  the CHANGELOG line and the three dead-constant deletions.
- One change deserved a second look: prettier rewrote
  `curr.avg_power_w * 1 / 1000` as `(curr.avg_power_w * 1) / 1000` in
  `computeDeltas`. `*` and `/` are left-associative and equal precedence, so the
  parenthesised form is identical — prettier added clarifying parens, nothing
  more. Noted because this is the D3 defect code path: `avg_power_w` is an
  invented P1 series field and RW-M04 removes this path entirely.
- `docker-compose.yml`: the diff is double-quote → single-quote on two scalars.
  Verified by parsing both revisions with PyYAML and comparing the resulting
  structures — **identical**. The container port binding and
  `CSP_CONNECT_HOSTS` value are unchanged.
- `index.html`: 28 lines, all inline-CSS reflow. Grepped the diff for `csp`,
  `content-security`, `script`, `src=` and `id=` — no matches, so no CSP
  directive, script reference or element id was touched.

**SIGN CONVENTION**: not applicable — no flow, balance or sign-reading logic was
modified. The three deleted constants are colours.

**DESIGN**: not applicable — no visual change. The inline CSS was reflowed, not
altered; the rendered rules are byte-equivalent in effect.

**SECURITY**: pass. No token-handling code added or touched (HC-002). No new
network target. No secret, private IP, Tailscale address or credential
introduced — `.prettierignore` and `.eslintrc.json` contain neither.
`docker-compose.yml`'s CSP host value is unchanged and was already public. The
legacy CSP's `unsafe-inline` + `cdn.jsdelivr.net` weakness is untouched and
remains accepted until decommission (ADR-002 / Build & Deployment).

**ADVERSARIAL**: confirmed the lint fix is not a suppression — reverting the
`.eslintrc.json` line reproduces both original errors, so the entry is load
bearing. Confirmed the deleted constants are unreferenced by grepping the whole
repo, not just their own file. Confirmed the build still inlines 9 scripts, so
no module was dropped from the bundle by the formatting pass.

**VERDICT**: PASS

---

## Review Verdict (Reviewer hat)

**VERDICT**: APPROVE

**CHECKED**: the full diff by hand rather than the reports — `.eslintrc.json`
against the nine existing module globals; the three deletions against a
whole-repo grep; every `src/` hunk for behaviour change; `docker-compose.yml`
via parsed-YAML comparison; `index.html` for CSP/script/id lines; and all four
gate outputs as captured text rather than claims.

**FINDINGS**: none blocking.

**NOTE FOR THE PM HAT**: the story assumed 5 failing format files; the measured
number was 8, because the three staged `lovable/` files are also unformatted.
That is a PM defect in the story as drafted, not a Builder deviation — the
backlog was amended (AC3b) before the work rather than after, and
`docs/REWORK_BACKLOG.md` now records the ignore rule in both RW-M01 and
RW-C02 AC7.

**COMMIT**: see `status="done"` entry in `docs/REWORK_BACKLOG.md`.
