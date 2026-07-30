# REWORK BACKLOG — wiring in the Lovable screens

Companion to `docs/BACKLOG.md` (Phases 1–5, all 16 stories `done`, closed
2026-02-15 — historical record, not rewritten). This file is the **live** task
list from 2026-07-30 onward: it turns the extraction plan E1–E7 of
`Architecture.md` into governed stories under the CLAUDE.md pipeline, and it
covers the ADR-012 maintenance lane that keeps the live dashboard honest until
decommission.

Authority: `Architecture.md` (ADRs + Hard Constraints) > `docs/FE_design.md` >
this file. `SKILL.md` binds every story. The Governor (PM hat) owns this file.

```xml
<backlog>

<metadata>
  <project>Energy Dashboard — Lovable screen extraction</project>
  <supersedes_as_active>docs/BACKLOG.md (Phases 1–5, complete)</supersedes_as_active>
  <created>2026-07-30</created>
  <last_updated>2026-07-30</last_updated>
  <total_stories>29</total_stories>
  <done>2</done>
  <progress>7%</progress>
  <changelog>
    <entry date="2026-07-30">RW-C02 done — 19 files staged locally, R12 closed. Staging surfaced 12 findings in the reference (lovable/MANIFEST.md F1–F12); the consequential ones are now ACs on RW-E16/E17/E18, and F1 is recorded as new risk R13.</entry>
    <entry date="2026-07-30">RW-M01 done — all four maintenance-lane gates green on main for the first time (lint 0/0, format clean, 265 tests, 130.7 KB build).</entry>
    <entry date="2026-07-30">Created from Architecture.md extraction plan E1–E7 + ADR-012 maintenance lane. Charting settled as Recharts (ADR-007 amendment 2), so chart stories are unblocked rather than pending a decision.</entry>
  </changelog>
</metadata>

<!-- ============================================================ -->
<!-- LANES — read Architecture.md §0 / CLAUDE.md §0 first          -->
<!-- ============================================================ -->

<lanes>
  <lane id="M" name="Maintenance" repo="this repo" path="src/" toolchain="npm · Jest · ESLint · scripts/build.js" governance="this repo's Governor">
    Only the four ADR-012-approved changes plus the gate cleanup they depend on.
    Every other file in src/ is frozen. Builders are spawned here.
  </lane>
  <lane id="C" name="Capture / donor" repo="this repo" path="docs/ + live API" toolchain="none (documentation)" governance="this repo's Governor">
    R1 contract capture and knowledge transfer. No src/ code.
  </lane>
  <lane id="E" name="Extraction" repo="/home/wlc3xkl/Personal-Assistant-App (Hestia)" path="src/features/energy/ (proposed)" toolchain="Hestia's Vite · Vitest · ESLint · npm" governance="HESTIA'S Governor">
    The port itself. **This repo's Governor tracks these stories but does not
    gate them and does not spawn Builders into Hestia's repo.** Each E-story is
    listed here because decommission (RW-E20) is gated on the set completing;
    the Story Contract for an E-story is drafted and executed under Hestia's
    CLAUDE.md, against Hestia's gates and its i18n rule.
  </lane>
</lanes>

<!-- ============================================================ -->
<!-- WHAT "WIRING IN THE SCREENS" MEANS                            -->
<!-- ============================================================ -->

<intent>
  <goal>
    The three Lovable screens (main dashboard, grid detail, capacity peak) run
    as a native /energy route inside the Hestia PWA, fed by live P1 + Sungrow
    data over same-origin requests, replacing the iframe embed — with the
    sign conventions correct, the three degradation states real, and no token
    ever in the client.
  </goal>
  <not_a_goal>Adopting the Lovable scaffold. ADR-010 discards TanStack, shadcn/ui, Radix, Bun, the SSR/Nitro output, the telemetry hooks, and ~44 dead runtime dependencies. `lovable/` is a read-only design reference — writing into it is a scope violation.</not_a_goal>
  <not_a_goal>Modernising the legacy artifact. It gets exactly four fixes (lane M) and is then switched off.</not_a_goal>
  <settled>
    Charting is **Recharts** (ADR-007 amendment 2, 2026-07-30): bundled never
    CDN, code-split behind the /energy route chunk, one chart library only,
    CHART_COLORS hex literals tokenised at port time. Chart stories therefore
    port the four welded views rather than rewriting them.
  </settled>
</intent>

<!-- ============================================================ -->
<!-- CONSTRAINTS IN FORCE (full text in Architecture.md)           -->
<!-- ============================================================ -->

<constraints>
  <constraint id="HC-002" ref="Architecture.md">No tokens in the client, in any form. Caddy injects Bearer tokens server-side; the client sends same-origin requests with the Hestia session cookie only. Token-handling code is forbidden outright.</constraint>
  <constraint id="HC-003" ref="Architecture.md">Graceful degradation: skeleton / stale / offline are mandated states, not edge cases. Never NaN or undefined rendered as data. Mock mode ships in production as the fallback of last resort.</constraint>
  <constraint id="HC-004" ref="Architecture.md">Dark mode only, scoped: the energy feature is a dark island inside light-themed Hestia. Tokens must not leak either direction.</constraint>
  <constraint id="HC-005" ref="Architecture.md">Static artifact, no server runtime. Budgets apply to the Hestia /energy route chunk, pinned at RW-E17 from the first real measurement.</constraint>
  <constraint id="HC-006" ref="Architecture.md">API contracts are captured, never guessed. An undocumented shape is a blocking escalation (`api_contract_unknown`).</constraint>
  <constraint id="DP-003" ref="Architecture.md">Flow direction is sacred — a wrong direction is worse than no data. Non-waivable review gate on every flow/balance story.</constraint>
</constraints>

<!-- ============================================================ -->
<!-- DEFINITION OF READY                                           -->
<!-- ============================================================ -->

<dor>
  <title>Definition of Ready</title>
  <checklist>
    <item>Lane identified (M / C / E) — and for E, confirmation that Hestia's Governor owns execution</item>
    <item>Acceptance criteria specific and testable; sign-convention invariants written as explicit numbered ACs by the Architect hat (never left for a worker to infer)</item>
    <item>Dependencies identified and complete — including "not blocked by R1"</item>
    <item>Allowed scope defined as a file list</item>
    <item>Every API field the story reads is documented in Architecture.md's API Integration section (HC-006)</item>
    <item>Mock counterpart defined for any new data path</item>
    <item>FE_design.md consulted for presentation stories; token names quoted, never hex</item>
    <item>Complexity noted (S/M/L/XL)</item>
  </checklist>
</dor>

<!-- ============================================================ -->
<!-- DEFINITION OF DONE                                            -->
<!-- ============================================================ -->

<dod>
  <title>Definition of Done</title>
  <checklist>
    <item>All acceptance criteria pass, evidenced by the Spec Author's tests (Builder never edits them)</item>
    <item>Lane gates green with real output — lane M: `npm run lint` (zero warnings), `npm run format`, `npm test`, `npm run build` under 200 KB; lane E: Hestia's lint / format / tsc --noEmit / vitest / build</item>
    <item>SIGN CONVENTION gate pass for any flow or balance story (non-waivable)</item>
    <item>DESIGN gate pass for presentation stories: tokens by name, 8px grid, 44×44px targets, prefers-reduced-motion, WCAG AA</item>
    <item>SECURITY gate pass: no CDN resource at all, no token-handling code, same-origin request targets only, no hardcoded IPs/URLs/secrets</item>
    <item>CHANGELOG header entry in every modified source file, with the story id</item>
    <item>Story log at docs/stories/&lt;ID&gt;.md shows every handoff, the Review Verdict, and the commit ref</item>
    <item>Verifier was a fresh session, and neither the Spec Author nor the Builder</item>
  </checklist>
</dod>

<!-- ============================================================ -->
<!-- PRIORITY ORDER / CRITICAL PATH                                -->
<!-- ============================================================ -->

<priority_order>
  <tier name="Truth in production (lane M, do first)" description="The live dashboard currently shows confidently wrong numbers. Small, pure-function fixes whose tests are E5 deliverables anyway.">
    <entry priority="1"  story="RW-M01" title="Clean the red gates on main" complexity="S" deps="None" lane="M" />
    <entry priority="2"  story="RW-M02" title="D1 — solar→grid flow from P1 power_w" complexity="M" deps="RW-M01" lane="M" />
    <entry priority="3"  story="RW-M03" title="D2 — energy balance off the dead export field" complexity="M" deps="RW-M01" lane="M" />
    <entry priority="4"  story="RW-M04" title="D3 — honest unavailable state on P1 series tabs" complexity="S" deps="RW-M01" lane="M" />
    <entry priority="5"  story="RW-M05" title="Hardening rider — delete bridge, require same-origin" complexity="M" deps="RW-M01" lane="M" />
  </tier>

  <tier name="Unblock (lane C, run in parallel — cheap and independent)" description="R1 is the single blocking unknown across both codebases.">
    <entry priority="6"  story="RW-C01" title="Capture the P1 /v1/series bucket contract" complexity="S" deps="None" lane="C" />
    <entry priority="7"  story="RW-C02" title="Stage the portable Lovable files locally (R12)" complexity="S" deps="None" lane="C" />
  </tier>

  <tier name="Foundation in Hestia (lane E)" description="Nothing renders until the design layer and primitives land.">
    <entry priority="8"  story="RW-E01" title="Hestia ADRs — native route + Recharts record" complexity="S" deps="None" lane="E" />
    <entry priority="9"  story="RW-E02" title="Port the design layer, scoped as a dark island" complexity="M" deps="RW-E01" lane="E" />
    <entry priority="10" story="RW-E03" title="Port primitives, AnimatedNumber, Skeletons" complexity="M" deps="RW-E02" lane="E" />
    <entry priority="11" story="RW-E04" title="Port the energy domain lib (React-free)" complexity="M" deps="RW-E01" lane="E" />
    <entry priority="12" story="RW-E05" title="Port the mock layer and the data-hook shape" complexity="M" deps="RW-E04" lane="E" />
  </tier>

  <tier name="Screens on mock (lane E)" description="Every screen renders end-to-end from mock-energy before any live byte flows.">
    <entry priority="13" story="RW-E06" title="Power flow hero (ADR-008)" complexity="L" deps="RW-E03, RW-E04" lane="E" />
    <entry priority="14" story="RW-E07" title="Status bar, offline banner, the three states" complexity="M" deps="RW-E03, RW-E05" lane="E" />
    <entry priority="15" story="RW-E08" title="KPI strip" complexity="M" deps="RW-E03, RW-E05" lane="E" />
    <entry priority="16" story="RW-E09" title="Energy balance card" complexity="M" deps="RW-E03, RW-E04" lane="E" />
    <entry priority="17" story="RW-E10" title="Cost stub" complexity="S" deps="RW-E03" lane="E" />
    <entry priority="18" story="RW-E11" title="Route wiring, code-split, i18n extraction" complexity="M" deps="RW-E06, RW-E07, RW-E08, RW-E09, RW-E10" lane="E" />
  </tier>

  <tier name="Live data (lane E)" description="Built once, here — the Lovable app never had a data layer.">
    <entry priority="19" story="RW-E12" title="Same-origin fetch client with schema validation" complexity="L" deps="RW-E05" lane="E" />
    <entry priority="20" story="RW-E13" title="Cadence, visibility gating, per-source backoff" complexity="L" deps="RW-E12" lane="E" />
    <entry priority="21" story="RW-E14" title="Cache-on-failure and staleness thresholds" complexity="M" deps="RW-E13" lane="E" />
  </tier>

  <tier name="Charts and detail screens (lane E, Recharts)" description="ADR-007 Option A — foundation once, then port the four welded views.">
    <entry priority="22" story="RW-E15" title="Chart foundation — token bridge, test harness, measurement, lever" complexity="M" deps="RW-E11, RW-E14" lane="E" />
    <entry priority="23" story="RW-E16" title="Power timeline (24h, dual axis)" complexity="L" deps="RW-E15" lane="E" />
    <entry priority="24" story="RW-E17" title="Monthly overview" complexity="S" deps="RW-E15" lane="E" />
    <entry priority="25" story="RW-E18" title="Capacity peak screen" complexity="L" deps="RW-E14, RW-E15" lane="E" />
    <entry priority="26" story="RW-E19" title="Grid detail — Live tab only" complexity="M" deps="RW-E14, RW-E15" lane="E" />
    <entry priority="27" story="RW-E20" title="Grid detail — Day/Month/Year (BLOCKED by RW-C01)" complexity="M" deps="RW-C01, RW-E19" lane="E" />
  </tier>

  <tier name="Close out" description="Knowledge must outlive this repo (R10) before it is archived.">
    <entry priority="28" story="RW-E21" title="Test and knowledge transfer into Hestia" complexity="M" deps="RW-E18, RW-E19" lane="E" />
    <entry priority="29" story="RW-E22" title="Cutover, iframe removal, decommission, archive" complexity="L" deps="RW-E21, RW-M02, RW-M03, RW-M04, RW-M05" lane="E" />
  </tier>
</priority_order>

<!-- ============================================================ -->
<!-- LANE M — MAINTENANCE (this repo, ADR-012)                     -->
<!-- ============================================================ -->

<story id="RW-M01" status="done" complexity="S" tdd="not-applicable" lane="M" model_lane="Opus" log="docs/stories/RW-M01.md">
  <title>Clean the red gates on main</title>
  <dependencies>None</dependencies>
  <description>
    Two of this repo's four gates are red on main, which makes every subsequent
    story's gate evidence unreadable. Fix them mechanically and nothing else.
    Inheriting a red gate is not permission to add to it.
  </description>
  <acceptance_criteria>
    <ac id="AC1">`npm run lint` exits zero with zero errors AND zero warnings. The two `P1Card` no-undef errors at src/app.js:191 and src/app.js:419 are resolved by adding `P1Card` to `.eslintrc.json` globals alongside the other IIFE module globals — not by editing app.js and not by disabling the rule inline.</ac>
    <ac id="AC2">The three `no-unused-vars` warnings in src/p1-card.js — `IMPORT_GLOW` (line 20), `EXPORT_GLOW` (line 22), `BG_CARD` (line 23) — are resolved by **deleting the dead constants**, not by disabling the rule. If any is intended for RW-M04's unavailable state, say so in the story log and keep it with a use.</ac>
    <ac id="AC3">`npm run format` passes. Prettier currently fails on **eight** files. The five that are ours (docker-compose.yml, index.html, src/app.js, src/charts.js, src/p1-card.js) are reformatted with `npm run format:fix` and no manual edits.</ac>
    <ac id="AC3b">The three under `lovable/` (types/energy.ts, lib/energy-format.ts, hooks/useEnergyData.tsx) are **not** reformatted — `lovable/` is added to `.prettierignore` instead, because a read-only design reference is not ours to restyle. If RW-C02 has already landed that ignore rule, this AC is satisfied by confirming it.</ac>
    <ac id="AC4">`npm test` still reports the full suite passing with the same test count as before the change — reformatting must not alter behaviour.</ac>
    <ac id="AC5">`npm run build` still produces dist/dashboard.html under 200 KB.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>.eslintrc.json</file>
    <file>.prettierignore</file>
    <file>docker-compose.yml (formatting only)</file>
    <file>index.html (formatting only)</file>
    <file>src/app.js (formatting only)</file>
    <file>src/charts.js (formatting only)</file>
    <file>src/p1-card.js (formatting only)</file>
  </allowed_scope>
  <out_of_scope>Any behavioural change. Any other src/ file. Test files.</out_of_scope>
  <notes>
    - No CHANGELOG entries for pure whitespace reflow; the .eslintrc.json change is noted in the commit body.
    - Verifier must confirm by diff that every src/ change is whitespace-only.
  </notes>
</story>

<story id="RW-M02" status="open" complexity="M" tdd="mandatory" lane="M" model_lane="Fable">
  <title>D1 — derive solar→grid flow from P1 power_w, not Sungrow export_power_w</title>
  <dependencies>RW-M01</dependencies>
  <description>
    `computeFlows` reads Sungrow `export_power_w`, which is always 0 on this
    inverter's WiNet-S firmware. The hero diagram therefore never renders a
    solar→grid line and silently hides all export activity — a direct DP-003
    violation on the dashboard's most prominent element.
  </description>
  <design_intent>DP-003 Flow Direction is Sacred. Architecture.md Sign Convention Reference.</design_intent>
  <acceptance_criteria>
    <ac id="AC1">With `p1.power_w = -2000` and `sungrow.export_power_w = 0`, `computeFlows` reports a **non-zero** solar→grid flow. This is the pinning invariant; it must also exist in Hestia's suite (RW-E04 / RW-E21).</ac>
    <ac id="AC2">Export magnitude is derived from `|p1.power_w|` when `p1.power_w &lt; 0`, and is zero when `p1.power_w &gt;= 0`.</ac>
    <ac id="AC3">With `p1.power_w = +1500`, solar→grid is exactly 0 and grid→home is 1500 W — direction never both ways at once.</ac>
    <ac id="AC4">`sungrow.export_power_w` is not read anywhere in src/power-flow.js after this story (grep-verifiable), and no other module starts reading it.</ac>
    <ac id="AC5">Battery convention unchanged and still pinned: `battery_power_w &gt; 0` = charging (home/solar→battery), `&lt; 0` = discharging (battery→home).</ac>
    <ac id="AC6">The 40 W active threshold and existing stroke-width/opacity scaling behaviour are unchanged.</ac>
    <ac id="AC7">Existing power-flow tests still pass; any test that encoded the old dead-field behaviour is identified in the story log as having encoded a defect, and its replacement is written by the Spec Author (not the Builder).</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>tests/power-flow.test.js (Spec Author only)</file>
    <file>tests/fixtures/ (Spec Author only, captured shapes only)</file>
  </allowed_scope>
  <out_of_scope>src/energy-balance.js (that is RW-M03), charts, p1-card, any rendering change beyond what the corrected flow values produce.</out_of_scope>
  <notes>Reference: Architecture.md ADR-012 maintenance item 1, defect table D1, risk R7.</notes>
</story>

<story id="RW-M03" status="open" complexity="M" tdd="mandatory" lane="M" model_lane="Fable">
  <title>D2 — energy balance must not derive import and export from the same dead field</title>
  <dependencies>RW-M01</dependencies>
  <description>
    `computeBalance` derives both export and import from
    `bucket.avg_export_power_w` — always 0. Export and import totals read
    0.0 kWh, which pins self-consumption and self-sufficiency at 100%. The card
    that most looks like money is the one that is most confidently wrong.
  </description>
  <design_intent>DP-002 Honest About Data Freshness; the card must not claim a perfect household.</design_intent>
  <acceptance_criteria>
    <ac id="AC1">On a fixture with real export activity, self-consumption is &lt; 100% and self-sufficiency is &lt; 100%.</ac>
    <ac id="AC2">Import and export are derived from distinct, P1-consistent inputs; `avg_export_power_w` is not read as authoritative anywhere in src/energy-balance.js (grep-verifiable).</ac>
    <ac id="AC3">Zero-production edge: a fixture with no solar yields self-sufficiency 0% (not NaN, not 100%).</ac>
    <ac id="AC4">Zero-consumption edge: a fixture with no load yields a defined, documented result — never NaN or Infinity rendered as data (HC-003).</ac>
    <ac id="AC5">Both ratios are clamped to 0–100 and the clamp is tested at both ends.</ac>
    <ac id="AC6">Energy conservation property holds on the fixtures: solar self-consumed + battery discharged + grid imported equals total consumption within a stated tolerance.</ac>
    <ac id="AC7">If the corrected derivation requires a P1 field this repo has never captured, the story STOPS with `api_contract_unknown` rather than inventing one (HC-006) — the fix must be expressible from documented fields plus the Sungrow day series.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/energy-balance.js</file>
    <file>tests/energy-balance.test.js (Spec Author only)</file>
    <file>tests/fixtures/ (Spec Author only, captured shapes only)</file>
  </allowed_scope>
  <out_of_scope>src/power-flow.js (RW-M02), the balance card's markup beyond value correctness.</out_of_scope>
  <notes>Reference: ADR-012 maintenance item 2, defect table D2. AC7 is the real risk in this story — flag it in the Story Contract, not after.</notes>
</story>

<story id="RW-M04" status="open" complexity="S" tdd="mandatory" lane="M" model_lane="Fable">
  <title>D3 — replace NaN bars with an honest unavailable state</title>
  <dependencies>RW-M01</dependencies>
  <description>
    The P1 card's Day/Month/Year tabs read invented series fields
    (`energy_import_kwh`, `avg_power_w`) from P1 buckets — the R1 contract was
    guessed — and render NaN bars. This story does **not** fix the data: the
    real contract is unknown and guessing it is what caused the bug. It replaces
    the NaN rendering with a defined unavailable state.
  </description>
  <design_intent>HC-003 (never NaN as data) and DP-002. The state is styled per FE_design.md's degradation treatment, not improvised.</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Selecting Day, Month, or Year renders a defined "data unavailable" state with an explanatory line, and never a chart, a bar, a zero series, or the strings "NaN" / "undefined".</ac>
    <ac id="AC2">Given a P1 series payload with the invented field names absent, the card renders the unavailable state rather than throwing.</ac>
    <ac id="AC3">Given a malformed or partial payload (null, empty array, missing buckets key), the card still renders the unavailable state — no unhandled exception reaches the console.</ac>
    <ac id="AC4">The Live tab is unaffected and continues to render from P1 realtime.</ac>
    <ac id="AC5">`computeDeltas` (src/p1-card.js) no longer reads `energy_import_kwh` or `avg_power_w`; no new field name is introduced (HC-006).</ac>
    <ac id="AC6">The unavailable state uses existing CSS custom properties by name — no literal hex — and meets WCAG AA contrast.</ac>
    <ac id="AC7">A comment at the gate names RW-C01 as the story that removes it, so the gate is not mistaken for permanent design.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/p1-card.js</file>
    <file>index.html (only if the unavailable state needs a container element)</file>
    <file>tests/p1-card.test.js (Spec Author only)</file>
  </allowed_scope>
  <out_of_scope>Any attempt to make the tabs work. Any guess at the P1 series shape. src/charts.js.</out_of_scope>
  <notes>Reference: ADR-012 maintenance item 3, defect D3, risk R1. Removed only when RW-C01 closes.</notes>
</story>

<story id="RW-M05" status="open" complexity="M" tdd="mandatory" lane="M" model_lane="Opus">
  <title>Hardening rider — delete the dead bridge and require same-origin</title>
  <dependencies>RW-M01</dependencies>
  <description>
    HC-002 as rewritten forbids token-handling code outright. The legacy
    artifact still carries a postMessage bridge listener and a URL-token
    fallback that served a Flutter host which does not exist in the production
    path, and validates base URLs by `https://` prefix only while the API client
    sends credentials to that host. Closing R6 by removal and R3 by tightening.
    This is the one maintenance story permitted to touch auth code — under
    escalation trigger 4, that permission is this story and nothing else.
  </description>
  <acceptance_criteria>
    <ac id="AC1">The postMessage listener and any token-from-message handling are deleted from src/config.js — deleted, not disabled, not commented out.</ac>
    <ac id="AC2">The URL-token fallback and any scrubbing logic (`history.replaceState` of a token param) are deleted. There is no code path by which a token enters the client.</ac>
    <ac id="AC3">Base-URL validation requires **same-origin**: a URL whose origin differs from `window.location.origin` is rejected, including an `https://` URL on a different host. Tested with at least: same-origin path, cross-origin https URL, protocol-relative URL, `javascript:` URL, and a URL whose host merely prefixes the expected one.</ac>
    <ac id="AC4">A rejected base URL degrades per HC-003 (defined state or mock fallback), never a blank screen and never a silent fetch to the rejected host.</ac>
    <ac id="AC5">`grep -rniE "token|bearer|authorization" src/` returns nothing that handles, stores, forwards, or logs a credential. Any surviving hit is listed in the story log with justification.</ac>
    <ac id="AC6">No secret, internal IP, LAN address, or Tailscale hostname appears in code, tests, fixtures, or the story log — the remote is public.</ac>
    <ac id="AC7">Existing config and api-client tests pass; tests asserting the deleted bridge behaviour are removed by the Spec Author as part of the spec, with the removal recorded.</ac>
    <ac id="AC8">CSP `connect-src` is left as the backstop, unchanged and explicitly not treated as the defence.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/config.js</file>
    <file>src/api-client.js (only where it consumes the validated base URL)</file>
    <file>tests/config.test.js (Spec Author only)</file>
    <file>tests/api-client.test.js (Spec Author only)</file>
  </allowed_scope>
  <out_of_scope>The Caddy configuration, docker-compose, the proxy itself, anything in the deployment path. Any change to how Caddy injects tokens server-side.</out_of_scope>
  <notes>Reference: ADR-012 maintenance item 4, ADR-009 amendment, HC-002 rewrite, risks R3 and R6. SECURITY gate is the primary gate on this story.</notes>
