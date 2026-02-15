# Phase 5: Integration & Polish

**Status**: In Progress
**Stories**: 5
**Completed**: 1
**Depends On**: Phase 2 (STORY-007), Phase 3 (STORY-008, STORY-009), Phase 4 (STORY-010)

## Phase Completion Criteria
- [ ] All stories have status "done"
- [ ] All tests passing (`npx jest`)
- [ ] Lint clean (`npx eslint src/`)
- [ ] Documentation updated
- [ ] Dashboard fully polished, responsive, with error handling and Flutter WebView integration
- [ ] Production dist/dashboard.html under 200 KB

## Stories

<story id="STORY-012" status="done" complexity="S" tdd="na">
  <title>Cost Dashboard Stub</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Add a placeholder section for the future Belgian Energy tariff API per FE_design.md
    Component 6. Card design: dashed border (--border-subtle), lightning icon + 'Cost Tracking'
    heading in --text-primary, description in --text-secondary, ghost/outline CTA button with
    --accent color ('Set up contract →'), subtle frosted overlay effect to signal 'coming soon'.
    The card should look intentional, not broken. Refer to docs/FE_design.md Component 6 for
    full specification.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Placeholder card renders in the cost dashboard section area (Section E)</ac>
    <ac id="AC2">Card shows "Connect your energy contract" message</ac>
    <ac id="AC3">Card describes upcoming features (running cost, projected bill, breakdown)</ac>
    <ac id="AC4">Styled consistently with the rest of the dashboard, with muted appearance</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>index.html</file>
    <file>src/app.js</file>
  </allowed_scope>
  <test_plan>
    - Visual verification that placeholder renders correctly
    - Verify text content matches acceptance criteria
  </test_plan>
  <notes>
    - Keep it simple — this is a placeholder for future work
    - Use the same card styling as KPI cards but with reduced opacity or a "coming soon" badge
    - The Belgian Energy API will be at api.belgianenergy.wimluyckx.dev when available
  </notes>
</story>

---

<story id="STORY-013" status="pending" complexity="M" tdd="required">
  <title>Error Handling and Staleness Indicators</title>
  <dependencies>STORY-007, STORY-008</dependencies>
  <description>
    Implement comprehensive error handling and staleness detection across the dashboard.

    Staleness detection: If the last successful API response is more than 30 seconds old,
    display a visual indicator on affected components:
    - Dimmed/faded values
    - "Last updated X seconds ago" timestamp
    - Subtle warning icon

    Offline detection: If BOTH P1 and Sungrow APIs are unreachable (last 3+ consecutive
    failures), show an "Offline" banner at the top of the dashboard.

    Recovery: When APIs become reachable again, clear all staleness indicators and resume
    normal display.

    HC-003 mandate: Dashboard must NEVER show a blank screen. Always show last known
    values or fall back to mock data.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Values dim and show "last updated X seconds ago" when data is greater than 30s old</ac>
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
    <item>Add tests to tests/api-client.test.js</item>
    <item>Test: getLastFetchTime(endpoint) returns timestamp of last successful fetch</item>
    <item>Test: isStale(endpoint, thresholdMs) returns true when elapsed time exceeds 30s</item>
    <item>Test: isOffline() returns true when both APIs have 3+ consecutive failures</item>
    <item>Test: successful fetch after failures clears failure count</item>
    <item>Use jest.useFakeTimers() for time-dependent tests</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - Unit tests for staleness detection with jest fake timers
    - Unit tests for offline detection with mocked failed fetches
    - Test recovery scenario (failures followed by success)
    - npx jest tests/api-client.test.js — all pass
  </test_plan>
  <notes>
    - Track lastSuccessTime and consecutiveFailures per API source (p1, sungrow)
    - Use getCurrentTime() wrapper instead of Date.now() directly (testability)
    - CSS classes: .stale (dimmed opacity), .offline-banner (red top bar)
    - The "X seconds ago" text should update on each polling cycle
  </notes>
</story>

---

<story id="STORY-014" status="pending" complexity="M" tdd="recommended">
  <title>Flutter WebView Integration</title>
  <dependencies>STORY-007</dependencies>
  <description>
    Implement the Flutter to Dashboard communication bridge. Dashboard listens for
    postMessage events (token refresh). Dashboard dispatches events back via
    window.flutter_inappwebview.callHandler(). Falls back gracefully if bridge not
    available. Theme change is not supported (dark mode only per HC-004/ADR-004).
  </description>
  <acceptance_criteria>
    <ac id="AC1">Dashboard listens for window message events for token refresh</ac>
    <ac id="AC2">Token refresh event updates in-memory config without page reload</ac>
    <ac id="AC3">Dashboard dispatches events to Flutter via callHandler if available</ac>
    <ac id="AC4">Graceful fallback when flutter_inappwebview bridge is not available</ac>
    <ac id="AC5">postMessage handler validates message origin against configured allowlist and validates message schema (type field required, token values must be non-empty strings)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/app.js</file>
    <file>src/config.js</file>
    <file>tests/app.test.js</file>
  </allowed_scope>
  <test_plan>
    - Test handleMessage({ type: "token_refresh", ... }) updates config tokens
    - Test handleMessage({ type: "bootstrap", ... }) delivers initial tokens
    - Test dispatchToFlutter() does not throw when bridge is missing
    - Test dispatchToFlutter() calls callHandler when bridge exists
    - npx jest tests/app.test.js — all pass
  </test_plan>
  <notes>
    - Use window.addEventListener('message', handler) for incoming events
    - Validate message origin against strict allowlist (require exact match)
    - Validate message schema (type field required, token fields must be non-empty strings)
    - No theme switching — dark mode only (HC-004)
    - The "ready" event should fire after DOMContentLoaded and initial data fetch
  </notes>
