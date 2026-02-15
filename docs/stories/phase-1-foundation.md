# Phase 1: Foundation

**Status**: In Progress
**Stories**: 4
**Completed**: 2
**Depends On**: None

## Phase Completion Criteria
- [ ] All stories have status "done"
- [ ] All tests passing (`npx jest`)
- [ ] Lint clean (`npx eslint src/`)
- [ ] Documentation updated
- [ ] Project scaffolding complete with build pipeline producing valid single-file output

## Stories

<story id="STORY-001" status="done" complexity="M" tdd="recommended">
  <title>Project Scaffolding and HTML Skeleton</title>
  <dependencies>None</dependencies>
  <description>
    Create the project structure: package.json with dev dependencies (jest, eslint, prettier),
    ESLint and Prettier configs, Jest config, index.html skeleton with dark theme CSS custom
    properties, and the build script that inlines src/ files into dist/dashboard.html.

    The index.html must have placeholder sections for all 6 dashboard areas (A-F):
    A: Power Flow Diagram (hero), B: KPI Strip, C: Energy Balance,
    D: Power Timeline, E: Cost Dashboard, F: Monthly Overview.

    The dark theme uses CSS custom properties per FE_design.md token system (dark mode only, HC-004).
  </description>
  <design_intent>DP-001 (Numbers First), DP-004 (Glanceable Dashboard) — establish layout hierarchy with hero power flow at top, KPIs below, charts further down</design_intent>
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
    <file>dist/dashboard.html</file>
  </allowed_scope>
  <test_plan>
    - Verify npm install completes without errors
    - npx eslint src/ — zero warnings
    - npx prettier --check . — passes
    - node scripts/build.js — produces dist/dashboard.html
    - Open index.html in browser — dark background, 6 placeholder sections visible
  </test_plan>
  <notes>
    - Use CSS custom properties for all colors per FE_design.md token system (dark mode only, HC-004)
    - The build script reads index.html, finds src/ script tags, inlines their content
    - Keep src/app.js minimal — just a DOMContentLoaded listener that logs "Dashboard initialized"
    - ADR-001: Vanilla JS, no framework
  </notes>
</story>

---