</story>

<!-- ============================================================ -->
<!-- LANE C — CAPTURE (this repo)                                  -->
<!-- ============================================================ -->

<story id="RW-C01" status="open" complexity="S" tdd="not-applicable" lane="C" model_lane="Fable">
  <title>Capture the P1 /v1/series bucket contract from the live API</title>
  <dependencies>None</dependencies>
  <description>
    R1 is the only blocking unknown in either codebase. No document defines the
    P1 `/v1/series` bucket field names; guessing them shipped D3 and the Lovable
    mock re-invented them as `GridBucket`. Capture the real response, record it,
    and unblock every grid-history feature. Cheap, independent of the port, and
    the highest-leverage item on this list.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Real responses captured for the day, month, and year granularities the UI needs, from the live P1 API.</ac>
    <ac id="AC2">Every bucket field recorded in Architecture.md's API Integration section with name, type, unit, and sign convention — including which field, if any, is authoritative for grid direction.</ac>
    <ac id="AC3">The Sungrow series bucket field names are re-verified in the same exercise and any drift from the documented shape is recorded.</ac>
    <ac id="AC4">The `GridBucket` invention in lovable/src/types/energy.ts is annotated as superseded by the captured shape — annotation only; lovable/ stays read-only reference and no code is ported from it here.</ac>
    <ac id="AC5">Fixtures for the maintenance-lane and Hestia suites are derived from the captured shape, with values scrubbed of anything identifying: **no raw meter dumps, no internal IPs, no hostnames, no Tailscale addresses** in the repo (public remote). Raw capture output stays in gitignored scratch.</ac>
    <ac id="AC6">R1 is marked closed in Architecture.md's Open Risks table, and RW-M04's D3 gate and RW-E20 are noted as unblocked.</ac>
    <ac id="AC7">The captured contract is written in a form transferable to Hestia verbatim in substance (RW-E21 / R10).</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>Architecture.md (API Integration, Open Risks)</file>
    <file>tests/fixtures/ (derived, scrubbed)</file>
    <file>docs/stories/RW-C01.md</file>
  </allowed_scope>
  <out_of_scope>Building anything on the captured contract. Any src/ change. Any credential in the repo.</out_of_scope>
  <notes>Reference: Architecture.md E7, risk R1, HC-006. Needs a live-API session — schedule it; it does not need the port.</notes>
