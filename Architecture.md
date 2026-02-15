# Architecture.md - Energy Dashboard

**Last Updated**: 2026-02-15

---

## Overview

Self-contained HTML/CSS/JS energy dashboard for Flutter WebView integration. Visualizes real-time and historical energy data from a Belgian residential solar + battery + grid setup by fetching from two self-hosted FastAPI backends.

**Primary Goal**: Provide real-time energy flow visualization and historical analytics in an embeddable, single-file dashboard.

**Companion Project**: This dashboard is loaded by a Flutter mobile app via WebView. The Flutter app provides device IDs and base URLs via URL parameters, and delivers Bearer tokens securely via the WebView postMessage bridge.

---

## Tech Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Language | JavaScript (ES6+) | ES2020 | Dashboard logic |
| Markup | HTML5 | 5 | Document structure |
| Styling | CSS3 | 3 | Layout and theming |
| Charting | Chart.js | 4.x | Time series and bar charts |
| Graphics | SVG (inline) | 1.1 | Power flow diagram |
| Testing | Jest | latest | Unit testing (dev only) |
| Linting | ESLint | latest | Code quality (dev only) |
| Formatting | Prettier | latest | Code style (dev only) |
| CDN | jsDelivr | — | Chart.js delivery |
| Data Typography | JetBrains Mono | latest | Tabular-lining numbers for power values |
| Body Typography | DM Sans | latest | Labels, descriptions, body text |

### Dependencies NOT in Tech Stack (Forbidden Without ADR)
Any package not listed above requires an Architecture Proposal before use.

---

## Directory Structure

```
energy-dashboard/
├── CLAUDE.md                        # Agent workflow rules
├── Architecture.md                  # This file
├── SKILL.md                         # Security guidelines
├── docs/
│   ├── BACKLOG.md                   # Stories and requirements
│   ├── project_idea.md              # Original project specification
│   └── stories/                     # Detailed story files per phase
│       ├── phase-1-foundation.md
│       ├── phase-2-power-flow.md
│       ├── phase-3-dashboard-core.md
│       ├── phase-4-energy-analytics.md
│       └── phase-5-integration.md
├── src/                             # Source modules (dev)
│   ├── api-client.js                # API fetch wrapper with auth
│   ├── config.js                    # URL parameter parsing and validation
│   ├── mock-data.js                 # Mock data for development
│   ├── power-flow.js                # SVG power flow diagram
│   ├── kpi-strip.js                 # KPI cards logic
│   ├── charts.js                    # Chart.js configurations
│   ├── energy-balance.js            # Energy balance calculations
│   ├── utils.js                     # Formatting, unit conversion helpers
│   └── app.js                       # Main orchestration, polling, init
├── tests/                           # Jest unit tests
│   ├── api-client.test.js
│   ├── config.test.js
│   ├── energy-balance.test.js
│   ├── power-flow.test.js
│   ├── utils.test.js
│   └── fixtures/
│       ├── p1-realtime.json
│       ├── sungrow-realtime.json
│       ├── sungrow-series-day.json
│       └── p1-capacity.json
├── scripts/
│   └── build.js                     # Inlines src/ into single HTML
├── index.html                       # Development entry point (loads src/ via script tags)
├── dist/
│   └── dashboard.html               # Production artifact (single file, all inlined)
├── package.json                     # Dev dependencies only (jest, eslint, prettier)
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc                      # Prettier configuration
└── jest.config.js                   # Jest configuration
```

---

## Key Components

### 1. API Client
- **Location**: `src/api-client.js`
- **Responsibility**: Fetches data from P1 and Sungrow APIs with Bearer token auth
- **Protocol**: HTTPS fetch() with Authorization header
- **Dependencies**: config.js for base URLs and tokens

### 2. Power Flow Diagram
- **Location**: `src/power-flow.js`
- **Responsibility**: Renders animated SVG diagram showing real-time energy flow between Solar, Battery, Home, Grid
- **Protocol**: DOM manipulation of inline SVG
- **Dependencies**: api-client.js for real-time data, utils.js for formatting

### 3. Chart Manager
- **Location**: `src/charts.js`
- **Responsibility**: Creates and updates Chart.js instances for timeline and monthly charts
- **Dependencies**: Chart.js (CDN), api-client.js for series data

