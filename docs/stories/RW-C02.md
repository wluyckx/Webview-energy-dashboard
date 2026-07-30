# RW-C02 — Stage the portable Lovable files locally

**Lane**: C (capture / donor, this repo) · **Complexity**: S · **TDD**: not-applicable
**Model lane**: Opus · **Branch**: `story/RW-C02-stage-design-reference`
**Opened**: 2026-07-30 · **Closed**: 2026-07-30 · **Closes**: risk R12

---

## Story Contract (PM hat)

**GOAL**: every file the port depends on exists in a repo we control, so the
design survives the Lovable project.

**ACCEPTANCE CRITERIA**: AC1–AC9 verbatim from `docs/REWORK_BACKLOG.md`.

**IN SCOPE**: `lovable/` (staging only), `lovable/MANIFEST.md`,
`.prettierignore`, `Architecture.md` (Open Risks).

**OUT OF SCOPE**: any `src/` change; importing a staged file; editing a staged
file's logic; re-opening the Lovable project as a build pipeline (DEC-05).

**BINDING CONSTRAINTS**: ADR-010 (what is discarded), HC-006 (invented shapes
are escalations), the public-remote secrets rule.

---

## Execution route — orchestrated

Three Opus Builder subagents on disjoint file sets, spawned in parallel, each
given the banner template, its port destinations, and an explicit list of
observations to gather (hex literals, non-allowed imports, `export_power_w`
reads, R1 field names, sign placement, jsdom hazards). Each was instructed to
write vendor content byte-identical below the banner and to touch nothing else —
no `src/`, no npm, no git.

| Agent | Files | Result |
|---|---|---|
| A | `PowerTimeline.tsx`, `MonthlyOverview.tsx` | 2 files, 266 vendor lines |
| B | `routes/index.tsx`, `routes/grid.tsx`, `routes/peak.tsx` | 3 files, 540 vendor lines |
| C | `lib/mock-energy.ts` | 1 file, 272 vendor lines |

The Governor staged the remaining files directly (`styles.css`, `utils.ts`,
`AnimatedNumber.tsx`, `primitives.tsx`, `PowerFlow.tsx`, `StatusBar.tsx`,
`Skeletons.tsx`, `CostStub.tsx`, `KpiStrip.tsx`, `EnergyBalanceCard.tsx`) and
retro-fitted banners onto the three files staged earlier during the assessment.

Delegation was the right call here on grounds other than speed: three
independent readers each auditing their own files against the same checklist
produced findings a single pass would have missed — F1, F3, F4 and F5 all came
from agents reading code the Governor never loaded.

---

## Implementation Report

**STATUS**: DONE

**AC EVIDENCE**

- **AC1 / AC2 / AC3** — 19 files staged: the full portable set from
  Architecture.md's "~13 files" table, the four Recharts-welded views, and
  `styles.css`. Inventory with line counts and port destinations in
  `lovable/MANIFEST.md`.
- **AC4 — nothing discarded was staged.** Verified by pattern sweep over
  `lovable/`: no `components/ui/`, no Radix, no `server.ts`/`start.ts`, no
  `router.tsx`/`routeTree.gen.ts`, no `error-capture.ts`, no
  `lovable-error-reporting.ts`, no vendor `vite.config.ts`/`bunfig.toml`/
  `bun.lock`, no `components.json`, no `.lovable/`, no `robots.txt`, no vendor
  `package.json`. Clean.
- **AC5 — no credentials or topology.** Swept the staged tree for bearer tokens,
  api keys, secrets, passwords, Tailscale addresses, `.ts.net`, `localhost`, and
  private IPv4 ranges: no matches. All three agents independently reported the
  same for their own files. The remote is public, so this is a security gate.
- **AC6 — banners.** Every one of the 19 files carries the standard
  read-only/ADR-010/port-destination banner; verified by grepping for the marker
  across the tree with zero misses. The three assessment-era files were
  retro-fitted.
- **AC7 — `.prettierignore`.** Already landed in RW-M01 with its rationale
  comment; confirmed present.
- **AC8 — manifest.** `lovable/MANIFEST.md` carries the file table with line
  counts and port destinations, the main-dashboard section order, the F1–F12
  findings, and the provenance record.
- **AC9 — R12 closed** in Architecture.md's Open Risks table.

**DEVIATIONS**