</story>

<story id="RW-C02" status="done" complexity="S" tdd="not-applicable" lane="C" model_lane="Opus" log="docs/stories/RW-C02.md">
  <title>Stage the portable Lovable files locally before anything depends on them</title>
  <dependencies>None</dependencies>
  <description>
    Local `lovable/` currently holds only three staged files (types/energy.ts,
    lib/energy-format.ts, hooks/useEnergyData.tsx). The other ~2,300 portable
    lines the port is built on — PowerFlow.tsx, primitives.tsx, KpiStrip.tsx,
    mock-energy.ts, Skeletons.tsx, StatusBar.tsx, EnergyBalanceCard.tsx,
    CostStub.tsx, AnimatedNumber.tsx, and the four Recharts views — exist only
    in the Lovable cloud project. The design was declared "captured in ~2,300
    reviewed lines" (ADR-010 consequences), but those lines are captured in a
    vendor SaaS project, not in a repo we control. Every RW-E port story reads
    files that could vanish with an account, a credit balance, or a product
    decision. Fix that first; it is an afternoon's work.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Every file listed in Architecture.md's "Portable code (~13 files)" table is staged under `lovable/src/`, verbatim as the cloud project has it, with the same relative paths.</ac>
    <ac id="AC2">The four Recharts-welded views (PowerTimeline.tsx, MonthlyOverview.tsx, the grid.tsx charts, the peak.tsx chart) are staged too — they are the ADR-007 port target and the most expensive thing to lose.</ac>
    <ac id="AC3">`styles.css` is staged — it carries the token set, the six @utility blocks, and the motion vocabulary that RW-E02 ports.</ac>
    <ac id="AC4">Discarded material is **not** staged: no shadcn/ui components, no Radix, no server.ts/start.ts, no router.tsx/routeTree.gen.ts, no error-capture.ts, no lovable-error-reporting.ts, no vendor vite.config.ts/bunfig.toml/bun.lock, no components.json, no .lovable/, no robots.txt, no package.json from the vendor tree.</ac>
    <ac id="AC5">No credential, token, project id, internal IP, or hostname enters the repo with the staged files — the remote is public. Any such value in a staged file is stripped and the strip is noted in the file's header.</ac>
    <ac id="AC6">Each staged file gets a header stating: read-only design reference, ADR-010, do not import into src/, and the date staged.</ac>
    <ac id="AC7">`lovable/` is added to `.prettierignore` — the reference is not ours to reformat, and gating `npm run format` on vendor material is noise (this also resolves 3 of the 8 current format failures; see RW-M01).</ac>
    <ac id="AC8">A manifest at `lovable/MANIFEST.md` lists every staged file with its line count and its port destination story, so a future session can tell staged-and-complete from staged-and-partial.</ac>
    <ac id="AC9">Risk R12 marked closed in Architecture.md.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>lovable/ (staging only)</file>
    <file>lovable/MANIFEST.md</file>
    <file>.prettierignore</file>
    <file>Architecture.md (Open Risks — close R12)</file>
  </allowed_scope>
  <out_of_scope>Any src/ change. Any import of a staged file. Any edit to a staged file's logic. Re-opening the Lovable project as a build pipeline (DEC-05).</out_of_scope>
  <notes>
    Blocks nothing formally but precedes RW-E03, RW-E05, RW-E06, RW-E08,
    RW-E09, RW-E10, RW-E16, RW-E17, RW-E18, RW-E19 in practice — they all read
    files this story stages. Do it in the same sitting as RW-C01 if convenient.
  </notes>
