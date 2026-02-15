# Phase 4: Energy Analytics

**Status**: Not Started
**Stories**: 2
**Completed**: 0
**Depends On**: Phase 1 (STORY-003 for API client), Phase 3 (STORY-009 for charts module)

## Phase Completion Criteria
- [ ] All stories have status "done"
- [ ] All tests passing (`npx jest`)
- [ ] Lint clean (`npx eslint src/`)
- [ ] Documentation updated
- [ ] Energy balance calculations verified and monthly overview chart renders

## Stories

<story id="STORY-010" status="pending" complexity="M" tdd="required">
  <title>Today's Energy Balance</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create src/energy-balance.js that calculates and renders today's energy balance.
    Data source: Sungrow /v1/series?frame=day — hourly buckets summed to get daily totals.

    Metrics to display:
    - Solar produced (kWh): sum of avg_pv_power_w * hours
    - Self-consumed (kWh): production - export
    - Exported to grid (kWh): sum of positive avg_export_power_w * hours
    - Imported from grid (kWh): sum of negative avg_export_power_w * hours (abs value)
    - Battery charged (kWh): sum of positive avg_battery_power_w * hours
    - Battery discharged (kWh): sum of negative avg_battery_power_w * hours (abs value)

    Derived rates:
    - Self-consumption rate = 1 - (export_kwh / production_kwh) × 100%
    - Self-sufficiency rate = 1 - (import_kwh / consumption_kwh) × 100%

    Display as a horizontal stacked bar or donut chart with percentage indicators below.
    Updates every 60 seconds.

    Edge cases: handle division by zero (no production = 0% self-consumption,
    no consumption = 100% self-sufficiency).
  </description>
  <design_intent>DP-001 (Numbers First — rates displayed prominently), DP-002 (Honest About Data Freshness — show data time range)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Energy balance section shows solar produced, self-consumed, exported, imported, battery charged/discharged in kWh</ac>
    <ac id="AC2">Self-consumption rate calculated correctly as 1 - (export_kwh / production_kwh) × 100%</ac>
    <ac id="AC3">Self-sufficiency rate calculated correctly as 1 - (import_kwh / consumption_kwh) × 100%</ac>
    <ac id="AC4">Rates displayed as percentage indicators (large number + "%" + label)</ac>
    <ac id="AC5">Data sourced from Sungrow series (frame=day), hourly buckets summed</ac>
    <ac id="AC6">Updates every 60 seconds</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/energy-balance.js</file>
    <file>tests/energy-balance.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_first>
    <item>Create tests/energy-balance.test.js FIRST</item>
    <item>Test: calculateEnergyBalance(seriesData) returns correct kWh totals</item>
    <item>Test: self-consumption rate calculation with known values</item>
    <item>Test: self-sufficiency rate calculation with known values</item>
    <item>Test: zero production returns 0% self-consumption (not NaN/Infinity)</item>
    <item>Test: zero consumption returns 100% self-sufficiency</item>
    <item>Test: summing hourly bucket power values to kWh (power_w × 1h / 1000)</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - Unit tests for calculateEnergyBalance() with fixture data from tests/fixtures/sungrow-series-day.json
    - Edge case tests for zero production and zero consumption
    - Verify kWh conversion formula: avg_power_w × 1 hour / 1000
    - npx jest tests/energy-balance.test.js — all pass
  </test_plan>
  <notes>
    - Each hourly bucket represents 1 hour, so kWh = avg_power_w / 1000
    - Sign conventions for series data follow same rules as realtime
    - Sungrow avg_export_power_w: positive = exporting, negative = importing
    - Sungrow avg_battery_power_w: positive = charging, negative = discharging
    - Use Chart.js doughnut type or CSS-based stacked bar for visualization
  </notes>
</story>

---

<story id="STORY-011" status="pending" complexity="M" tdd="recommended">
  <title>Monthly Overview Bar Chart</title>
  <dependencies>STORY-009</dependencies>
  <description>
    Add a monthly overview grouped bar chart to src/charts.js showing daily production
    vs consumption for the current month. Data from Sungrow /v1/series?frame=month
    which returns daily buckets.

    Two bar series:
    - Production (avg_pv_power_w converted to kWh): yellow/amber bars
    - Consumption (avg_load_power_w converted to kWh): grey bars

    Loaded once on page load (no periodic polling).
    X-axis: day of month (1, 2, 3, ...).
    Y-axis: kWh.
  </description>
  <design_intent>DP-001 (Numbers First — axis labels show kWh values)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Bar chart renders daily production and consumption for current month</ac>
    <ac id="AC2">Data sourced from Sungrow /v1/series?frame=month (daily buckets)</ac>
    <ac id="AC3">Production bars in yellow/amber, consumption bars in grey</ac>
    <ac id="AC4">Loaded once on page load, no polling</ac>
    <ac id="AC5">Responsive — fills available width</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/charts.js</file>
    <file>tests/charts.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test transformMonthlyToBarData(seriesData) returns correct Chart.js bar dataset format
    - Test daily kWh conversion from hourly average power: daily avg_power_w × 24h / 1000
    - Test x-axis labels are day numbers
    - npx jest tests/charts.test.js — all pass
  </test_plan>
  <notes>
    - Daily buckets represent 24 hours, so daily kWh = avg_power_w × 24 / 1000
    - Use Chart.js bar chart type with grouped bars
    - Reuse Chart.js dark theme configuration from STORY-009
    - The monthly series endpoint returns one entry per day of the current month
  </notes>
</story>

## Phase Notes

### Dependencies on Other Phases
- Phase 1 provides API client (STORY-003)
- Phase 3 provides charts module (STORY-009) for Chart.js integration

### Known Risks
- Energy balance calculations depend on correct sign convention interpretation — high impact if wrong
- Monthly data may be sparse early in the month (few days of data)

### Technical Debt
- kWh conversion assumes regular hourly/daily buckets — if bucket sizes vary, calculation needs adjustment