### 4. Configuration
- **Location**: `src/config.js`
- **Responsibility**: Parses and validates URL query parameters (tokens, device IDs, theme, mock mode)
- **Dependencies**: None (pure parsing)

### 5. Mock Data
- **Location**: `src/mock-data.js`
- **Responsibility**: Provides realistic mock API responses for development without live APIs
- **Dependencies**: None

### 6. Status Bar
- **Location**: Part of `src/app.js` (top-level UI element)
- **Responsibility**: Slim top bar showing connectivity status (Live/Delayed/Offline), last update timestamp, and compact battery/solar readout
- **Dependencies**: api-client.js for connectivity state

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Energy Dashboard (WebView)                 │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Presentation │   │    Logic     │   │   Data Layer   │  │
│  │  (SVG, DOM,  │◄──│ (Polling,    │◄──│  (API Client,  │  │
│  │   Chart.js)  │   │  Transform)  │   │   Mock Data)   │  │
│  └──────────────┘   └──────────────┘   └───────┬────────┘  │
│                                                 │           │
└─────────────────────────────────────────────────┼───────────┘
                                                  │
                    ┌─────────────────────────────┼───────────┐
                    │                             │           │
                    ▼                             ▼           │
           ┌──────────────┐            ┌──────────────┐      │
           │   P1 API     │            │ Sungrow API  │      │
           │  HTTPS/REST  │            │  HTTPS/REST  │      │
           │  (Grid data) │            │ (Solar/Batt) │      │
           └──────────────┘            └──────────────┘      │