</story>

<!-- ============================================================ -->
<!-- LANE E — EXTRACTION (Hestia's repo, Hestia's governance)      -->
<!-- Tracked here because RW-E22 (decommission) is gated on them.  -->
<!-- Story Contracts are drafted and executed under Hestia's       -->
<!-- CLAUDE.md, against Hestia's gates, thresholds, and i18n rule. -->
<!-- ============================================================ -->

<story id="RW-E01" status="open" complexity="S" lane="E" model_lane="Fable">
  <title>Hestia ADRs — accept the energy feature and record the Recharts decision</title>
  <dependencies>None</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Hestia ADR (a): the energy feature is accepted as a native /energy route — scope, the dark-island theming approach (HC-004 as amended), and the dependency additions it brings.</ac>
    <ac id="AC2">Hestia ADR (b): `recharts` accepted as the feature's one charting dependency, cross-referencing this repo's ADR-007 amendment 2. Records the binding conditions: bundled never CDN, code-split behind the route chunk, no second chart library, d3 transitive set is an owned audit surface, hex literals tokenised at port.</ac>
    <ac id="AC3">The `cn()` question is settled explicitly: local ~10-line helper, or `clsx` + `tailwind-merge` — recorded either way, not left to the first Builder.</ac>
    <ac id="AC4">The font question is settled: self-hosted DM Sans + JetBrains Mono woff2 subsets (est. 60–120 KB) versus Hestia's system stack for the energy island. Google Fonts CDN links are never ported, under either answer.</ac>
    <ac id="AC5">Both ADR logs cross-reference each other (R11 mitigation).</ac>
  </acceptance_criteria>
  <notes>Architecture.md E1. Answers open questions 5 and the cn() note in Tech Stack Scope B.</notes>
</story>

<story id="RW-E02" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Port the design layer, scoped so the dark island cannot leak</title>
  <dependencies>RW-E01</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Colour tokens from the Lovable `styles.css` `:root` ported into a scoped stylesheet under an `.energy` wrapper. Verified hex-identical to docs/FE_design.md.</ac>
    <ac id="AC2">The shadcn compatibility variable mapping is **not** ported.</ac>
    <ac id="AC3">Tailwind v4 `@utility` blocks ported: `num`, `label-caps`, `card-surface`, `card-hover`, `dimmed-stale`, `shimmer`.</ac>
    <ac id="AC4">Motion vocabulary ported with exact timings: shimmer-sweep 1.6s, flow-dash 3s, warn-pulse 2.4s, solar-glow 4s, rise-in 400ms cubic-bezier(0.22,1,0.36,1), battery fill 700ms, direction-flip flash 300ms, counter 400ms ease-out.</ac>
    <ac id="AC5">A global `prefers-reduced-motion` collapse disables all of the above; asserted by test, not by eye.</ac>
    <ac id="AC6">Leak test both directions: a Hestia light-theme page rendered adjacent to the energy island shows no energy token bleed, and the island shows no Hestia light token bleed.</ac>
    <ac id="AC7">No CDN font link, no external stylesheet, anywhere (ADR-007).</ac>
    <ac id="AC8">Grid-detail import/export colours are handled per the decision in DEC-01 — either promoted to named FE_design tokens or bound to the existing import/export tokens. No off-palette literal survives untokenised.</ac>
  </acceptance_criteria>
  <notes>Architecture.md E2, extraction inventory "Pure design information". ~80 lines of CSS carrying the interaction spec v1 never delivered.</notes>
</story>

<story id="RW-E03" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Port primitives, AnimatedNumber, and Skeletons</title>
  <dependencies>RW-E02</dependencies>
  <acceptance_criteria>
    <ac id="AC1">`AnimatedNumber` (+ `ValueUnit`, `usePrefersReducedMotion`) ported: rAF counter, cubic ease-out over ~400ms, reduced-motion collapse to an instant set. Tested with fake timers — numbers count, never snap (unless reduced motion).</ac>
    <ac id="AC2">`primitives.tsx` ported: Card, SectionHeading, StaleBadge, HistoricalBadge, SectionState, Shimmer, Pill.</ac>
    <ac id="AC3">`Skeletons.tsx` ported; each skeleton's layout matches the component it stands in for (no generic spinner).</ac>
    <ac id="AC4">Zero shadcn/Radix imports introduced — verified by grep. These files import nothing beyond React, `cn()`, the types, and the format lib.</ac>
    <ac id="AC5">Touch targets ≥ 44×44px on every interactive primitive; 8px spacing grid respected.</ac>
    <ac id="AC6">All ~40 hardcoded user-facing strings encountered in these files go through Hestia's i18n mechanism (Hestia HC-004), not inline literals.</ac>
  </acceptance_criteria>
  <notes>~330 lines total. Pure copy per the inventory.</notes>
</story>

