<backlog>

<metadata>
  <project>Energy Dashboard</project>
  <last_updated>2026-02-15</last_updated>
  <total_stories>16</total_stories>
  <done>0</done>
  <progress>0%</progress>
  <changelog>
    <entry date="2026-02-15">Incorporated FE_design.md: added STORY-016 (Status Bar), updated colors/typography refs, dark-mode-only, added accessibility requirements</entry>
    <entry date="2026-02-15">Initial backlog creation (15 stories across 5 phases)</entry>
  </changelog>
</metadata>

<!-- ============================================================ -->
<!-- MVP DEFINITION                                                -->
<!-- ============================================================ -->

<mvp>
  <goal>Deliver a single-file HTML dashboard that shows real-time power flow, KPI cards, and a power timeline chart, with mock data support for development without live APIs.</goal>

  <scope>
    <item priority="1" story="STORY-001 through STORY-007">Power Flow Diagram (Section A) — SVG power flow with animated energy lines and real-time data binding</item>
    <item priority="2" story="STORY-008">KPI Strip (Section B) — four horizontal KPI cards showing current power, battery SoC, solar today, and peak capacity</item>
    <item priority="3" story="STORY-009">Power Timeline (Section D) — Chart.js area/line chart showing today's hourly power data</item>
    <item priority="4" story="STORY-010">Energy Balance (Section C) — today's energy balance with self-consumption and self-sufficiency rates</item>
  </scope>

  <deliverables>
    <item>Single-file dist/dashboard.html (< 200 KB) with all CSS and JS inlined</item>
    <item>Mock data mode (mock=true URL parameter) for development without live APIs</item>
    <item>Responsive layout from 360px phone to 1024px+ tablet/desktop</item>
  </deliverables>

  <post_mvp>
    <item>Monthly Overview (Section F) — daily production vs consumption bar chart for current month</item>
    <item>Cost Dashboard (Section E) — Belgian Energy tariff API integration for running cost and projected bill</item>
    <item>Flutter WebView integration — postMessage bridge for secure token delivery and refresh</item>
  </post_mvp>
</mvp>

<!-- ============================================================ -->
<!-- KEY CONSTRAINTS                                               -->
<!-- ============================================================ -->

<constraints>
  <constraint id="HC-001" ref="Architecture.md">Single-file delivery (< 200 KB, all CSS+JS inline)</constraint>
  <constraint id="HC-002" ref="Architecture.md">Secure credential delivery (tokens via WebView postMessage bridge; URL params for non-sensitive config only)</constraint>
  <constraint id="HC-003" ref="Architecture.md">Graceful degradation (never blank screen)</constraint>
  <constraint id="HC-004" ref="Architecture.md">Dark mode only — no light theme (FE_design.md: "Calm Control Room")</constraint>
</constraints>

<!-- ============================================================ -->
<!-- DEFINITION OF READY                                           -->
<!-- ============================================================ -->

<dor>
  <title>Definition of Ready</title>
  <description>A story is ready for development when ALL conditions are true:</description>
  <checklist>
    <item>Clear description of what needs to be built</item>
    <item>Acceptance criteria are specific and testable</item>
    <item>Dependencies are identified and completed</item>
    <item>Technical approach is understood</item>
    <item>Estimated complexity noted (S/M/L/XL)</item>
    <item>Allowed Scope defined (files/modules)</item>
    <item>Test-First Requirements defined (if TDD-mandated)</item>
    <item>Mock strategy defined for external dependencies</item>
    <item>Design intent noted for presentation stories (ref Architecture.md Design Principles)</item>
    <item>FE_design.md consulted for presentation stories (colors, typography, component anatomy)</item>
  </checklist>
</dor>

<!-- ============================================================ -->
<!-- DEFINITION OF DONE                                            -->
<!-- ============================================================ -->

<dod>
  <title>Definition of Done</title>
  <description>A story is complete when ALL conditions are true:</description>
  <checklist>
    <item>All acceptance criteria pass</item>
    <item>npx eslint src/ passes with zero warnings</item>
    <item>npx prettier --check . passes</item>
    <item>npx jest passes with no failures</item>
    <item>Documentation on all public APIs</item>
    <item>CHANGELOG header updated in modified files</item>
    <item>No undocumented TODOs introduced</item>
    <item>Security checklist passed (per CLAUDE.md section 13)</item>
    <item>Design principles respected (per Architecture.md Design Principles)</item>
    <item>Visual output matches docs/FE_design.md for presentation stories (colors, typography, spacing)</item>
    <item>Accessibility: prefers-reduced-motion respected, WCAG AA contrast, 44x44px touch targets</item>
    <item>Code reviewed (self-review minimum)</item>
  </checklist>
</dod>

<!-- ============================================================ -->
<!-- PRIORITY ORDER                                                -->
<!-- ============================================================ -->