```

### Flow: Bootstrap (on page load)
1. Flutter app loads `dashboard.html` with base URLs, device IDs, and mock flag as URL parameters
2. `config.js` parses URL params, immediately scrubs any sensitive values via `history.replaceState`
3. Dashboard shows skeleton loading state, waiting for token delivery
4. Flutter app sends bootstrap message via `postMessage`: `{ type: "bootstrap", p1_token: "...", sungrow_token: "..." }`
5. `config.js` receives tokens, stores in memory, marks config as ready
6. If tokens were in URL params (dev fallback), they are used directly after scrubbing
7. If `mock=true`, tokens are not required — mock data used immediately

### Flow: Real-time Power Update (every 5 seconds)
1. `app.js` timer fires, calls `api-client.js` to fetch P1 `/v1/realtime` and Sungrow `/v1/realtime` in parallel
2. Responses validated (schema check, null handling)
3. `power-flow.js` updates SVG node values and animation directions
4. `kpi-strip.js` updates KPI card values
5. Last-known values cached in memory for staleness fallback

### Flow: Chart Data Refresh (every 5 minutes)
1. `app.js` timer fires, calls `api-client.js` to fetch Sungrow `/v1/series?frame=day`
2. Data transformed into Chart.js dataset format
3. `charts.js` updates timeline chart with new data points
4. `energy-balance.js` recalculates self-consumption and self-sufficiency rates

### Flow: Offline/Error Fallback
1. API call fails or times out (30s threshold)
2. `api-client.js` returns cached last-known values
3. UI shows "stale" indicator with timestamp of last successful fetch
4. If both APIs unreachable, show "offline" banner
5. Never show blank screen — always display last known or mock data

### Flow Characteristics
- **Reactive**: setInterval polling triggers DOM updates directly (no framework reactivity)
- **Offline-first**: Last-known values cached in JS variables, displayed with staleness indicators
- **Configurable**: API URLs, tokens, device IDs, theme, mock mode via URL parameters
- **Resilient**: Cached data + staleness UI + offline banner + mock fallback

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single HTML file | Inline CSS + JS | Flutter WebView loads a single URL; no server to serve assets |
| Vanilla JS | No framework | < 200 KB budget, no build step, simplicity |
| Chart.js via CDN | External CDN | Keeps payload small, widely cached, no bundle needed |
| SVG for power flow | Inline SVG | Animatable, scalable, no canvas pixel issues on retina |
| Polling over WebSocket | setInterval | APIs are REST-only, simpler error recovery |
| Dark mode only | CSS custom properties | Always-on monitoring tool; dark backgrounds reduce eye strain and make colored energy flows pop (FE_design.md: "Calm Control Room") |

---

## Design Principles

These principles guide all output decisions. They are not a design system — they are guardrails
that prevent generic output and ensure the product feels intentional. Specific patterns, tokens,
and implementation decisions are captured iteratively in the agent memory topic file `design.md`
as work progresses.

The visual direction is "Calm Control Room" — think Tesla Powerwall app meets Dieter Rams.
Restrained, confident, information-dense but never cluttered. See `docs/FE_design.md` for the
full design specification including color tokens, typography scale, spacing grid, component
anatomy, and micro-interaction definitions.

### DP-001: Numbers First
The primary content of this dashboard is numerical. The key number on any screen element must be the largest, most prominent element. Use large, legible fonts for power values (W/kW) and energy values (kWh). Secondary information (labels, timestamps) is smaller and muted.

### DP-002: Honest About Data Freshness
Always distinguish live data from cached or estimated values. Never display a number without indicating its source and age. Live data renders normally; stale data (>30s) shows a dimmed appearance with a timestamp. Offline data shows an explicit banner.

### DP-003: Flow Direction is Sacred
The power flow diagram is the hero element. Energy flow direction must always be correct per the sign convention. Line thickness encodes magnitude. Animation direction encodes flow direction. Getting this wrong is worse than showing no data at all.

### DP-004: Glanceable Dashboard
This is a monitoring tool, not an interactive app. Users glance at it many times a day. The most important information (current power flow, battery SoC, solar production) must be visible instantly without scrolling on mobile.

---

## Visual Design System

The authoritative visual specification lives in `docs/FE_design.md`. This section summarizes
the key tokens; the FE design doc is the source of truth for details.

### Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0A0E14` | Page background |
| `--bg-surface` | `#111820` | Card/panel background |
| `--bg-elevated` | `#1A2230` | Hover states, active cards |
| `--text-primary` | `#E8ECF1` | Primary text, large numbers |
| `--text-secondary` | `#8899AA` | Labels, descriptions |
| `--text-tertiary` | `#4A5568` | Timestamps, fine print |
| `--solar` | `#F6B93B` | Solar production |
| `--battery-charge` | `#6C5CE7` | Battery charging |
| `--battery-discharge` | `#A29BFE` | Battery discharging |
| `--grid-import` | `#E17055` | Importing from grid |
| `--grid-export` | `#00B894` | Exporting to grid |
| `--home` | `#DFE6E9` | Home consumption |
| `--success` | `#00B894` | Good status |
| `--warning` | `#FDCB6E` | Warning status |
| `--danger` | `#E17055` | Danger/alert status |
| `--accent` | `#74B9FF` | Interactive elements |
| `--border-subtle` | `#1E2A3A` | Card borders, dividers |

### Typography Scale

| Role | Size | Weight | Font |
|------|------|--------|------|
| Hero power value | 40–48px | 700 | JetBrains Mono |
| Node power label | 20–24px | 600 | JetBrains Mono |
| KPI value | 28–32px | 700 | JetBrains Mono |
| KPI label | 12–13px | 500 | DM Sans, uppercase |
| Section heading | 16–18px | 600 | DM Sans |
| Body text | 14px | 400 | DM Sans |
| Unit suffix (kW, %) | 60% of parent | 400 | DM Sans |

**Key rule**: Units (kW, kWh, %, °C) are always smaller and lighter weight than the number.

### Spacing Grid

8px base: `4, 8, 12, 16, 24, 32, 48, 64`
- Card padding: 20–24px
- Gap between cards: 12–16px
- Section gap: 32–48px
- Page padding (mobile): 16px horizontal

### Accessibility

- All colors meet WCAG AA contrast ratio (4.5:1 text, 3:1 large text)
- Animations disabled via `prefers-reduced-motion` media query
- Chart data accessible via aria-labels
- Focus rings on all interactive elements (`--border-focus: #74B9FF`)
- Touch targets: minimum 44×44px on mobile

---

## Integration Points

### Inputs