</story>

---

<story id="STORY-015" status="pending" complexity="M" tdd="na">
  <title>Responsive Design and Dark Mode Polish</title>
  <dependencies>STORY-008, STORY-009, STORY-010</dependencies>
  <description>
    Final responsive design and accessibility pass per FE_design.md. Verify all sections
    work from 360px to 1024px+ using breakpoints from FE_design.md responsive table. Verify
    dark-mode-only color tokens match FE_design.md Color System. Verify typography uses
    JetBrains Mono for data values and DM Sans for body text per FE_design.md type scale.
    Verify 8px spacing grid. Ensure accessibility: WCAG AA contrast ratios,
    prefers-reduced-motion disables animations, minimum 44x44px touch targets, aria-labels
    on chart data. Verify payload under 200 KB.
  </description>
  <design_intent>DP-001 (Numbers First — verify primary values are prominent at all breakpoints), DP-004 (Glanceable Dashboard — verify hero section visible without scroll on mobile)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Dashboard renders correctly at 360px, 768px, and 1024px+ widths</ac>
    <ac id="AC2">Dark mode is default with proper contrast ratios (WCAG AA)</ac>
    <ac id="AC3">Dark mode only — all color tokens match FE_design.md Color System</ac>
    <ac id="AC4">Typography matches FE_design.md type scale (JetBrains Mono 40-48px for hero values, 28-32px for KPI values)</ac>
    <ac id="AC5">Production dist/dashboard.html is under 200 KB</ac>
    <ac id="AC6">CSS custom properties used consistently for all theme colors</ac>
    <ac id="AC7">Accessibility: prefers-reduced-motion disables animations, WCAG AA contrast ratios verified, touch targets 44x44px minimum</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>index.html</file>
    <file>src/app.js</file>
    <file>src/power-flow.js</file>
    <file>src/kpi-strip.js</file>
    <file>src/charts.js</file>
    <file>src/energy-balance.js</file>
    <file>scripts/build.js</file>
  </allowed_scope>
  <test_plan>
    - Manual verification at 360px, 768px, and 1024px+ viewport widths
    - Verify dark mode colors match FE_design.md Color System
    - node scripts/build.js and verify dist/dashboard.html file size under 200 KB
    - Check contrast ratios with browser DevTools accessibility audit
  </test_plan>
  <notes>
    - Use CSS media queries for breakpoints per FE_design.md responsive table
    - Use CSS custom properties matching FE_design.md tokens (--bg-base, --bg-surface, --text-primary, --solar, --grid-import, etc.)
    - Dark mode only — no theme switching logic (HC-004)
    - The build script should report the final file size
    - If over 200 KB, identify and compress the largest sections
  </notes>
</story>

---

<story id="STORY-016" status="pending" complexity="S" tdd="recommended">
  <title>Status Bar Component</title>
  <dependencies>STORY-013</dependencies>
  <description>
    Add a slim status bar (32-40px) at the top of the dashboard per FE_design.md Component 7.
    Shows connectivity status with colored dot indicator:
    - Green dot (#00B894) + "Live" when both APIs responding within 30s
    - Yellow dot (#FDCB6E) + "Delayed" when data is >30s stale
    - Red dot (#E17055) + "Offline" when APIs unreachable

    Also shows last update timestamp in --text-tertiary. Optionally includes compact
    battery SoC + solar power readout (duplicated from KPI strip for quick-glance access).

    This component reuses the staleness/offline state from STORY-013.
    Refer to docs/FE_design.md Component 7 for full specification.
  </description>
  <design_intent>DP-002 (Honest About Data Freshness — connectivity status always visible), DP-004 (Glanceable Dashboard — system health at a glance without looking at individual components)</design_intent>
  <acceptance_criteria>
    <ac id="AC1">Status bar renders at top of dashboard, 32-40px height, full width</ac>
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
    - Test getStatusIndicator(p1State, sungrowState) returns correct status string (live/delayed/offline)
    - Test getStatusColor(status) returns correct hex color
    - Test timestamp formatting for "Last update: HH:MM:SS"
    - npx jest tests/app.test.js — all pass
  </test_plan>
  <notes>
    - Reuses staleness/offline state already tracked in STORY-013
    - Slim design — should not compete visually with the power flow hero section
    - Status dot is a small circle (8px) with the semantic color
    - Compact readouts (battery %, solar kW) are optional — implement if space allows on wider screens
    - FE_design.md colors: green=#00B894, yellow=#FDCB6E, red=#E17055
  </notes>
</story>

## Phase Notes

### Dependencies on Other Phases
- Phase 2 provides power flow (STORY-007) for error handling overlay
- Phase 3 provides KPI strip (STORY-008) and timeline chart (STORY-009)
- Phase 4 provides energy balance (STORY-010) for responsive layout

### Known Risks
- Payload size: if all sections together exceed 200 KB, will need to optimize SVG and JS
- WebView compatibility: some CSS features may behave differently in Flutter WebView vs browser
- Dark mode only (HC-004): no light mode support needed; all color tokens from FE_design.md

### Technical Debt
- Cost dashboard stub (STORY-012) will need full implementation when Belgian Energy API is available
- Flutter WebView bridge testing is limited to mock events — full integration test requires Flutter app