<priority_order>
  <tier name="Foundation" description="Core infrastructure required by everything else">
    <entry priority="1" story="STORY-001" title="Project Scaffolding and HTML Skeleton" complexity="M" deps="None" />
    <entry priority="2" story="STORY-002" title="URL Parameter Configuration Module" complexity="S" deps="STORY-001" />
    <entry priority="3" story="STORY-003" title="API Client with Authentication" complexity="M" deps="STORY-002" />
    <entry priority="4" story="STORY-004" title="Mock Data System" complexity="S" deps="STORY-002" />
  </tier>

  <tier name="Power Flow" description="SVG power flow diagram with animated energy lines and real-time data">
    <entry priority="5" story="STORY-005" title="SVG Power Flow Diagram Layout" complexity="L" deps="STORY-001" />
    <entry priority="6" story="STORY-006" title="Animated Energy Flow Lines" complexity="M" deps="STORY-005" />
    <entry priority="7" story="STORY-007" title="Real-time Data Binding for Power Flow" complexity="M" deps="STORY-006, STORY-003" />
  </tier>

  <tier name="Dashboard Core" description="KPI cards and timeline chart for at-a-glance monitoring">
    <entry priority="8" story="STORY-008" title="KPI Strip Cards" complexity="M" deps="STORY-003" />
    <entry priority="9" story="STORY-009" title="Power Timeline Chart" complexity="L" deps="STORY-003" />
  </tier>

  <tier name="Energy Analytics" description="Energy balance calculations and monthly overview">
    <entry priority="10" story="STORY-010" title="Today's Energy Balance" complexity="M" deps="STORY-003" />
    <entry priority="11" story="STORY-011" title="Monthly Overview Bar Chart" complexity="M" deps="STORY-009" />
  </tier>

  <tier name="Integration and Polish" description="Error handling, Flutter bridge, responsive design, and cost stub">
    <entry priority="12" story="STORY-012" title="Cost Dashboard Stub" complexity="S" deps="STORY-001" />
    <entry priority="13" story="STORY-013" title="Error Handling and Staleness Indicators" complexity="M" deps="STORY-007, STORY-008" />
    <entry priority="14" story="STORY-014" title="Flutter WebView Integration" complexity="M" deps="STORY-007" />
    <entry priority="15" story="STORY-015" title="Responsive Design and Dark Mode Polish" complexity="M" deps="STORY-008, STORY-009, STORY-010" />
    <entry priority="16" story="STORY-016" title="Status Bar Component" complexity="S" deps="STORY-013" />
  </tier>
</priority_order>

<!-- ============================================================ -->
<!-- PHASE 1: Foundation                                           -->
<!-- Story file: docs/stories/phase-1-foundation.md                -->
<!-- ============================================================ -->

<phase id="1" name="Foundation" story_file="docs/stories/phase-1-foundation.md">

<story id="STORY-001" status="pending" complexity="M" tdd="recommended">
  <title>Project Scaffolding and HTML Skeleton</title>
  <dependencies>None</dependencies>
  <description>
    Create the project structure with package.json (dev deps only), ESLint/Prettier configs, Jest config, index.html skeleton with dark theme CSS custom properties, and the build script that inlines src/ files into a single dist/dashboard.html.
  </description>
  <design_intent>DP-001 (Numbers First), DP-004 (Glanceable Dashboard) — establish layout hierarchy</design_intent>
  <acceptance_criteria>
    <ac id="AC1">npm install succeeds with jest, eslint, prettier as dev dependencies</ac>
    <ac id="AC2">index.html loads in browser with dark theme background and placeholder sections for all 6 dashboard areas (A-F)</ac>
    <ac id="AC3">npx eslint src/ passes with zero warnings</ac>
    <ac id="AC4">npx prettier --check . passes</ac>
    <ac id="AC5">node scripts/build.js produces dist/dashboard.html with all JS/CSS inlined</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>package.json</file>
    <file>.eslintrc.json</file>
    <file>.prettierrc</file>
    <file>jest.config.js</file>
    <file>index.html</file>
    <file>src/app.js</file>
    <file>scripts/build.js</file>
    <file>dist/</file>
  </allowed_scope>
  <test_plan>
    - Verify npm install completes without errors
    - Verify npx eslint src/ passes with zero warnings
    - Verify npx prettier --check . passes
    - Verify node scripts/build.js runs without errors and produces dist/dashboard.html
    - Verify index.html renders placeholder sections in browser
  </test_plan>
  <notes>
    - Dev dependencies only — no production dependencies
    - Build script must inline all JS and CSS into a single HTML file
    - Dark theme CSS custom properties set as defaults
  </notes>
</story>