- **P1 API** (Grid Meter):
  - Protocol: HTTPS REST
  - Base URL: Configurable via `p1_base` URL parameter
  - Auth: `Authorization: Bearer <p1_token>` (from WebView bridge)
  - Data: Real-time grid power, historical series, capacity peaks
  - Endpoints: `/v1/realtime`, `/v1/series`, `/v1/capacity/month/{YYYY-MM}`, `/health`

- **Sungrow API** (Solar + Battery):
  - Protocol: HTTPS REST
  - Base URL: Configurable via `sungrow_base` URL parameter
  - Auth: `Authorization: Bearer <sungrow_token>` (from WebView bridge)
  - Data: Real-time solar/battery/load, historical series
  - Endpoints: `/v1/realtime`, `/v1/series`, `/health`

- **Belgian Energy API** (Future):
  - Protocol: HTTPS REST
  - Base URL: Configurable via `energy_base` URL parameter
  - Auth: API key (not yet available)
  - Status: Stub — placeholder in UI

### Outputs

- **Flutter WebView**: `window.flutter_inappwebview.callHandler('onEvent', data)` for events back to Flutter
- **postMessage**: `window.postMessage` for token refresh and theme changes from Flutter

---

## Development Patterns

### Module Pattern

```javascript
// Each src/ file exports functions via a namespace object
// During dev: loaded as separate <script> files
// In production: inlined into single HTML file

const ApiClient = (() => {
  // private state
  let lastKnownP1 = null;

  // public API
  return {
    fetchP1Realtime: async (config) => { /* ... */ },
    getLastKnown: () => lastKnownP1,
  };
})();
```

### Error Handling
- All fetch calls wrapped in try/catch with timeout (30s)
- Failed fetches return cached last-known values
- Errors logged to console, never shown raw to user
- Stale/offline indicators in UI, not error messages

### Configuration
- Use `src/config.js` for URL parameter parsing and WebView bridge token reception
- Use CSS custom properties matching FE_design.md tokens (`--bg-base`, `--text-primary`, `--solar`, etc.)
- No hardcoded IPs, URLs, or secrets in code
- Environment-specific config via URL parameters constructed by Flutter app

---

## Development Workflow

```bash
# Setup
npm install  # dev dependencies only (jest, eslint, prettier)

# Lint (must pass with zero warnings)
npx eslint src/

# Format (must pass)
npx prettier --check .

# Test
npx jest

# Test with coverage report
npx jest --coverage

# Build (inline into single HTML)
node scripts/build.js

# Run (development — open in browser)
open index.html

# Clean rebuild
rm -rf dist/ coverage/
```

---

## Testing Strategy

| Test Type | Location | Coverage Target | Tools |
|-----------|----------|-----------------|-------|
| Unit Tests | `tests/` | 80%+ for logic modules | Jest |
| Integration | `tests/` | Key data flows | Jest + mock fetch |
| Fixtures | `tests/fixtures/` | Mock API responses | JSON files |

### Test Requirements
- All API response parsing must have tests with fixture data
- All energy calculations (self-consumption, self-sufficiency) must have tests
- Sign convention tests: verify correct interpretation of positive/negative values
- Config parsing tests: valid params, missing params, malformed params
- No tests may depend on real network access or real external services

### Mock Strategy
- Mock `fetch()` globally in tests using Jest mock
- Use fixture JSON files that match real API response shapes
- Test both success and error/timeout scenarios

### Time-Dependent Testing

Several features depend on clock time. All time-dependent code must accept an injectable
clock (or time provider) to enable deterministic testing:

| Feature | Time Dependency | Test Strategy |
|---------|----------------|---------------|
| Polling intervals | setInterval timers | Jest fake timers |
| Staleness detection | Time since last fetch | Injectable clock function |
| "Today" calculations | Current date for daily data | Inject date in test |

**Pattern**: Use `Date.now()` wrapped in a testable function (`getCurrentTime()`) that tests can override. Never call `new Date()` directly in business logic.

---

## Environment & Secrets

| Variable | Purpose | Delivery | Required |
|----------|---------|----------|----------|
| `p1_base` | P1 API base URL | URL parameter | Yes |
| `sungrow_base` | Sungrow API base URL | URL parameter | Yes |
| `p1_token` | P1 API Bearer token | WebView bridge (postMessage) | Yes |
| `sungrow_token` | Sungrow API Bearer token | WebView bridge (postMessage) | Yes |
| `p1_device_id` | P1 meter device ID | URL parameter | Yes |
| `sungrow_device_id` | Sungrow inverter device ID | URL parameter | Yes |
| `mock` | Enable mock data mode | URL parameter | No (default: false) |