<story id="RW-E04" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Port the energy domain lib — React-free, test-pinned</title>
  <dependencies>RW-E01</dependencies>
  <description>
    The sign conventions and flow/balance math go into a framework-free
    `lib/energy/` module. This is the highest-value test surface in the whole
    port and it must run without rendering anything.
  </description>
  <acceptance_criteria>
    <ac id="AC1">`types/energy.ts` ported with its sign-convention comments intact, including the note that Sungrow `export_power_w` exists upstream but is always 0 and is deliberately not modelled.</ac>
    <ac id="AC2">`energy-format.ts` ported; `CHART_COLORS` hex literals replaced by FE_design token references (the literal-hex violation is fixed at port, not later).</ac>
    <ac id="AC3">`computeFlows` ported **already correct**: solar→grid derived from `p1.power_w &lt; 0`, never from `export_power_w`. The D1 invariant is a test here: `p1.power_w = -2000` with `sungrow.export_power_w = 0` ⇒ non-zero solar→grid.</ac>
    <ac id="AC4">`computeBalance` ported already carrying the D2 correction, with the &lt;100% self-consumption/self-sufficiency pin on a real-export fixture.</ac>
    <ac id="AC5">Battery sign pinned: `battery_power_w &gt; 0` charging, `&lt; 0` discharging. Grid sign pinned: `p1.power_w &gt; 0` import, `&lt; 0` export.</ac>
    <ac id="AC6">Power-flow geometry constants preserved exactly: 340×286 viewBox, node coordinates, stroke `width = 1.5 + min(1, |W|/3500)·4.5`, `opacity = 0.35 + mag·0.6`, 40W active threshold, dashed-hint idle.</ac>
    <ac id="AC7">No React import anywhere in lib/energy/ — verified by grep.</ac>
    <ac id="AC8">Clamping and zero/NaN edges covered: no function can return NaN or Infinity for any input the API can produce.</ac>
  </acceptance_criteria>
  <notes>Architecture.md Testing Strategy "Ported"; the D1/D2 pins are shared with RW-M02/RW-M03 by design — double duty, not duplicated work.</notes>
</story>

<story id="RW-E05" status="open" complexity="M" lane="E" model_lane="Opus">
  <title>Port the mock layer and the data-hook shape</title>
  <dependencies>RW-E04</dependencies>
  <acceptance_criteria>
    <ac id="AC1">`mock-energy.ts` (~280 lines) ported: deterministic, pure TS, no randomness that makes a test flaky.</ac>
    <ac id="AC2">Mock mode reachable behind `?mock=true` and shipping in the production bundle as the HC-003 fallback of last resort — it is never tree-shaken out.</ac>
    <ac id="AC3">`useEnergyData` ported as a **shape only**: provider + context + `{data, isLoading, status, ageSeconds, lastUpdated}`, with the mock transport behind the same seam the live client will use (RW-E12).</ac>
    <ac id="AC4">The staged PORT NOTE's two gaps are recorded as RW-E13's scope and **not** faked here: no `Math.random()` drop simulator survives into the ported hook.</ac>
    <ac id="AC5">No component fetches its own data — every screen component stays presentational and prop-driven (grep: no fetch outside the data layer).</ac>
    <ac id="AC6">Mock mode works with no credential of any kind present.</ac>
  </acceptance_criteria>
  <notes>lovable/src/hooks/useEnergyData.tsx carries the PORT NOTE; lovable/src/lib/mock-energy.ts is the source.</notes>
</story>

<story id="RW-E06" status="open" complexity="L" lane="E" model_lane="Fable">
  <title>Power flow hero — inline SVG (ADR-008 realized)</title>
  <dependencies>RW-E03, RW-E04</dependencies>
  <acceptance_criteria>
    <ac id="AC1">`PowerFlow.tsx` ported as pure inline SVG driven entirely by `computeFlows` output props — no chart library, no dependency beyond React.</ac>
    <ac id="AC2">Solar, Battery, Home, Grid nodes render at the preserved coordinates; animated CSS dash flow on active lines; battery SoC fill; solar glow scaled by production.</ac>
    <ac id="AC3">Direction-flip flash (300ms) fires when grid direction changes sign, and is suppressed under prefers-reduced-motion.</ac>
    <ac id="AC4">**DP-003 test matrix**: importing (`power_w &gt; 0`), exporting (`power_w &lt; 0`), charging (`battery_power_w &gt; 0`), discharging (`battery_power_w &lt; 0`), and the D1 combination (`power_w = -2000`, `export_power_w = 0`) each render the correct set of directed flows and no opposing flow.</ac>
    <ac id="AC5">Idle behaviour: flows below the 40W threshold render as dashed hints, not as active lines.</ac>
    <ac id="AC6">Skeleton and stale variants render per RW-E03's primitives; stale dims without hiding, per HC-003.</ac>
    <ac id="AC7">Visible without scrolling on a 360px-wide viewport (DP-004), and the hero number is the largest element on screen (DP-001).</ac>
  </acceptance_criteria>
  <notes>ADR-008 survives unchanged from the morning revision — this story is that ADR realized in Hestia.</notes>
</story>

<story id="RW-E07" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Status bar, offline banner, and the three mandated states</title>
  <dependencies>RW-E03, RW-E05</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Sticky status bar: Live/Delayed/Offline dot, last-update time, quick battery % and solar kW.</ac>
    <ac id="AC2">Skeleton state: shimmer placeholders matching each section's layout on cold open, before the first payload.</ac>
    <ac id="AC3">Stale state: per-section warning-tinted badge naming the age ("Data from 45s ago"), content visible but dimmed — never hidden, never blank.</ac>
    <ac id="AC4">Offline state: top banner, last-known values retained and visibly framed as historical.</ac>
    <ac id="AC5">Thresholds are pinned by test at this story (the staged reference uses stale ≥12s / offline ≥40s since last success — confirm or change them here, with the chosen numbers asserted).</ac>
    <ac id="AC6">Every state is reachable in a test by controlling the clock and the transport — no manual inspection, no visual-only assertion.</ac>
    <ac id="AC7">No number is ever displayed without its source and age reachable (DP-002).</ac>
  </acceptance_criteria>
</story>

<story id="RW-E08" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>KPI strip — four cards</title>
  <dependencies>RW-E03, RW-E05</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Grid card: signed value with coral accent on import and green on export, driven by `p1.power_w` sign — asserted for both signs.</ac>
    <ac id="AC2">Battery card: SoC value + bar, warning pulse below 20%, pulse suppressed under prefers-reduced-motion.</ac>
    <ac id="AC3">Solar today card from `pv_daily_kwh`.</ac>
    <ac id="AC4">Month peak card, acting as the entry point to the capacity screen.</ac>
    <ac id="AC5">The two TanStack `<Link>` usages are swapped for Hestia's react-router `<Link>`; no TanStack import survives (grep).</ac>
    <ac id="AC6">Values animate via AnimatedNumber (~400ms ease-out), never snapping.</ac>
    <ac id="AC7">Each card is a ≥44×44px touch target where interactive, and reads correctly at 360px width.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E09" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Energy balance card — today</title>
  <dependencies>RW-E03, RW-E04</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Stacked source bar (flexbox, no chart library) with tap-to-reveal kWh figures.</ac>
    <ac id="AC2">Self-consumption and self-sufficiency pills, fed by the D2-corrected `computeBalance`.</ac>
    <ac id="AC3">On a fixture with real export, neither ratio shows 100% — the D2 pin, asserted at the component level too.</ac>
    <ac id="AC4">Zero-production and zero-consumption fixtures render defined states, never NaN, never "100%".</ac>
    <ac id="AC5">Summary line reads correctly in both a net-import and a net-export day.</ac>
    <ac id="AC6">60s cadence section; stale badge appears per RW-E07's thresholds.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E10" status="open" complexity="S" lane="E" model_lane="Fable">
  <title>Cost tracking stub</title>
  <dependencies>RW-E03</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Intentional "coming soon" card per the designed treatment — it must read as deliberate, not as a failed load.</ac>
    <ac id="AC2">No API call, no tariff data, no fabricated cost figure of any kind.</ac>
    <ac id="AC3">String goes through i18n like every other user-facing string.</ac>
  </acceptance_criteria>
  <notes>Belgian tariff API integration stays in the parking lot (no API key).</notes>
</story>