<story id="STORY-002" status="pending" complexity="S" tdd="required">
  <title>URL Parameter Configuration Module</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Create src/config.js that parses URL parameters (p1_base, sungrow_base, p1_device_id, sungrow_device_id, mock) and receives tokens (p1_token, sungrow_token) via WebView bridge postMessage with URL fallback for dev. Missing required params show a clear error message in the dashboard.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Config module parses URL parameters (p1_base, sungrow_base, p1_device_id, sungrow_device_id, mock) and receives tokens via postMessage bridge</ac>
    <ac id="AC2">Missing required parameters (base URLs, tokens, device IDs) displays a user-friendly error in the dashboard</ac>
    <ac id="AC3">Optional parameters have defaults (mock=false). Tokens accepted via bridge or URL fallback with immediate scrubbing.</ac>
    <ac id="AC4">URL parameter values are type-validated (URLs must start with https://, device IDs non-empty, tokens non-empty strings)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/config.js</file>
    <file>tests/config.test.js</file>
  </allowed_scope>
  <test_first>
    <item>Create tests/config.test.js FIRST</item>
    <item>Write tests for valid params, missing params, malformed URLs, defaults</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - npx jest tests/config.test.js — all pass
  </test_plan>
  <notes>
    - URL parameters: p1_base, sungrow_base, p1_device_id, sungrow_device_id, mock
    - Tokens (p1_token, sungrow_token): via WebView bridge postMessage, URL fallback for dev (scrubbed immediately)
    - Required: p1_base, sungrow_base, p1_device_id, sungrow_device_id, p1_token, sungrow_token
    - Optional with defaults: mock=false
  </notes>
</story>

<story id="STORY-003" status="pending" complexity="M" tdd="required">
  <title>API Client with Authentication</title>
  <dependencies>STORY-002</dependencies>
  <description>
    Create src/api-client.js with functions to fetch from P1 and Sungrow APIs. All requests use Bearer token auth. Implements 30s timeout, error handling, last-known value caching. Returns cached data on failure.
  </description>
  <acceptance_criteria>
    <ac id="AC1">fetchP1Realtime(config) returns parsed JSON from P1 /v1/realtime?device_id={id}</ac>
    <ac id="AC2">fetchSungrowRealtime(config) returns parsed JSON from Sungrow /v1/realtime?device_id={id}</ac>
    <ac id="AC3">fetchSungrowSeries(config, frame) returns parsed JSON from Sungrow /v1/series?device_id={id}&amp;frame={frame}</ac>
    <ac id="AC4">fetchP1Capacity(config, month) returns parsed JSON from P1 /v1/capacity/month/{YYYY-MM}?device_id={id}</ac>
    <ac id="AC5">fetchP1Series(config, frame) returns parsed JSON from P1 /v1/series?device_id={id}&amp;frame={frame}</ac>
    <ac id="AC6">checkP1Health() and checkSungrowHealth() return health status from /health endpoints (no auth)</ac>
    <ac id="AC7">All authenticated requests include Authorization: Bearer token header</ac>
    <ac id="AC8">Failed requests (network error, timeout, non-200) return last-known cached value</ac>
    <ac id="AC9">30-second fetch timeout implemented via AbortController</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/api-client.js</file>
    <file>tests/api-client.test.js</file>
    <file>tests/fixtures/p1-realtime.json</file>
    <file>tests/fixtures/sungrow-realtime.json</file>
    <file>tests/fixtures/sungrow-series-day.json</file>
    <file>tests/fixtures/p1-capacity.json</file>
  </allowed_scope>
  <test_first>
    <item>Create tests/api-client.test.js FIRST</item>
    <item>Mock global fetch</item>
    <item>Write tests for success, timeout, error, caching scenarios</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - npx jest tests/api-client.test.js — all pass
  </test_plan>
  <notes>
    - Create JSON fixture files in tests/fixtures/ matching API response shapes from project_idea.md
    - Bearer token auth on all requests
    - Last-known value cache per endpoint
  </notes>
</story>

<story id="STORY-004" status="pending" complexity="S" tdd="recommended">
  <title>Mock Data System</title>
  <dependencies>STORY-002</dependencies>
  <description>
    Create src/mock-data.js that provides realistic mock API responses (from project_idea.md mock data section). When mock=true URL parameter is set, the API client returns mock data instead of making real API calls.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Mock module exports MOCK_P1_REALTIME, MOCK_SUNGROW_REALTIME, MOCK_SUNGROW_SERIES_DAY, MOCK_P1_CAPACITY matching the shapes from project_idea.md</ac>
    <ac id="AC2">When config.mock is true, API client functions return mock data without network requests</ac>
    <ac id="AC3">Mock data timestamps are dynamically generated (today's date)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/mock-data.js</file>
    <file>tests/mock-data.test.js</file>
    <file>src/api-client.js</file>
  </allowed_scope>
  <test_plan>
    - npx jest tests/mock-data.test.js — verify mock data matches expected API response shapes
  </test_plan>
  <notes>
    - Mock data values should be realistic (e.g., solar producing during daytime hours)
    - Timestamps must be dynamically generated so data never looks stale
    - Modification of src/api-client.js to integrate mock data path
  </notes>
</story>

</phase>

<!-- ============================================================ -->
<!-- PHASE 2: Power Flow                                           -->
<!-- Story file: docs/stories/phase-2-power-flow.md                -->
<!-- ============================================================ -->

<phase id="2" name="Power Flow" story_file="docs/stories/phase-2-power-flow.md">

<story id="STORY-005" status="pending" complexity="L" tdd="recommended">
  <title>SVG Power Flow Diagram Layout</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Create src/power-flow.js that renders an SVG diagram with four nodes in a diamond/cross arrangement per FE_design.md: Solar (top), Battery (left), Home (center), Grid (bottom). Each node is a rounded square (56-72px) with a color-tinted background at ~10% opacity and an SVG icon (not emoji). Power value text below each node. Layout responsive from 360px to 1024px+ using viewBox scaling. Active nodes have a subtle radial glow in their energy color. Refer to docs/FE_design.md Component 1 for full specification.
  </description>
  <design_intent>DP-001 (Numbers First — power values are prominent), DP-003 (Flow Direction is Sacred), DP-004 (Glanceable)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">SVG renders four nodes (Solar, Battery, Home, Grid) with SVG icons</ac>
    <ac id="AC2">Each node has a placeholder for power value text (e.g., "-- W")</ac>
    <ac id="AC3">Connection lines exist between nodes (Solar to Home, Solar to Battery, Solar to Grid, Grid to/from Home, Battery to/from Home)</ac>
    <ac id="AC4">Layout is responsive — nodes reposition correctly from 360px to 1024px+</ac>
    <ac id="AC5">Battery node shows SoC percentage placeholder</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>tests/power-flow.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test that SVG creation functions produce valid SVG elements with correct structure
    - Verify four nodes and five connection paths are created
    - Verify placeholder text elements exist on each node
  </test_plan>
  <notes>
    - Use pure SVG (no external libraries) to stay within single-file constraint
    - SVG icons, not emoji, for Solar, Battery, Home, Grid
    - Responsive via viewBox and relative positioning
  </notes>
</story>

<story id="STORY-006" status="pending" complexity="M" tdd="recommended">
  <title>Animated Energy Flow Lines</title>
  <dependencies>STORY-005</dependencies>
  <description>
    Add CSS/JS animations to the power flow connection lines. Lines animate in the direction of energy transfer. Line thickness is proportional to power magnitude.
    Colors use FE_design.md semantic tokens: solar=var(--solar), grid-import=var(--grid-import), grid-export=var(--grid-export), battery=var(--battery-charge)/var(--battery-discharge).
  </description>
  <design_intent>DP-003 (Flow Direction is Sacred)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Flow lines animate in correct direction based on energy flow</ac>
    <ac id="AC2">Line thickness scales with power magnitude (0W = no line, max power = thickest)</ac>
    <ac id="AC3">Colors use FE_design.md tokens: solar=var(--solar), grid-import=var(--grid-import), grid-export=var(--grid-export), battery-charge=var(--battery-charge), battery-discharge=var(--battery-discharge)</ac>
    <ac id="AC4">Animations are smooth (CSS-driven, GPU-accelerated where possible)</ac>
    <ac id="AC5">Lines with zero flow shown as very faint dashed line at ~10% opacity (inactive state per FE_design.md)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Unit test flow direction logic (given power values, verify correct animation direction and thickness calculations)
    - Verify zero-flow lines are hidden
    - Verify color assignments per flow type
  </test_plan>
  <notes>
    - Use CSS animations with stroke-dasharray/stroke-dashoffset for flow direction
    - GPU-accelerated transforms preferred for smooth animation
    - Thickness range: 0px (zero flow) to a max of ~6px (peak power)
  </notes>
</story>

<story id="STORY-007" status="pending" complexity="M" tdd="required">
  <title>Real-time Data Binding for Power Flow</title>
  <dependencies>STORY-006, STORY-003</dependencies>
  <description>
    Connect the power flow diagram to real-time API data. Every 5 seconds, fetch P1 and Sungrow realtime data, compute energy flows between nodes, and update the SVG. Implement the data mapping formulas from project_idea.md Section A.
  </description>
  <design_intent>DP-001 (Numbers First), DP-002 (Honest About Data Freshness), DP-003 (Flow Direction is Sacred)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Power flow updates every 5 seconds with live data</ac>
    <ac id="AC2">Solar to Home flow = min(pv_power_w, load_power_w)</ac>
    <ac id="AC3">Grid to Home flow = P1 import_power_w (when importing)</ac>
    <ac id="AC4">Battery to Home flow = abs(battery_power_w) when discharging (negative)</ac>
    <ac id="AC5">Solar to Grid flow = export_power_w when positive and solar producing</ac>
    <ac id="AC6">Node values display formatted power (W or kW with 1 decimal)</ac>
    <ac id="AC7">Battery node shows SoC percentage from sungrow data</ac>
    <ac id="AC8">Sign conventions correctly applied per Architecture.md</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/power-flow.js</file>
    <file>src/app.js</file>
    <file>tests/power-flow.test.js</file>
  </allowed_scope>
  <test_first>
    <item>Create flow calculation tests in tests/power-flow.test.js FIRST</item>
    <item>Test with mock realtime data — verify flow values and directions</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - npx jest tests/power-flow.test.js — verify flow calculations with fixture data match expected values
  </test_plan>
  <notes>
    - 5-second polling interval via setInterval in src/app.js
    - Power formatting: values under 1000W display as "XXX W", values 1000W+ display as "X.X kW"
    - Sign convention: battery negative = discharging, P1 import positive = consuming from grid
  </notes>
</story>

</phase>

<!-- ============================================================ -->
<!-- PHASE 3: Dashboard Core                                       -->
<!-- Story file: docs/stories/phase-3-dashboard-core.md            -->
<!-- ============================================================ -->

<phase id="3" name="Dashboard Core" story_file="docs/stories/phase-3-dashboard-core.md">

<story id="STORY-008" status="pending" complexity="M" tdd="recommended">
  <title>KPI Strip Cards</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create src/kpi-strip.js with four horizontal KPI cards per FE_design.md Component 2: (1) Grid Now — current net power from P1 with coral/green accent, (2) Battery — SoC percentage with purple progress bar and glow, (3) Solar Today — daily production with amber accent, (4) Month Peak — capacity peak with threshold indicator. Cards use FE_design.md card anatomy (label/value/subtext). Refer to docs/FE_design.md Component 2 for full specification.
  </description>
  <design_intent>DP-001 (Numbers First), DP-004 (Glanceable Dashboard)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Four KPI cards render in a horizontal row below the power flow</ac>
    <ac id="AC2">"Now" card shows "Consuming X.X kW" or "Exporting X.X kW" based on P1 power_w sign</ac>
    <ac id="AC3">"Battery" card shows SoC percentage with a visual gauge (arc or bar)</ac>
    <ac id="AC4">"Solar Today" card shows cumulative kWh from pv_daily_kwh</ac>
    <ac id="AC5">"Peak" card shows monthly capacity peak in kW from P1 capacity endpoint</ac>
    <ac id="AC6">Cards are responsive — stack vertically on narrow screens (&lt;400px)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/kpi-strip.js</file>
    <file>tests/kpi-strip.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test value formatting and sign-based text selection logic
    - Verify "Consuming" vs "Exporting" label based on power_w sign
    - Verify SoC percentage formatting
    - Verify kWh formatting for solar daily production
  </test_plan>
  <notes>
    - Cards update on the same 5-second polling cycle as the power flow
    - Peak capacity fetched once per page load (monthly data)
    - Visual gauge for battery SoC can be an SVG arc or CSS bar
  </notes>
</story>

<story id="STORY-009" status="pending" complexity="L" tdd="recommended">
  <title>Power Timeline Chart</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create Chart.js-based area/line chart in src/charts.js showing today's hourly power data: solar production (var(--solar) area), battery charge/discharge (var(--battery-charge)/var(--battery-discharge)), grid import/export (var(--grid-import)/var(--grid-export)), home consumption (var(--home) line). Interactive tooltips on hover/tap. Updates every 5 minutes.
  </description>
  <design_intent>DP-001 (Numbers First), DP-002 (Honest About Data Freshness)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Timeline chart renders with hourly data from Sungrow series (frame=day)</ac>
    <ac id="AC2">Solar shown as yellow area above baseline</ac>
    <ac id="AC3">Battery shown as purple area (above for charging, below for discharging)</ac>
    <ac id="AC4">Grid shown as red (import, below) / green (export, above) area</ac>
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
    - Test data transformation from API series format to Chart.js dataset format
    - Verify correct color assignments per data series
    - Verify hourly bucket mapping
  </test_plan>
  <notes>
    - Chart.js loaded via jsDelivr CDN in both dev and production (ADR-002). NOT inlined — would exceed 200 KB payload limit.
    - 5-minute polling interval (separate from the 5-second realtime interval)
    - Tooltip should show all series values for the hovered time bucket
  </notes>
</story>

</phase>

<!-- ============================================================ -->
<!-- PHASE 4: Energy Analytics                                     -->
<!-- Story file: docs/stories/phase-4-energy-analytics.md          -->
<!-- ============================================================ -->

<phase id="4" name="Energy Analytics" story_file="docs/stories/phase-4-energy-analytics.md">

<story id="STORY-010" status="pending" complexity="M" tdd="required">
  <title>Today's Energy Balance</title>
  <dependencies>STORY-003</dependencies>
  <description>
    Create src/energy-balance.js that calculates and renders today's energy balance: solar produced, self-consumed, exported, imported, battery charged/discharged. Shows self-consumption rate and self-sufficiency rate as percentage indicators. Uses donut or stacked bar chart. Updates every 60 seconds.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Energy balance section shows solar produced, self-consumed, exported, imported, battery charged/discharged in kWh</ac>
    <ac id="AC2">Self-consumption rate calculated as (1 - (export_kwh / production_kwh)) x 100%</ac>
    <ac id="AC3">Self-sufficiency rate calculated as (1 - (import_kwh / consumption_kwh)) x 100%</ac>
    <ac id="AC4">Rates displayed as percentage indicators</ac>
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
    <item>Test calculation formulas with known fixture data</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - npx jest tests/energy-balance.test.js — verify calculation accuracy with fixture data
  </test_plan>
  <notes>
    - Self-consumption and self-sufficiency are distinct metrics
    - Handle edge cases: zero production (avoid division by zero), zero consumption
    - 60-second polling interval (separate from realtime and chart intervals)
  </notes>
</story>

<story id="STORY-011" status="pending" complexity="M" tdd="recommended">
  <title>Monthly Overview Bar Chart</title>
  <dependencies>STORY-009</dependencies>
  <description>
    Add a monthly overview bar chart to src/charts.js showing daily production vs consumption for the current month. Loaded once on page load from Sungrow series (frame=month).
  </description>
  <design_intent>DP-001 (Numbers First)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Bar chart renders daily production (solar) and consumption (load) for current month</ac>
    <ac id="AC2">Data from Sungrow /v1/series?frame=month (daily buckets)</ac>
    <ac id="AC3">Production bars in yellow/amber, consumption bars in grey</ac>
    <ac id="AC4">Loaded once on page load (no polling)</ac>
    <ac id="AC5">Responsive width</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/charts.js</file>
    <file>tests/charts.test.js</file>
    <file>index.html</file>
  </allowed_scope>
  <test_plan>
    - Test data transformation from monthly series to Chart.js bar chart format
    - Verify correct color assignments (yellow/amber for production, grey for consumption)
    - Verify daily bucket mapping for current month
  </test_plan>
  <notes>
    - Reuse Chart.js instance from STORY-009
    - Single fetch on page load — no recurring polling
    - Bar chart type with grouped bars (production and consumption side by side)
  </notes>
</story>

</phase>

<!-- ============================================================ -->
<!-- PHASE 5: Integration and Polish                               -->
<!-- Story file: docs/stories/phase-5-integration.md               -->
<!-- ============================================================ -->

<phase id="5" name="Integration and Polish" story_file="docs/stories/phase-5-integration.md">

<story id="STORY-012" status="pending" complexity="S" tdd="na">
  <title>Cost Dashboard Stub</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Add a placeholder section for the future Belgian Energy tariff API per FE_design.md Component 6. Shows a card with dashed border, "Cost Tracking" heading, description of upcoming features, and ghost-style CTA button. The card has a frosted overlay effect signaling "coming soon." Refer to docs/FE_design.md Component 6 for full specification.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Placeholder card renders in the cost dashboard section area</ac>
    <ac id="AC2">Card shows "Connect your energy contract" message</ac>
    <ac id="AC3">Card describes upcoming features (running cost, projected bill, breakdown)</ac>
    <ac id="AC4">Styled consistently with the rest of the dashboard</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>index.html</file>
    <file>src/app.js</file>
  </allowed_scope>
  <test_plan>
    - Visual verification that placeholder renders correctly
    - Verify card styling matches dashboard theme
  </test_plan>
  <notes>
    - Minimal implementation — placeholder only
    - No API integration in this story
    - Section E in the dashboard layout
  </notes>
</story>

<story id="STORY-013" status="pending" complexity="M" tdd="required">
  <title>Error Handling and Staleness Indicators</title>
  <dependencies>STORY-007, STORY-008</dependencies>
  <description>
    Implement staleness detection (>30s since last successful API response) and offline detection (both APIs unreachable). Show visual indicators: dimmed values with timestamp for stale data, "Offline" banner when both APIs unreachable. Cache last known values.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Values dim and show "last updated X seconds ago" when data is >30s old</ac>
    <ac id="AC2">"Offline" banner appears when both P1 and Sungrow APIs are unreachable</ac>
    <ac id="AC3">Dashboard never shows blank — always last known values or mock data</ac>
    <ac id="AC4">Staleness timer updates independently per API source</ac>
    <ac id="AC5">When API recovers, indicators clear and live data resumes</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/api-client.js</file>
    <file>src/app.js</file>
    <file>index.html</file>
    <file>tests/api-client.test.js</file>
  </allowed_scope>
  <test_first>
    <item>Test staleness detection with jest fake timers</item>
    <item>Test offline detection with mocked failed fetches</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - npx jest — verify staleness and offline logic with jest fake timers
  </test_plan>
  <notes>
    - Staleness threshold: 30 seconds since last successful API response
    - Offline state: both P1 and Sungrow unreachable
    - Supports HC-003 (Graceful degradation — never blank screen)
  </notes>
</story>

<story id="STORY-014" status="pending" complexity="M" tdd="recommended">
  <title>Flutter WebView Integration</title>
  <dependencies>STORY-007</dependencies>
  <description>
    Implement the Flutter to Dashboard communication bridge. Dashboard listens for postMessage events (token refresh). Dashboard dispatches events back via window.flutter_inappwebview.callHandler(). Falls back gracefully if bridge not available. Theme change is not supported (dark mode only per HC-004).
  </description>
  <acceptance_criteria>
    <ac id="AC1">Dashboard listens for window.addEventListener('message', ...) for token refresh events</ac>
    <ac id="AC2">Token refresh event updates the in-memory config without page reload</ac>
    <ac id="AC3">Dashboard dispatches events to Flutter via callHandler('onEvent', data) if available</ac>
    <ac id="AC4">Graceful fallback if flutter_inappwebview bridge is not available</ac>
    <ac id="AC5">postMessage handler validates message origin against configured allowlist and validates message schema (type field required, token values must be non-empty strings)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/app.js</file>
    <file>src/config.js</file>
    <file>tests/app.test.js</file>
  </allowed_scope>
  <test_plan>
    - Test message event handling with mock postMessage events
    - Verify token refresh updates config without reload
    - Verify graceful fallback when flutter_inappwebview is undefined
  </test_plan>
  <notes>
    - flutter_inappwebview bridge may not exist (browser-only usage)
    - Token refresh must update in-memory config, not URL
    - No theme switching — dark mode only (HC-004)
  </notes>
</story>

<story id="STORY-015" status="pending" complexity="M" tdd="na">
  <title>Responsive Design and Dark Mode Polish</title>
  <dependencies>STORY-008, STORY-009, STORY-010</dependencies>
  <description>
    Final responsive design and accessibility pass per FE_design.md. Ensure all sections work from 360px to 1024px+ using breakpoints from FE_design.md. Verify dark-mode-only color tokens match FE_design.md Color System. Verify typography uses JetBrains Mono for data values and DM Sans for body text. Verify 8px spacing grid. Ensure accessibility: WCAG AA contrast, prefers-reduced-motion, 44x44px touch targets, aria-labels on charts. Verify payload under 200 KB.
  </description>
  <design_intent>DP-001 (Numbers First), DP-004 (Glanceable Dashboard)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Dashboard renders correctly at 360px, 768px, and 1024px+ widths</ac>
    <ac id="AC2">Dark mode is default with proper contrast ratios</ac>
    <ac id="AC3">Dark mode only — all color tokens match FE_design.md Color System</ac>
    <ac id="AC4">Typography matches FE_design.md type scale (JetBrains Mono 40-48px for hero values, 28-32px for KPI values)</ac>
    <ac id="AC5">Production dist/dashboard.html is under 200 KB</ac>
    <ac id="AC6">CSS custom properties used consistently for all theme colors</ac>
    <ac id="AC7">Accessibility: prefers-reduced-motion disables animations, WCAG AA contrast ratios, touch targets 44x44px minimum</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>index.html</file>
    <file>src/*.js</file>
    <file>scripts/build.js</file>
  </allowed_scope>
  <test_plan>
    - Manual verification at 360px, 768px, and 1024px+ viewport widths
    - Verify dark mode contrast ratios meet WCAG AA accessibility standards
    - Build and verify dist/dashboard.html file size is under 200 KB
  </test_plan>
  <notes>
    - This is a polish pass — all sections must already exist from prior stories
    - Build script should report file size and warn if approaching 200 KB limit
    - CSS custom properties for all colors per FE_design.md token system (dark mode only)
  </notes>
</story>

<story id="STORY-016" status="pending" complexity="S" tdd="recommended">
  <title>Status Bar Component</title>
  <dependencies>STORY-013</dependencies>
  <description>
    Add a slim status bar (32-40px) at the top of the dashboard per FE_design.md Component 7. Shows connectivity status (green dot + "Live", yellow dot + "Delayed" if data >30s stale, red dot + "Offline" if APIs unreachable), last update timestamp, and optional compact battery + solar readout. Refer to docs/FE_design.md Component 7 for full specification.
  </description>
  <design_intent>DP-002 (Honest About Data Freshness), DP-004 (Glanceable Dashboard)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Status bar renders at top of dashboard, 32-40px height</ac>
    <ac id="AC2">Green dot + "Live" when both APIs responding within 30s</ac>
    <ac id="AC3">Yellow dot + "Delayed" when data is >30s stale</ac>
    <ac id="AC4">Red dot + "Offline" when APIs unreachable</ac>
    <ac id="AC5">Last update timestamp displayed in --text-tertiary</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/app.js</file>
    <file>index.html</file>
    <file>tests/app.test.js</file>
  </allowed_scope>
  <test_plan>
    - Test getStatusIndicator(p1State, sungrowState) returns correct status (live/delayed/offline)
    - Test timestamp formatting
    - npx jest tests/app.test.js — all pass
  </test_plan>
  <notes>
    - Reuses staleness/offline state from STORY-013
    - Slim design — should not compete with the power flow hero section
    - Colors: green dot (#00B894), yellow dot (#FDCB6E), red dot (#E17055) per FE_design.md
  </notes>
</story>

</phase>

<!-- ============================================================ -->
<!-- PROGRESS OVERVIEW                                             -->
<!-- ============================================================ -->

<progress>
  <phase_summary>
    <phase id="1" name="Foundation" stories="4" done="0" progress="0%" link="stories/phase-1-foundation.md" />
    <phase id="2" name="Power Flow" stories="3" done="0" progress="0%" link="stories/phase-2-power-flow.md" />
    <phase id="3" name="Dashboard Core" stories="2" done="0" progress="0%" link="stories/phase-3-dashboard-core.md" />
    <phase id="4" name="Energy Analytics" stories="2" done="0" progress="0%" link="stories/phase-4-energy-analytics.md" />
    <phase id="5" name="Integration and Polish" stories="5" done="0" progress="0%" link="stories/phase-5-integration.md" />
  </phase_summary>
  <total stories="16" done="0" progress="0%" />
</progress>

<!-- ============================================================ -->
<!-- DEPENDENCY GRAPH                                              -->
<!-- ============================================================ -->

<dependency_graph>
STORY-001 (Project Scaffolding and HTML Skeleton)
├── STORY-002 (URL Parameter Configuration Module)
│   ├── STORY-003 (API Client with Authentication)
│   │   ├── STORY-007 (Real-time Data Binding for Power Flow)
│   │   │   ├── STORY-013 (Error Handling and Staleness Indicators)
│   │   │   │   └── STORY-016 (Status Bar Component)
│   │   │   └── STORY-014 (Flutter WebView Integration)
│   │   ├── STORY-008 (KPI Strip Cards)
│   │   │   └── STORY-013 (Error Handling and Staleness Indicators)
│   │   ├── STORY-009 (Power Timeline Chart)
│   │   │   └── STORY-011 (Monthly Overview Bar Chart)
│   │   └── STORY-010 (Today's Energy Balance)
│   └── STORY-004 (Mock Data System)
├── STORY-005 (SVG Power Flow Diagram Layout)
│   └── STORY-006 (Animated Energy Flow Lines)
│       └── STORY-007 (Real-time Data Binding for Power Flow)
├── STORY-012 (Cost Dashboard Stub)
└── STORY-015 (Responsive Design and Dark Mode Polish — depends on STORY-008, STORY-009, STORY-010)
</dependency_graph>

<!-- ============================================================ -->
<!-- BLOCKED STORIES                                               -->
<!-- ============================================================ -->

<blocked>
</blocked>

<!-- ============================================================ -->
<!-- PARKING LOT                                                   -->
<!-- ============================================================ -->

<parking_lot>
  <idea>Belgian Energy Tariff API integration (waiting for API key)</idea>
  <idea>MPPT1/MPPT2 per-string solar detail view</idea>
  <idea>Lifetime PV generation statistics</idea>
  <idea>Daily battery charge/discharge kWh breakdown</idea>
  <idea>Push notifications for capacity peak alerts</idea>
  <idea>Historical comparison (year-over-year)</idea>
  <idea>PWA support for standalone browser use</idea>
</parking_lot>

<!-- ============================================================ -->
<!-- LABELS REFERENCE                                              -->
<!-- ============================================================ -->

<labels>
  <label name="foundation">Core infrastructure and scaffolding</label>
  <label name="feature">New functionality</label>
  <label name="api">API integration</label>
  <label name="visualization">Charts and diagrams</label>
  <label name="ux">User experience and responsiveness</label>
  <label name="mvp">Required for MVP</label>
  <label name="post-mvp">Post-MVP feature</label>
</labels>

</backlog>