**Security**:
- Bearer tokens delivered via WebView postMessage bridge, stored in-memory only
- If tokens appear in URL params (dev/fallback), they are immediately scrubbed via `history.replaceState`
- Tokens never stored in localStorage, sessionStorage, cookies, or logged to console
- Short-lived tokens with refresh mechanism recommended (Flutter app manages token lifecycle)

---

## Operational Assumptions

1. **Runtime**: Modern mobile browser (Chrome/WebView 80+, Safari/WKWebView 14+)
2. **Storage**: No persistent storage needed — all state is in-memory, refreshed on load
3. **Memory**: < 50 MB total footprint including Chart.js
4. **Network**: WiFi or mobile data; APIs on public internet with valid TLS certificates

---

## Hard Constraints

### HC-001: Single-File Delivery
**Constraint**: Production artifact must be a single self-contained HTML file under 200 KB (excluding CDN resources).

**Rationale**: Flutter WebView loads a single URL; there is no web server to serve multiple files.

**Implications**:
- All CSS must be inline in `<style>` tags
- All project JS must be inline in `<script>` tags
- Chart.js loaded exclusively via CDN (NOT inlined — ~200 KB uncompressed would exceed budget)
- If CDN is unavailable (first load without internet), charts degrade gracefully — power flow diagram and KPI cards still render, chart sections show "Charts unavailable — requires internet connection" placeholder

**Allowed**: CDN-loaded libraries, separate files during development, build script to inline
**Forbidden**: npm runtime dependencies, build frameworks (webpack, vite, etc.), multiple HTML pages

### HC-002: No Hardcoded Credentials
**Constraint**: API tokens must be delivered via WebView bridge (postMessage), not URL parameters. Base URLs and device IDs may use URL parameters. If tokens appear in URL params (dev/testing fallback), they must be immediately scrubbed via `history.replaceState`.

**Rationale**: URL parameters leak into browser history, server logs, crash reports, and Referer headers. The WebView bridge provides a secure, in-memory-only delivery channel.

**Implications**:
- Dashboard waits for bootstrap message with tokens before making API calls
- URL is scrubbed of any sensitive parameters immediately after parsing
- Tokens stored in JS variables only, never persisted
- Flutter app manages token lifecycle (rotation, refresh)

**Allowed**: URL parameters for non-sensitive config (base URLs, device IDs, mock). WebView bridge for tokens. Dev/test fallback of URL token params with immediate scrubbing.
**Forbidden**: Hardcoded Bearer tokens anywhere in source. Tokens in localStorage/sessionStorage/cookies. Tokens remaining in URL bar after page load.

### HC-003: Graceful Degradation
**Constraint**: Dashboard must never show a blank screen.

**Rationale**: Energy monitoring is a daily-use tool; stale data is better than no data.

**Implications**:
- Cache last-known values in memory
- Show staleness indicators when data is old
- Fall back to mock data if no API data available

**Allowed**: Stale data with indicators, offline banners, mock data fallback
**Forbidden**: Blank/white screens, unhandled JS exceptions that crash the UI, raw error messages

---

## Architecture Decision Records (ADRs)

### ADR-001: Vanilla JavaScript Over Framework
**Status**: Approved
**Date**: 2026-02-15
**Stories**: All

**Context**:
The dashboard needs to be < 200 KB and load in a WebView. Frameworks like React or Vue add significant bundle size and require build tooling.

**Decision**:
Use vanilla JavaScript with the module pattern (IIFE namespaces).

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Vanilla JS | No build, small payload, fast load | No reactivity, manual DOM updates |
| Preact | Small (3 KB), JSX, components | Requires build step, adds complexity |
| Alpine.js | Declarative, small (15 KB) | Another dependency, learning curve |

**Rationale**:
- Dashboard has limited interactivity — mostly data display with periodic updates
- No complex state management needed — polling replaces reactivity
- Smallest possible payload