<story id="STORY-002" status="done" complexity="S" tdd="required">
  <title>URL Parameter Configuration Module</title>
  <dependencies>STORY-001</dependencies>
  <description>
    Create src/config.js that parses URL query parameters and returns a config object.
    URL parameters (non-sensitive): p1_base, sungrow_base, p1_device_id, sungrow_device_id.
    Optional URL parameter: mock (default: false).
    Tokens (p1_token, sungrow_token): delivered via WebView bridge postMessage, with URL fallback for dev (immediately scrubbed via history.replaceState).

    Missing required parameters must display a clear, user-friendly error message in the
    dashboard body (not an alert or console error). The error should list which parameters
    are missing.

    URL validation: base URLs must start with "https://". Device IDs must be non-empty strings. Mock must be "true" or "false" (string from URL).
    Token validation (from bridge or URL fallback): must be non-empty strings.
    If tokens appear in URL, they must be scrubbed immediately via history.replaceState.

    HC-002 mandates: tokens via WebView bridge, non-sensitive config via URL parameters.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Config module parses URL parameters (p1_base, sungrow_base, p1_device_id, sungrow_device_id, mock) and receives tokens via postMessage bridge</ac>
    <ac id="AC2">Missing required parameters displays user-friendly error listing missing params</ac>
    <ac id="AC3">Optional parameters have defaults (mock=false). Tokens accepted via bridge or URL fallback with immediate scrubbing.</ac>
    <ac id="AC4">URL parameter values are type-validated (URLs must start with https://, tokens are non-empty)</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/config.js</file>
    <file>tests/config.test.js</file>
  </allowed_scope>
  <test_first>
    <item>Create tests/config.test.js FIRST</item>
    <item>Test: valid parameters return correct config object</item>
    <item>Test: missing required params returns error with list of missing param names</item>
    <item>Test: invalid URL (http://) returns validation error</item>
    <item>Test: empty token returns validation error</item>
    <item>Test: mock=true parses to boolean true, defaults to false when omitted</item>
    <item>Test: tokens from URL params are scrubbed via history.replaceState</item>
    <item>Test: tokens received via postMessage are stored in config</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - Unit tests for parseConfig() with various parameter combinations
    - npx jest tests/config.test.js — all pass
  </test_plan>
  <notes>
    - Use URLSearchParams API for parsing
    - Return { valid: true, config: {...} } or { valid: false, errors: [...] }
    - HC-002: Never hardcode any default URLs or tokens
  </notes>
</story>

---

<story id="STORY-003" status="pending" complexity="M" tdd="required">
  <title>API Client with Authentication</title>
  <dependencies>STORY-002</dependencies>
  <description>
    Create src/api-client.js with functions to fetch data from the P1 and Sungrow APIs.
    All requests include Authorization: Bearer header. Implements 30-second fetch timeout
    via AbortController. On failure (network error, timeout, non-200 status), returns the
    last-known cached value instead of throwing.

    The client must handle these endpoints:
    - P1: /v1/realtime, /v1/series?device_id={id}&frame={frame}, /v1/capacity/month/{YYYY-MM}?device_id={id}, /health
    - Sungrow: /v1/realtime?device_id={id}, /v1/series?device_id={id}&frame={frame}, /health

    API Client Contract (complete function list):
    | Function | Endpoint | Auth | Caching |
    |----------|----------|------|---------|
    | fetchP1Realtime(config) | P1 /v1/realtime?device_id={id} | Bearer | Yes |
    | fetchP1Series(config, frame) | P1 /v1/series?device_id={id}&frame={frame} | Bearer | Yes |
    | fetchP1Capacity(config, month) | P1 /v1/capacity/month/{YYYY-MM}?device_id={id} | Bearer | Yes |
    | fetchSungrowRealtime(config) | Sungrow /v1/realtime?device_id={id} | Bearer | Yes |
    | fetchSungrowSeries(config, frame) | Sungrow /v1/series?device_id={id}&frame={frame} | Bearer | Yes |
    | checkP1Health() | P1 /health | None | No |
    | checkSungrowHealth() | Sungrow /health | None | No |

    Each function takes a config object (from STORY-002) and returns parsed JSON.
    Last-known values are cached per endpoint in module-level variables.

    When config.mock is true, the API client must delegate to mock-data.js (STORY-004)
    instead of making network requests.
  </description>
  <acceptance_criteria>
    <ac id="AC1">fetchP1Realtime(config) returns parsed JSON from P1 /v1/realtime?device_id={id}</ac>
    <ac id="AC2">fetchSungrowRealtime(config) returns parsed JSON from Sungrow /v1/realtime?device_id={id}</ac>
    <ac id="AC3">fetchSungrowSeries(config, frame) returns parsed JSON from Sungrow /v1/series?device_id={id}&amp;frame={frame}</ac>
    <ac id="AC4">fetchP1Capacity(config, month) returns parsed JSON from P1 /v1/capacity/month/{YYYY-MM}?device_id={id}</ac>
    <ac id="AC5">fetchP1Series(config, frame) returns parsed JSON from P1 /v1/series?device_id={id}&amp;frame={frame}</ac>
    <ac id="AC6">checkP1Health() and checkSungrowHealth() return health status from /health endpoints (no auth required)</ac>
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
    <item>Create tests/fixtures/*.json with mock API responses</item>
    <item>Mock global fetch() using jest.fn()</item>
    <item>Test: successful fetch returns parsed JSON</item>
    <item>Test: Authorization header is set correctly</item>
    <item>Test: network error returns cached last-known value</item>
    <item>Test: timeout after 30s returns cached last-known value</item>
    <item>Test: non-200 status returns cached last-known value</item>
    <item>Test: first failure with no cache returns null</item>
    <item>Tests must FAIL before implementation</item>
  </test_first>
  <test_plan>
    - Unit tests with mocked fetch for all endpoints
    - Test success, timeout, error, and caching scenarios
    - npx jest tests/api-client.test.js — all pass
  </test_plan>
  <notes>
    - Use the IIFE module pattern (ApiClient namespace)
    - AbortController with setTimeout for 30s timeout
    - Cache structure: { p1Realtime: null, sungrowRealtime: null, sungrowSeries: {}, p1Capacity: {} }
    - Mock integration will be wired in STORY-004
  </notes>
</story>

---

<story id="STORY-004" status="pending" complexity="S" tdd="recommended">
  <title>Mock Data System</title>
  <dependencies>STORY-002</dependencies>
  <description>
    Create src/mock-data.js that provides realistic mock API responses matching the data
    shapes defined in project_idea.md. When config.mock is true, the API client returns
    mock data without making network requests.

    Mock data must include: MOCK_P1_REALTIME, MOCK_SUNGROW_REALTIME, MOCK_SUNGROW_SERIES_DAY,
    MOCK_P1_CAPACITY. Timestamps should be dynamically generated using the current date.

    This also requires modifying src/api-client.js to check config.mock and delegate to
    mock data when true.
  </description>
  <acceptance_criteria>
    <ac id="AC1">Mock module exports MOCK_P1_REALTIME, MOCK_SUNGROW_REALTIME, MOCK_SUNGROW_SERIES_DAY, MOCK_P1_CAPACITY</ac>
    <ac id="AC2">Mock data shapes match the API response structures from project_idea.md</ac>
    <ac id="AC3">When config.mock is true, API client functions return mock data without network requests</ac>
    <ac id="AC4">Mock data timestamps use current date dynamically</ac>
  </acceptance_criteria>
  <allowed_scope>
    <file>src/mock-data.js</file>
    <file>tests/mock-data.test.js</file>
    <file>src/api-client.js</file>
  </allowed_scope>
  <test_plan>
    - Verify mock data objects have all required fields
    - Verify field types match API contracts
    - Verify timestamps use current date
    - npx jest tests/mock-data.test.js — all pass
  </test_plan>
  <notes>
    - Copy mock data values from project_idea.md Mock Data section
    - Use functions that generate fresh timestamps: () => new Date().toISOString()
    - The mock-data module should export functions, not static objects, for dynamic timestamps
  </notes>
</story>

## Phase Notes

### Dependencies on Other Phases
- No dependencies — this is the foundation phase

### Known Risks
- Build script complexity: Inlining JS/CSS must handle script ordering correctly
- Jest + browser globals: Tests need to mock DOM APIs and fetch

### Technical Debt
- Build script is minimal — may need enhancement for source maps in Phase 5