1. Staged `src/routes/index.tsx`, which is not in Architecture.md's
   "Portable code (~13 files)" table. Rationale: the inventory lists "Screen
   anatomy: … routes + components" as pure design information, and `index.tsx`
   *is* the main dashboard composition — the section order is design payload
   that exists nowhere else. Staged with its port destination marked
   "RW-E11 (anatomy only)" and its TanStack shell explicitly flagged as discard.
2. Recorded a new risk (R13) and added six acceptance criteria to RW-E16/E17/E18
   rather than only noting the findings in the manifest. Findings that change
   what a port story must do belong in the story, not in a reference document
   nobody re-reads.

**SELF-REVIEW**: the thing most likely to be wrong is byte-identity. Each agent
asserted it, and the banner is the only intended addition, but nothing
mechanically diffs the staged copy against the source — a `read_file` re-fetch
and compare would prove it. Left undone; noted here rather than claimed.

---

## Findings — recorded, not fixed

Twelve findings, full text in `lovable/MANIFEST.md`. The read-only rule means
none of them was fixed in place; each is bound to the port story that must
handle it. The four that change the plan:

- **F1 → risk R13, RW-E16 AC2b**: `PowerTimeline` derives grid direction from
  Sungrow rather than authoritative P1 `power_w`. Same class as D1. Not portable
  as written.
- **F3 → RW-E18 AC3b**: `peak.tsx`'s live headroom is instantaneous, not a
  15-minute rolling average, and is presented unhedged — contradicting both
  Architecture.md's description and DP-002.
- **F4 → RW-E18 AC3c**: unguarded `toneFor(liveImportW / peakW)` yields NaN on
  day one of a month and falls through to `--danger` — red gauge, 0% reading.
- **F5 → RW-E17 AC3b/AC3c**: `stackOffset="sign"` set without a `stackId`, so
  it is inert; direction comes from pre-negated data, drawing export upward, and
  there is no null gate anywhere in the file.

Also confirmed, and reassuring: **`export_power_w` appears zero times in the
entire staged set** — the dead field that caused D1 and D2 in the legacy artifact
was never read by the redesign. And `mock-energy.ts` is deterministic given an
injected `now`, so the test suite RW-E05 needs is achievable without touching it.

**F2 hardens R1 rather than adding to it**: `grid.tsx` imports `getGridBuckets`
from the mock module *directly into a production route*, bypassing the data seam,
and reads `import_kwh` / `export_kwh` without even importing `GridBucket` by
name. The invented contract is in production code, not just in a type. RW-E20
stays blocked on RW-C01.

---

## Verification Report

**GATES** (this story touches no `src/` code; the full set was run anyway to
prove no collateral damage)
```
npm run lint     → exit 0, zero errors, zero warnings
npm run format   → All matched files use Prettier code style!
npm test         → 8 suites, 265 tests, all passed
npm run build    → 133799 bytes (130.7 KB), within 200 KB budget
```
`lovable/` is prettier-ignored, so staging TypeScript that does not match this
repo's prettier config cannot turn the format gate red — which is the reason the
ignore rule exists.

**SCOPE AUDIT**: `git diff --stat` limited to `lovable/`, `docs/`,
`Architecture.md`. No file under `src/` changed. No `package.json` or lockfile
change — nothing was installed, and the staged TypeScript is never compiled by
this repo.

**SECURITY**: pass. Secrets sweep clean (AC5). No token-handling code introduced
— the staged `useEnergyData` contains no auth of any kind, consistent with
HC-002. No staged file is reachable from the build: `scripts/build.js` inlines
`src/` only, confirmed by the build still reporting 9 inlined scripts.

**HC-006**: three undocumented shapes recorded rather than absorbed —
`MonthlyDay`'s `solar_kwh`/`net_grid_kwh`, `p1.import_power_w`, and the R1
`GridBucket` fields. All are manifest findings and RW-C01 capture items, not
assumptions.

**VERDICT**: PASS

---

## Review Verdict (Reviewer hat)

**VERDICT**: APPROVE

**CHECKED**: the staged tree file by file for banner presence and port
destination; the AC4 discard sweep; the secrets sweep; that `src/` is untouched;
that the build still inlines 9 scripts; the three agents' reported findings
against the files they wrote, spot-checking `peak.tsx`'s gauge constants and
`grid.tsx`'s R1 field names against the claims; and the four gate outputs.

**FINDINGS**: none blocking. One follow-up worth doing when convenient: a
mechanical byte-identity check of each staged file against a fresh `read_file`,
which would upgrade the self-review's open question to evidence.