**Consequences**:
- Manual DOM manipulation required
- No component lifecycle — use explicit init/update functions
- Testing focuses on data transformation, not component rendering

---

### ADR-002: Chart.js via CDN
**Status**: Approved
**Date**: 2026-02-15
**Stories**: STORY-009, STORY-011

**Context**:
Dashboard needs time-series and bar charts. Options: Chart.js, pure SVG, canvas from scratch.

**Decision**:
Use Chart.js 4.x loaded from jsDelivr CDN.

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Chart.js CDN | Feature-rich, responsive, widely cached | External dependency, ~60 KB |
| Pure SVG charts | No dependency, full control | Significant development effort |
| Lightweight-charts | Trading-focused, fast | Overkill, unfamiliar API |

**Rationale**:
- Chart.js is widely cached on jsDelivr — most users will have it cached already
- Keeps the HTML payload under 200 KB since Chart.js is external
- Rich feature set for time series, bar charts, and tooltips

**Consequences**:
- Dashboard requires internet for first Chart.js load
- CDN availability becomes a dependency (mitigated by browser cache)

---

### ADR-003: SVG for Power Flow Diagram
**Status**: Approved
**Date**: 2026-02-15
**Stories**: STORY-005, STORY-006, STORY-007

**Context**:
The hero power flow diagram needs animated lines between Solar/Battery/Home/Grid nodes.

**Decision**:
Use inline SVG with CSS animations and JS-controlled attributes.

**Rationale**:
- SVG scales perfectly on retina displays
- CSS animations for flow lines are GPU-accelerated
- SVG elements are DOM nodes — easy to bind data with JS
- No canvas pixel density issues

**Consequences**:
- SVG markup is verbose — needs to stay within payload budget
- Animation performance depends on browser SVG implementation

---

### ADR-004: Dark Mode Only
**Status**: Approved
**Date**: 2026-02-15
**Stories**: STORY-001, STORY-015

**Context**:
The FE_design.md specifies "Dark mode only" with the aesthetic direction "Calm Control Room."
The original project_idea.md suggested a `theme` URL parameter for dark/light switching.

**Decision**:
Dark mode only. No light theme implementation. The `theme` URL parameter is reserved but ignored.

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Dark only | Focused design, less CSS, faster development | No user choice |
| Dark + Light | User preference | Double the CSS, more testing, diluted design focus |

**Rationale**:
- This is an always-on monitoring dashboard, not a general-purpose app
- Dark backgrounds reduce eye strain and make colored energy flows pop
- Single theme means less CSS, smaller payload, more focused design
- FE_design.md explicitly states "No theme toggle (dark mode only)"

**Consequences**:
- No theme switching in Flutter WebView integration
- CSS custom properties still used for token consistency, but only one set of values
- STORY-014 simplified (no theme change event handling)
- STORY-015 simplified (no light mode verification)

---

## Deployment Strategy

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | `index.html` (local) | Dev with separate source files |
| Production | `dist/dashboard.html` | Single-file, inlined artifact |

### Deployment Method

The build script (`scripts/build.js`) inlines all `src/*.js` and CSS into a single `dist/dashboard.html`. This file is then bundled with the Flutter app assets or hosted at a URL the Flutter app loads in its WebView.

---

## Sign Convention Reference

| Field | Positive means | Negative means |
|-------|---------------|----------------|
| P1 `power_w` | Importing from grid | Exporting to grid |
| P1 `import_power_w` | Importing (always >= 0) | N/A |
| Sungrow `battery_power_w` | Charging | Discharging |
| Sungrow `export_power_w` | Exporting to grid | Importing from grid |
| Sungrow `pv_power_w` | Producing (always >= 0) | N/A |
| Sungrow `load_power_w` | Consuming (always >= 0) | N/A |

---

## Related Documents

- `CLAUDE.md`: Agent workflow rules and gates (highest authority)
- `docs/BACKLOG.md`: Stories, acceptance criteria, progress tracking
- `SKILL.md`: Security guidelines (VibeSec)
- `docs/FE_design.md`: Frontend visual design specification (colors, typography, layout, components, interactions)
- `docs/project_idea.md`: Original project specification and API contracts
