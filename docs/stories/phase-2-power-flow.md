# Phase 2: Power Flow

**Status**: Done
**Stories**: 3
**Completed**: 3
**Depends On**: Phase 1 (STORY-001 for scaffolding, STORY-003 for API client)

## Phase Completion Criteria
- [ ] All stories have status "done"
- [ ] All tests passing (`npx jest`)
- [ ] Lint clean (`npx eslint src/`)
- [ ] Documentation updated
- [ ] Power flow diagram renders with animated flows driven by real-time API data

## Stories

<story id="STORY-005" status="done" complexity="L" tdd="recommended">
  <title>SVG Power Flow Diagram Layout</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Create src/power-flow.js that renders an inline SVG diagram with four energy nodes
    in a diamond/cross arrangement per FE_design.md Component 1: Solar (top), Battery (left),
    Home (center), Grid (right). Each node is a rounded square (56-72px) with an SVG icon
    (not emoji — per project spec "No emojis in production"), a color-tinted background
    at ~10% opacity, and a power value placeholder.

    Connection lines between nodes represent energy paths:
    - Solar → Home (direct consumption)
    - Solar → Battery (charging)
    - Solar → Grid (export)
    - Grid ↔ Home (import/export)
    - Battery ↔ Home (charge/discharge)

    The layout must be responsive from 360px (phone) to 1024px+ (tablet/desktop).
    Use viewBox-based SVG scaling for responsiveness. Active nodes have a subtle
    radial glow effect to indicate they are currently producing/consuming energy.

    This is the hero element of the dashboard (Section A) — it must be visually prominent.
    Refer to docs/FE_design.md Component 1 for full specification.
  </description>
  <design_intent>DP-001 (Numbers First — power values are the largest text in each node), DP-003 (Flow Direction is Sacred — line placement must correctly represent physical energy paths), DP-004 (Glanceable Dashboard — visible without scrolling on mobile)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">SVG renders four nodes (Solar, Battery, Home, Grid) with SVG icons (not emoji)</ac>
    <ac id="AC2">Each node has a placeholder for power value text (e.g., "-- W")</ac>
    <ac id="AC3">Connection lines exist between all energy path pairs</ac>
    <ac id="AC4">Layout is responsive — nodes reposition correctly from 360px to 1024px+</ac>
    <ac id="AC5">Battery node shows SoC percentage placeholder</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>tests/power-flow.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test createPowerFlowSVG() returns an SVG element with correct node count
    - Test that all 5 connection paths are present
    - Test that node text elements exist for power values
    - npx jest tests/power-flow.test.js — all pass
  </test_plan>
  <notes>
    - Use SVG viewBox for responsive scaling (e.g., viewBox="0 0 600 400")
    - SVG icons: simple geometric representations (circle with rays for solar, rectangle for battery, house shape for home, lightning bolt for grid)
    - Keep SVG markup compact to stay within 200 KB payload budget
    - ADR-003: SVG chosen over Canvas for DOM accessibility and CSS animation support
  </notes>
</story>

---

