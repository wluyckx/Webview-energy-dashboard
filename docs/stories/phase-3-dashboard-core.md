# Phase 3: Dashboard Core

**Status**: Not Started
**Stories**: 2
**Completed**: 0
**Depends On**: Phase 1 (STORY-003 for API client)

## Phase Completion Criteria
- [ ] All stories have status "done"
- [ ] All tests passing (`npx jest`)
- [ ] Lint clean (`npx eslint src/`)
- [ ] Documentation updated
- [ ] KPI strip and power timeline chart render with real-time data

## Stories

<story id="STORY-008" status="pending" complexity="M" tdd="recommended">
  <title>KPI Strip Cards</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create src/kpi-strip.js with four horizontal KPI cards per FE_design.md Component 2:
    1. "Grid Now" — current net power from P1 with coral/green left accent bar.
    2. "Battery" — SoC percentage with purple horizontal progress bar with glow at fill edge.
    3. "Solar Today" — daily production with amber accent.
    4. "Month Peak" — capacity peak with threshold progress bar.

    Cards use FE_design.md card anatomy: uppercase label (11px, --text-secondary), bold value
    (28px, data font), subtext with semantic color. Card styling: --bg-surface background,
    1px --border-subtle border, 12px border-radius, 3px rounded left accent bar.

    On mobile: horizontally scrollable or 2x2 grid.
    Cards update on the 5-second polling cycle (reuse the polling from STORY-007).
    Refer to docs/FE_design.md Component 2 for full specification.
  </description>
  <design_intent>DP-001 (Numbers First — the value is the largest element in each card), DP-004 (Glanceable Dashboard — KPIs visible without scrolling)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Four KPI cards render in a horizontal row below the power flow</ac>
    <ac id="AC2">"Now" card shows "Consuming X.X kW" or "Exporting X.X kW" based on P1 power_w sign</ac>
    <ac id="AC3">"Battery" card shows SoC percentage with a visual gauge</ac>
    <ac id="AC4">"Solar Today" card shows cumulative kWh from pv_daily_kwh</ac>
    <ac id="AC5">"Peak" card shows monthly capacity peak in kW</ac>
    <ac id="AC6">Cards stack vertically on narrow screens (&lt;400px)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/kpi-strip.js</file>
    <file>tests/kpi-strip.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test getNetPowerText(power_w) returns correct "Consuming/Exporting" string
    - Test formatKwh(value) returns formatted kWh string
    - Test getSocGaugePercent(soc) returns clamped 0-100 value
    - npx jest tests/kpi-strip.test.js — all pass
  </test_plan>
  <notes>
    - Sign convention: P1 power_w positive = importing/consuming, negative = exporting
    - Battery gauge can be a simple SVG arc or CSS-based horizontal bar
    - Peak data fetched once per page load (not every 5s)
    - Use CSS Grid or Flexbox for responsive card layout
  </notes>
</story>

---

<story id="STORY-009" status="pending" complexity="L" tdd="recommended">
  <title>Power Timeline Chart</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create Chart.js-based area/line chart in src/charts.js showing today's hourly power
    data. Multiple datasets:
    - Solar production: var(--solar) (#F6B93B) filled area above baseline
    - Battery charge/discharge: var(--battery-charge)/(--battery-discharge) area (above=charging, below=discharging)
    - Grid import/export: var(--grid-import) below / var(--grid-export) above baseline
    - Home consumption: var(--home) (#DFE6E9) line overlay

    Data source: Sungrow /v1/series?frame=day (hourly buckets).
    Interactive: tooltips show exact values on hover/tap.
    Updates every 5 minutes.
    Uses Chart.js loaded from jsDelivr CDN.
  </description>
  <design_intent>DP-001 (Numbers First — tooltips show exact values), DP-002 (Honest About Data Freshness — chart shows actual time range of data available)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Timeline chart renders with hourly data from Sungrow series (frame=day)</ac>
    <ac id="AC2">Solar shown as yellow filled area above baseline</ac>
    <ac id="AC3">Battery shown as purple area (above for charging, below for discharging)</ac>
    <ac id="AC4">Grid shown as red (import) / green (export) area</ac>
    <ac id="AC5">Home consumption shown as grey line overlay</ac>
    <ac id="AC6">Interactive tooltips show exact values on hover/tap</ac>
    <ac id="AC7">Chart updates every 5 minutes</ac>
    <ac id="AC8">Responsive — fills available width</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/charts.js</file>
    <file>tests/charts.test.js</file>
    <file>index.html</file>
    <file>src/app.js</file>
  </allowed_scope>
  <test_plan>
    - Test transformSeriesToDatasets(seriesData) returns correct Chart.js dataset format
    - Test that labels are formatted as time strings (e.g., "08:00", "09:00")
    - Test color assignments match specification
    - npx jest tests/charts.test.js — all pass
  </test_plan>
  <notes>
    - Chart.js loaded via CDN: https://cdn.jsdelivr.net/npm/chart.js
    - Use Chart.js time scale for x-axis if available, otherwise category labels
    - Dark theme: set Chart.js colors for axes, grid lines, legend text
    - ADR-002: Chart.js via CDN chosen for feature richness and caching
    - 5-minute update interval is separate from the 5-second realtime polling
    - Refer to docs/FE_design.md Component 4 for chart design: soft grid lines (dashed, --border-subtle), area fills with gradients fading to transparent, smooth curve interpolation, floating tooltip card with colored legend dots, no chart borders.
  </notes>
</story>

## Phase Notes

### Dependencies on Other Phases
- Phase 1 provides API client (STORY-003) for data fetching
- Power flow (Phase 2) occupies the hero section above these components

### Known Risks
- Chart.js CDN dependency: first load requires internet. Browser cache mitigates for subsequent loads.
- Chart.js dark theme integration: may need custom plugin for consistent styling

### Technical Debt
- Chart configuration may need refactoring when monthly overview is added (Phase 4, STORY-011)