<story id="RW-E11" status="open" complexity="M" lane="E" model_lane="Opus">
  <title>Route wiring, code-split, and i18n extraction</title>
  <dependencies>RW-E06, RW-E07, RW-E08, RW-E09, RW-E10</dependencies>
  <acceptance_criteria>
    <ac id="AC1">`/energy` renders every main-dashboard section from `mock-energy.ts` end to end, inside the Hestia shell.</ac>
    <ac id="AC2">Route is code-split so the rest of the PWA does not pay for the feature (HC-005 / ADR-007 condition).</ac>
    <ac id="AC3">All ~40 hardcoded user-facing strings extracted to Hestia's i18n (Hestia HC-004); grep finds no inline user-facing literal in the feature.</ac>
    <ac id="AC4">Per-route SEO/OG meta blocks from the Lovable routes are deleted, not ported — pointless in an authenticated PWA.</ac>
    <ac id="AC5">No TanStack Router import anywhere; routes are Hestia's react-router routes.</ac>
    <ac id="AC6">Hestia's full gate set green: lint, format, `tsc --noEmit`, vitest, build.</ac>
    <ac id="AC7">CSP holds with `script-src 'self'` and no CDN. `style-src 'unsafe-inline'` (or `style-src-attr`) is documented as the known bounded weakness (R5), not silently widened further.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E12" status="open" complexity="L" lane="E" model_lane="Opus">
  <title>Same-origin fetch client with response schema validation</title>
  <dependencies>RW-E05</dependencies>
  <description>
    The live data layer is built once, here — the Lovable app never had one.
    HC-002 is the governing constraint: no token exists in this code.
  </description>
  <acceptance_criteria>
    <ac id="AC1">All requests go to same-origin paths (`/api/energy/*`, `/api/solar/*`) carrying only the Hestia session cookie. Caddy injects the Bearer tokens server-side; the client never sees one.</ac>
    <ac id="AC2">**No token-handling code of any kind**: no bridge, no URL-token read, no scrubbing, no storage, no logging of credentials. `grep -riE "token|bearer|authorization"` over the feature returns nothing that handles a credential (HC-002).</ac>
    <ac id="AC3">No configurable external base URL exists — there is no parameter by which the client can be pointed at another host.</ac>
    <ac id="AC4">Every response is schema-validated before it reaches the UI; a payload missing a required field yields a typed failure, not a partially-populated render.</ac>
    <ac id="AC5">Only fields documented in Architecture.md's API Integration section are read. `export_power_w` is not read (HC-006, and the field is always 0).</ac>
    <ac id="AC6">Malformed payload matrix tested: null body, empty object, wrong types, NaN in a numeric field, missing timestamp — each produces a defined degradation, never a NaN or `undefined` on screen (HC-003).</ac>
    <ac id="AC7">Mock and live sources sit behind the identical seam; switching between them changes no component.</ac>
    <ac id="AC8">No test touches the real network or a real service.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E13" status="open" complexity="L" lane="E" model_lane="Opus">
  <title>Cadence, visibility gating, and per-source backoff</title>
  <dependencies>RW-E12</dependencies>
  <description>
    The two behaviours the staged hook's PORT NOTE flags as missing, and which
    ADR-012 deliberately declines to retrofit into the legacy artifact. Fixed
    once, properly, here.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Cadence exactly as specified: 5s realtime, 60s balance, 5min timeline. Asserted with fake timers per source.</ac>
    <ac id="AC2">**Visibility gating**: polling pauses when `document.hidden` and resumes on visibility, with an immediate refresh on resume. A 5s poll must not run in a backgrounded PWA.</ac>
    <ac id="AC3">**Per-source exponential backoff**: consecutive failures escalate the interval (5s → 60s ceiling) independently per source, so a dead Sungrow does not slow P1 polling.</ac>
    <ac id="AC4">Backoff resets to base cadence on the first success — asserted, since a stuck backoff is the silent failure mode.</ac>
    <ac id="AC5">No `Math.random()` anywhere in the schedule logic; the clock is injectable and every timing assertion is deterministic.</ac>
    <ac id="AC6">Overlapping in-flight requests cannot pile up; a slow response does not stack timers.</ac>
    <ac id="AC7">Unmount clears every timer and aborts in-flight requests — no leak, no setState after unmount.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E14" status="open" complexity="M" lane="E" model_lane="Opus">
  <title>Cache-on-failure and staleness metadata</title>
  <dependencies>RW-E13</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Last-known-good values are retained on failure and served with staleness metadata (age since last success) — never dropped to empty (HC-003).</ac>
    <ac id="AC2">Age drives the Live/Stale/Offline state per the thresholds pinned in RW-E07; the transitions are asserted at the boundary values, not near them.</ac>
    <ac id="AC3">A total outage from cold open (no cached value ever) falls back to the deterministic mock as the last resort, clearly framed as such — not silently presented as live data.</ac>
    <ac id="AC4">Cached values never outlive their honesty: an offline banner plus historical framing is required whenever data is served from cache.</ac>
    <ac id="AC5">Degradation states are reachable in a test by killing the transport, and manually verifiable by killing the network in the browser — both recorded in the story log.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E15" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Chart foundation — token bridge, test harness, measurement, and the fallback lever</title>
  <dependencies>RW-E11, RW-E14</dependencies>
  <description>
    Recharts is decided (ADR-007 amendment 2), but its costs are **permanent
    rather than one-time**: colours must cross from CSS custom properties into
    JS props, `ResponsiveContainer` measures 0×0 under jsdom so naive chart
    tests assert against an empty SVG, and the bundle weight is real. Left
    implicit, each of the four view stories improvises its own answer and they
    drift. This story solves all of it once, before the first view exists.

    It is also where the ADR-007 over-budget lever is made concrete, so that
    "if the measurement is disproportionate the remedy is Recharts-side" is a
    pre-agreed procedure rather than a mid-port argument.
  </description>
  <acceptance_criteria>
    <ac id="AC1">**Token bridge, single source of truth.** One TS palette module holds every chart colour; the energy stylesheet's CSS custom properties are derived from it (or generated from it) rather than declared twice by hand. Recharts receives JS colour values from that module — no component contains a colour literal.</ac>
    <ac id="AC2">**A test asserts the palette and the CSS custom properties match**, so a future edit to one side fails the suite instead of silently drifting. This test is the price of Recharts needing JS colours; it is required, not optional.</ac>
    <ac id="AC3">`CHART_COLORS` from the Lovable `energy-format.ts` is fully absorbed into the palette module; the original hex literals (`#F6B93B`, `#6C5CE7`, `#A29BFE`, `#E17055`, `#00B894`, `#DFE6E9`, `#1E2A3A`, `#4A5568`, `#74B9FF`) appear nowhere in Hestia's source after this story — grep-verifiable. Each maps to a named FE_design token, and any that has no token counterpart is escalated to the Architect hat (DEC-01), not invented.</ac>
    <ac id="AC4">**`ResponsiveContainer` is mocked to a fixed-size element in `__tests__/setup.ts`**, so chart tests render measurable SVG under jsdom. The mock's dimensions are a named constant, not a magic number, and the mock is documented as a jsdom limitation workaround rather than a preference.</ac>
    <ac id="AC5">**The test contract for every chart story is stated here and reused**: real assertions belong on the pure data-shaping functions in `lib/energy/` (sign placement around zero, bucket mapping, empty/gap handling); chart-level tests only smoke-test that the expected series and axes rendered. A chart test that asserts on SVG path coordinates is a defect in the test, not a feature — DP-003 is proven upstream, per Architecture.md's "flow math stays in pure functions so DP-003 is enforced by unit tests, not visual inspection".</ac>
    <ac id="AC6">A demonstration test proves the harness works: a trivial chart rendered under the mocked container yields a non-empty SVG with the expected number of series elements. Without this, AC4 is unverified and every later chart test may be asserting against nothing.</ac>
    <ac id="AC7">**Shared chart chrome built once**: the custom multi-series tooltip, axis/grid defaults, the empty/stale/offline chart states (reusing RW-E03's primitives), and a `role="img"` + `aria-label` treatment with a visually-hidden data summary for screen readers. The four view stories consume these; none re-implements them.</ac>
    <ac id="AC8">**Reduced motion is handled centrally**: Recharts animates by default, so `isAnimationActive` is driven from `usePrefersReducedMotion()` in the shared layer rather than threaded through each view. Asserted in both states.</ac>
    <ac id="AC9">**Bundle measured here, at the first Recharts import — not after two views land.** Report the gzipped `/energy` route chunk with the Recharts + d3 share broken out, and confirm Hestia's entry chunk is unchanged in size (proof the code-split holds). The assessment's ~140 KB gz is an estimate; this is the measurement that closes R9.</ac>
    <ac id="AC10">**The route-chunk budget is pinned** in Hestia's tooling from AC9's number, and the gate fails when exceeded (HC-005). Pinned from the first real measurement, per HC-005's wording.</ac>
    <ac id="AC11">**The fallback lever is recorded as a decision, not a discussion.** If AC9's measurement is judged disproportionate, the pre-agreed remedy is Recharts-side per ADR-007: narrower imports, a nested lazy boundary around the chart cluster, or hand-rolling the monthly overview and the peaks chart (~170 lines of plain bars, with `SpendingBarChart.tsx` as the existing idiom). Record which lever was pulled, or that none was needed. The charting decision itself is not reopened.</ac>
    <ac id="AC12">**Nested lazy boundary around the chart cluster** so the power-flow hero and KPI strip paint before Recharts loads — DP-004 wants flow, SoC and solar glanceable without scrolling, and the charts sit below the fold. Hestia has no `lazy()`/`Suspense` precedent, so this story introduces the pattern: it ships with a skeleton fallback (RW-E03) and an error boundary, and both are tested.</ac>
    <ac id="AC13">Hestia's full gate set green: lint, format, `tsc --noEmit`, vitest, build.</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>the energy feature's chart palette module (new)</file>
    <file>the shared chart chrome: tooltip, axis defaults, states, a11y wrapper (new)</file>
    <file>__tests__/setup.ts (ResponsiveContainer mock)</file>
    <file>the energy stylesheet (custom properties derived from the palette)</file>
    <file>Hestia's bundle-budget configuration</file>
    <file>package.json / lockfile (the recharts addition itself)</file>
  </allowed_scope>
  <out_of_scope>Any of the four chart views — they are RW-E16, RW-E17, RW-E18, RW-E19. Any change to the pure functions in lib/energy/ (RW-E04 owns those). Reopening the Recharts decision.</out_of_scope>
  <notes>
    - Rationale for Recharts over Visx, recorded 2026-07-30: the correctness-critical
      logic lives outside the chart by design (RW-E04), which is where Visx's
      SVG-assertability advantage would have paid off; the ~520 existing lines make
      Recharts a ~1-day port against a ~3-day rewrite landing on the riskiest
      interaction; `stackOffset="sign"` is a library-verified primitive for exactly
      the diverging-stack case that D1/D2/D3 show this project gets wrong by hand;
      and visx v4 still needs package-manager configuration to satisfy React 19's
      peer range, which is an override to justify against a gated lockfile.
    - This story is the reason the four view stories can each stay small.
  </notes>
</story>

<story id="RW-E16" status="open" complexity="L" lane="E" model_lane="Fable">
  <title>Power timeline — 24h, dual axis (Recharts)</title>
  <dependencies>RW-E15</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Built on RW-E15's shared chart layer: palette module for colours, shared tooltip and axis defaults, central reduced-motion handling, mocked container in tests. This story adds no chart chrome of its own.</ac>
    <ac id="AC2">Solar / grid / battery areas render around a zero baseline; home load overlay; battery SoC curve on the secondary axis.</ac>
    <ac id="AC2b">**The grid series must NOT be ported as the reference computes it.** `lovable/MANIFEST.md` finding F1 / risk R13: the staged `PowerTimeline` derives grid from Sungrow (`avg_load_power_w − avg_pv_power_w + avg_battery_power_w`) rather than reading the authoritative P1 `power_w` — the same class of error as D1. A P1-sourced history series is entangled with R1, so this is an **escalation at port** (`api_contract_unknown`), not a copy. Shipping the inverter-derived series would put a number on screen that disagrees with the KPI strip beside it.</ac>
    <ac id="AC3">Signed series render on the correct side of zero for both grid directions and both battery directions — the DP-003 assertion applies to charts too.</ac>
    <ac id="AC4">Multi-series crosshair tooltip works and reports the correct series values at the hovered bucket.</ac>
    <ac id="AC5">Every colour comes from a token, not a `CHART_COLORS` hex literal (RW-E04 AC2 is a hard dependency here).</ac>
    <ac id="AC6">Empty, single-bucket, and gap-containing series render without throwing and without inventing interpolated data.</ac>
    <ac id="AC7">5min cadence; stale and offline treatments apply to the chart section like any other.</ac>
    <ac id="AC8">Reads only documented Sungrow series fields (HC-006).</ac>
  </acceptance_criteria>
</story>

<story id="RW-E17" status="open" complexity="S" lane="E" model_lane="Fable">
  <title>Monthly overview — paired daily bars</title>
  <dependencies>RW-E15</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Built on RW-E15's shared chart layer; adds no chart chrome of its own.</ac>
    <ac id="AC2">Paired daily bars for the current month; net-export days green; today emphasised.</ac>
    <ac id="AC3">Sign-stacked bars place net import and net export on the correct sides — asserted for a mixed-sign month. Uses Recharts' `stackOffset="sign"` **with a `stackId`** rather than a hand-computed diverging stack; hand-computing this is the D1/D2 error class waiting to happen.</ac>
    <ac id="AC3b">Do not inherit the reference's arrangement (`lovable/MANIFEST.md` F5): it sets `stackOffset="sign"` but gives neither Bar a `stackId`, so the offset is **inert** and direction comes from a pre-negated datum — which draws export days *upward* into the solar bar's half-plane, contradicts the card's own copy, and leaves colour as the only discriminator. The hardcoded corner radii encode the wrong assumption too.</ac>
    <ac id="AC3c">Null gate required (`lovable/MANIFEST.md` F5): the reference calls `row.solar.toFixed(1)` with no guard anywhere, so a missing field renders NaN and a null throws. HC-003 forbids both.</ac>
    <ac id="AC4">Colours from RW-E15's palette module only; no literal.</ac>
    <ac id="AC5">Empty month and single-day month render without throwing.</ac>
    <ac id="AC6">This is one of the two candidates for hand-rolling if RW-E15 AC11's lever is pulled — if it was, this story ships hand-rolled SVG in the `SpendingBarChart.tsx` idiom instead, and says so.</ac>
  </acceptance_criteria>
  <notes>Complexity dropped from M to S: the bundle measurement and budget pin moved to RW-E15, where they belong (first Recharts import, earliest signal).</notes>
</story>

<story id="RW-E18" status="open" complexity="L" lane="E" model_lane="Fable">
  <title>Capacity peak screen — the Belgian tariff view</title>
  <dependencies>RW-E14, RW-E15</dependencies>
  <description>
    The highest-value new screen: the Belgian capacity tariff bills on the
    highest 15-minute average import of the month, and nothing in the current
    product makes that legible.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Current monthly peak with timestamp, from P1 `/v1/capacity/month/{YYYY-MM}`.</ac>
    <ac id="AC2">Threshold gauge against the 2.5 kW Belgian residential reference, marker at 62.5% of a 4.0 kW scale, escalating `--success` → `--warning` → `--danger` at 75% and 100% of reference. All three bands asserted.</ac>
    <ac id="AC3">Live headroom from a client-side 15-minute rolling average of `import_power_w`, **labelled indicative** — it approximates the meter's quarter-hour alignment and must not claim to be the meter's own figure (DP-002).</ac>
    <ac id="AC3b">**The reference gets this wrong and must not be copied** (`lovable/MANIFEST.md` F3): it divides an *instantaneous* reading by a 15-minute-average peak and presents it unhedged as "You're at N% of this month's peak right now." Port the architecture's version — rolling average, labelled indicative — not the staged sentence.</ac>
    <ac id="AC3c">Guard the divide (`lovable/MANIFEST.md` F4): the reference guards `headroom` with `peakW > 0` but leaves the adjacent `toneFor(liveImportW / peakW)` unguarded, so on day one of a month the ratio is NaN and the gauge falls through to `--danger` — an alarming red beside a 0% reading. Assert the `peakW === 0` case renders a defined state in a calm tone.</ac>
    <ac id="AC4">`peaks[]` chart across the month with the bill-setting bar in coral, built on RW-E15's shared chart layer. This is the second candidate for hand-rolling if RW-E15 AC11's lever is pulled (~60 lines of plain bars).</ac>
    <ac id="AC4b">The threshold gauge is **not** a chart-library artifact — it is hand-rolled SVG or CSS, since no chart library helps with a single-value gauge and pulling one in for it would be waste.</ac>
    <ac id="AC5">Plain-language tariff explainer — no jargon, no fabricated euro amount.</ac>
    <ac id="AC6">Month rollover handled: the screen is correct on day 1 of a month with a nearly empty `peaks[]`, and mid-month.</ac>
    <ac id="AC7">Only documented capacity fields are read (HC-006); a missing or partial capacity payload degrades per HC-003.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E19" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Grid detail — Live tab only</title>
  <dependencies>RW-E14, RW-E15</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Large signed readout with correct import/export accent per `p1.power_w` sign.</ac>
    <ac id="AC2">Live area chart of the last ~5 minutes from a client-side ring buffer over the 5s realtime samples — no API exists for sub-minute history, and none is invented.</ac>
    <ac id="AC3">Import-above / export-below mirroring around zero, asserted for a sign change mid-buffer.</ac>
    <ac id="AC4">Ring buffer bounded and correct across wrap; no unbounded growth over a long session.</ac>
    <ac id="AC5">Day / Month / Year tabs are visible but render a defined "not yet available" state referencing the R1 capture — **no chart is built against the invented `GridBucket` shape** (HC-006).</ac>
    <ac id="AC6">Import/export colours per DEC-01's resolution; no untokenised off-palette literal.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E20" status="blocked" complexity="M" lane="E" model_lane="Fable" blocked_by="RW-C01">
  <title>Grid detail — Day / Month / Year tabs</title>
  <dependencies>RW-C01, RW-E19</dependencies>
  <acceptance_criteria>
    <ac id="AC1">Day, Month, and Year tabs render from the **captured** P1 series contract (RW-C01) — every field name traceable to Architecture.md's API Integration section.</ac>
    <ac id="AC2">Import-above / export-below mirroring per granularity.</ac>
    <ac id="AC3">Empty period, partial period, and all-export period render correctly and without NaN.</ac>
    <ac id="AC4">RW-E19's "not yet available" state is removed, and RW-M04's legacy D3 gate is noted as removable if the legacy artifact is still live.</ac>
  </acceptance_criteria>
  <notes>Do not start this story before RW-C01 closes. Starting it early is exactly how D3 shipped.</notes>
</story>

<story id="RW-E21" status="open" complexity="M" lane="E" model_lane="Fable">
  <title>Test and knowledge transfer into Hestia</title>
  <dependencies>RW-E18, RW-E19</dependencies>
  <description>
    R10: the sign conventions, the API contracts, and the R1 warning currently
    live only in a repo about to be archived. This story is the mitigation, and
    it is an exit criterion — not an afterthought.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Pure-logic assertions ported into Hestia's Vitest suite: sign-convention pins (including the D1 solar→grid invariant), balance edges, formatting thresholds, cadence/backoff schedules.</ac>
    <ac id="AC2">The **Sign Convention Reference** transferred into Hestia's documentation, verbatim in substance — including every field documented as existing but unreliable on this firmware.</ac>
    <ac id="AC3">The P1 and Sungrow endpoint contracts transferred, with the HC-006 discipline stated as a rule in Hestia, not as a story note.</ac>
    <ac id="AC4">The R1 history transferred: what was guessed, what it broke (D3, `GridBucket`), and what was captured.</ac>
    <ac id="AC5">Coverage ≥80% on the ported domain logic.</ac>
    <ac id="AC6">Hestia's documentation is independent of this repo — a reader with no access to Webview-energy-dashboard can maintain the feature.</ac>
  </acceptance_criteria>
</story>

<story id="RW-E22" status="open" complexity="L" lane="E" model_lane="Opus">
  <title>Cutover, iframe removal, decommission, archive</title>
  <dependencies>RW-E21, RW-M02, RW-M03, RW-M04, RW-M05</dependencies>
  <description>
    **This repo's Governor gates this story** even though it executes in
    Hestia — decommission is the one cross-repo gate (R11 mitigation).
  </description>
  <acceptance_criteria>
    <ac id="AC1">`EnergyDashboard.tsx`'s iframe replaced by the native `/energy` route.</ac>
    <ac id="AC2">Live verification in production: real flows render with correct direction, all three degradation states reachable, capacity screen correct.</ac>
    <ac id="AC3">`/embed/energy/*` Caddy route removed; the `energy-dashboard` container stopped.</ac>
    <ac id="AC4">Evidence recorded for each of AC1–AC3 — command output and observed behaviour, never "should work". Any failure triggers rollback immediately, then escalation; no debugging in production.</ac>
    <ac id="AC5">R8 closes with the container: the deploy-provenance mismatch is resolved by decommission, and the final state is recorded rather than assumed.</ac>
    <ac id="AC6">RW-E21 confirmed complete before archival — knowledge transfer is a precondition, not a follow-up.</ac>
    <ac id="AC7">This repo set read-only/archived, with story logs, ADRs, and the Sign Convention Reference intact and pushed to the public remote (the disaster-recovery copy of governance state).</ac>
  </acceptance_criteria>
</story>

<!-- ============================================================ -->
<!-- BLOCKED REGISTER                                              -->
<!-- ============================================================ -->

<blocked>
  <item story="RW-E20" by="RW-C01" reason="api_contract_unknown">
    P1 /v1/series bucket field names have never been captured. Guessing them
    shipped D3 in the legacy artifact and the Lovable mock re-invented them as
    `GridBucket`. No grid-history feature starts in any codebase until RW-C01
    closes.
  </item>
  <item story="RW-M04 (removal of the gate)" by="RW-C01" reason="api_contract_unknown">
    The D3 unavailable state is removed only when the real contract exists.
  </item>
</blocked>

<!-- ============================================================ -->
<!-- DECISIONS NEEDED (Governor: PM / Architect hats)              -->
<!-- ============================================================ -->

<decisions>
  <decision id="DEC-01" owner="Architect" needed_by="RW-E02" status="open">
    Grid-detail off-palette colours: promote import `#8B7BF0` / export `#00C9A7`
    to named FE_design.md tokens, or bind the grid screen to the existing
    import/export tokens. Either way no literal hex survives in component code.
  </decision>
  <decision id="DEC-02" owner="Architect" needed_by="RW-E01" status="open">
    Fonts: self-host DM Sans + JetBrains Mono woff2 subsets (est. 60–120 KB) in
    Hestia, or fall back to Hestia's system stack for the energy island. Google
    Fonts CDN links are never ported under either answer (ADR-007).
  </decision>
  <decision id="DEC-03" owner="Architect" needed_by="RW-E03" status="open">
    `cn()`: local ~10-line helper, or `clsx` + `tailwind-merge` as accepted
    dependencies. Usage in the energy components is simple concatenation.
  </decision>
  <decision id="DEC-04" owner="PM" needed_by="RW-C01" status="open">
    Schedule the live-API capture session. Independent of the port, cheap, and
    it unblocks the highest-value grid features.
  </decision>
  <decision id="DEC-05" owner="PM" needed_by="anytime" status="open">
    Lovable round-trip policy: if visual iteration through Lovable resumes,
    define the scratch-project workflow (component in, diff out) **before**
    anyone reopens the original project as a source of truth. The original
    project is a read-only reference, not a pipeline.
  </decision>
  <decision id="DEC-06" owner="Architect" needed_by="RW-E13" status="resolved">
    Legacy polling (forever-5s, no visibility gating, no backoff) is **accepted
    until retirement** — an efficiency defect, not a truthfulness one. Fixed
    once, properly, in Hestia at RW-E13. Not retrofitted (ADR-012).
  </decision>
  <decision id="DEC-07" owner="Architect" needed_by="done" status="resolved">
    Charting: **Recharts kept** (ADR-007 amendment 2, 2026-07-30) — bundled
    never CDN, code-split behind the /energy chunk, one chart library only,
    hex literals tokenised at port. Hestia records it locally at RW-E01.
  </decision>
  <decision id="DEC-08" owner="Architect" needed_by="done" status="resolved">
    **Recharts over Visx**, considered and closed 2026-07-30. Visx was the
    strongest alternative — CSS-class styling (no token bridge), far better
    tree-shaking, real SVG assertable under jsdom. Rejected because: (a) the
    correctness-critical logic lives outside the chart by design (RW-E04), which
    is exactly where Visx's assertability would have paid off; (b) ~520 working
    Recharts lines make this a ~1-day port versus a ~3-day rewrite landing on
    the riskiest interaction (the multi-series crosshair tooltip); (c)
    `stackOffset="sign"` is a library-verified primitive for the diverging-stack
    case that D1/D2/D3 prove this project gets wrong by hand; (d) visx v4 still
    needs package-manager configuration to satisfy React 19's peer range, an
    override to justify against a gated lockfile. Recharts' costs are permanent
    rather than one-time, so **RW-E15 exists to neutralise them once**: token
    bridge with a drift test, mocked container, early measurement, pre-agreed
    fallback lever. Canvas options (uPlot, Chart.js) were ruled out earlier on
    a11y, jsdom-testability and CSS-token grounds, not weight.
  </decision>
</decisions>

<!-- ============================================================ -->
<!-- PARKING LOT                                                   -->
<!-- ============================================================ -->

<parking_lot>
  <idea>Belgian Energy Tariff API integration — real cost figures replacing the RW-E10 stub (waiting for API key)</idea>
  <idea>Capacity-peak push notification when live headroom approaches the month's peak (the tariff makes this the highest-value alert in the product)</idea>
  <idea>MPPT1/MPPT2 per-string solar detail</idea>
  <idea>Lifetime PV generation statistics</idea>
  <idea>Daily battery charge/discharge kWh breakdown</idea>
  <idea>Year-over-year historical comparison</idea>
  <idea>CI for this repo — explicitly NOT worth building (ADR-011: archive-bound). Hestia's gates are the ones that outlive the transition</idea>
</parking_lot>

<!-- ============================================================ -->
<!-- LABELS                                                        -->
<!-- ============================================================ -->

<labels>
  <label name="truthfulness">Fixes data the dashboard currently states incorrectly — highest priority class</label>
  <label name="security">HC-002 / SKILL.md surface; SECURITY gate is the primary gate</label>
  <label name="port">Moves an asset from the Lovable reference into Hestia</label>
  <label name="domain">Sign conventions and energy math; SIGN CONVENTION gate non-waivable</label>
  <label name="presentation">FE_design.md conformance; DESIGN gate applies</label>
  <label name="blocked-r1">Cannot start until the P1 series contract is captured</label>
  <label name="cross-repo">Executes in Hestia; tracked here because decommission depends on it</label>
</labels>

</backlog>
```

---

## Related documents

- `Architecture.md` — ADRs, Hard Constraints, extraction plan E1–E7, Sign
  Convention Reference, Open Risks
- `CLAUDE.md` — §0 lane model, the six handoff contracts, gate sets per lane
- `docs/LOVABLE_INTEGRATION_ASSESSMENT.md` — the file-by-file evidence base
  behind ADR-010/011/012
- `docs/FE_design.md` — authoritative tokens, type scale, component anatomy
- `docs/REDESIGN_BRIEF.md` — the brief the Lovable screens were generated from
- `docs/BACKLOG.md` — Phases 1–5, complete; historical record
- `/home/wlc3xkl/Personal-Assistant-App/Architecture.md` — Hestia's
  architecture, authoritative for the extraction lane