<story id="STORY-006" status="done" complexity="M" tdd="recommended">
  <title>Animated Energy Flow Lines</title>
  <dependencies>STORY-005</dependencies>
  <description>
    Add CSS and JS animations to the power flow connection lines. Animated dashes flow
    in the direction of energy transfer. Line thickness (stroke-width) is proportional
    to power magnitude. Colors follow the specification:
    - Solar paths: var(--solar) (#F6B93B per FE_design.md)
    - Grid import: var(--grid-import) (#E17055 per FE_design.md)
    - Grid export: var(--grid-export) (#00B894 per FE_design.md)
    - Battery charge: var(--battery-charge) (#6C5CE7 per FE_design.md)
    - Battery discharge: var(--battery-discharge) (#A29BFE per FE_design.md)

    Lines with zero power flow are hidden (display: none or opacity: 0).
    Animations must be smooth — use CSS stroke-dashoffset animation for flow direction.
  </description>
  <design_intent>DP-003 (Flow Direction is Sacred — animation direction MUST match physical energy flow direction)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Flow lines animate in correct direction based on energy flow</ac>
    <ac id="AC2">Line thickness (stroke-width) scales with power magnitude</ac>
    <ac id="AC3">Colors use FE_design.md tokens: solar=var(--solar), grid-import=var(--grid-import), grid-export=var(--grid-export), battery-charge=var(--battery-charge), battery-discharge=var(--battery-discharge)</ac>
    <ac id="AC4">Animations are smooth (CSS stroke-dashoffset, GPU-accelerated)</ac>
    <ac id="AC5">Lines with zero flow shown as very faint dashed line at ~10% opacity (inactive state per FE_design.md)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test getFlowDirection(powerValue) returns correct direction string
    - Test getStrokeWidth(powerValue, maxPower) returns proportional width
    - Test getFlowColor(flowType) returns correct hex color
    - Test isFlowVisible(powerValue) returns false for zero
    - npx jest tests/power-flow.test.js — all pass
  </test_plan>
  <notes>
    - CSS animation: @keyframes flow { to { stroke-dashoffset: -20; } } for forward flow
    - Reverse: stroke-dashoffset: 20 for reverse direction
    - Max stroke-width should be capped (e.g., 8px) to prevent visual overflow
    - Min visible stroke-width: 1px for any non-zero flow
    - Inactive flows: very faint dashed line at ~10% opacity shows connection exists but no energy flowing. Active flows: ~3 second loop per flow cycle. Flow direction changes briefly flash brighter (~300ms) before settling.
  </notes>
</story>

---

<story id="STORY-007" status="done" complexity="M" tdd="required">
  <title>Real-time Data Binding for Power Flow</title>
  <dependencies>STORY-006, STORY-003</dependencies>
  <description>
    Connect the power flow diagram to real-time API data. Set up a 5-second polling
    interval in app.js that fetches P1 and Sungrow realtime data in parallel, computes
    energy flow values between nodes, and updates the SVG.

    Data mapping formulas (from project_idea.md Section A):
    - Solar → Home: min(pv_power_w, load_power_w)
    - Solar → Battery: pv_power_w - solar_to_home - solar_to_grid (when battery charging)
    - Solar → Grid: export_power_w (when positive and solar is producing)
    - Grid → Home: P1 import_power_w (when importing)
    - Battery → Home: abs(battery_power_w) when discharging (battery_power_w is negative)

    Sign conventions (CRITICAL — from Architecture.md):
    - P1 power_w: positive = importing, negative = exporting
    - Sungrow battery_power_w: positive = charging, negative = discharging
    - Sungrow export_power_w: positive = exporting, negative = importing

    Power values must be formatted: < 1000W show as "XXX W", >= 1000W show as "X.X kW".
  </description>
  <design_intent>DP-003 (Flow Direction is Sacred), DP-001 (Numbers First — formatted power values prominent in each node), DP-002 (Honest About Data Freshness — updates reflect latest data)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Power flow updates every 5 seconds with live (or mock) data</ac>
    <ac id="AC2">Solar to Home flow = min(pv_power_w, load_power_w)</ac>
    <ac id="AC3">Grid to Home flow = P1 import_power_w when importing</ac>
    <ac id="AC4">Battery to Home flow = abs(battery_power_w) when discharging (negative value)</ac>
    <ac id="AC5">Solar to Grid flow = export_power_w when positive and solar producing</ac>
    <ac id="AC6">Node values display formatted power (W for &lt;1000, X.X kW for &gt;=1000)</ac>
    <ac id="AC7">Battery node shows SoC percentage from Sungrow data</ac>
    <ac id="AC8">Sign conventions correctly applied per Architecture.md</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>src/app.js</file>
    <file>tests/power-flow.test.js</file>
  </allowed_scope>
  <test_first>
    <item>Create flow calculation tests in tests/power-flow.test.js FIRST</item>
    <item>Test: computeFlows(p1Data, sungrowData) returns correct flow object</item>
    <item>Test: solar-to-home = min(pv_power_w, load_power_w) with various values</item>
    <item>Test: battery discharging (negative battery_power_w) correctly maps to battery→home flow</item>
    <item>Test: grid importing (positive P1 power_w) correctly maps to grid→home flow</item>
    <item>Test: zero solar production results in no solar flows</item>
    <item>Test: formatPower(watts) returns "450 W" for 450 and "3.5 kW" for 3450</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - Unit tests for computeFlows() with fixture data covering all flow scenarios
    - Unit tests for formatPower() with various magnitudes
    - Test sign convention edge cases (all importing, all exporting, battery idle)
    - npx jest tests/power-flow.test.js — all pass
  </test_plan>
  <notes>
    - The 5-second polling is set up in app.js using setInterval
    - Fetch P1 and Sungrow realtime in parallel using Promise.all
    - computeFlows() is a pure function — easy to test
    - formatPower() helper belongs in src/utils.js (create if needed within allowed scope)
  </notes>
</story>

## Phase Notes

### Dependencies on Other Phases
- Phase 1 must provide: HTML skeleton (STORY-001), config (STORY-002), API client (STORY-003)

### Known Risks
- SVG performance on low-end mobile WebViews: mitigate with simple shapes, CSS animations over JS animations
- Sign convention errors: high impact — test thoroughly with all combinations

### Technical Debt
- Power flow layout may need adjustment after KPI strip is added below (Phase 3)
