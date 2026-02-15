# Energy Dashboard — Project Handover for Claude Code

## Goal

Build a self-contained HTML/CSS/JS energy dashboard designed to be embedded in a Flutter WebView. The dashboard visualises real-time and historical energy data from a Belgian residential solar + battery + grid setup by fetching from two self-hosted FastAPI backends.

---

## Architecture

```
Flutter App (Mobile)
  └─ WebView loads dashboard.html
       │
       │  JS fetch() calls with Bearer tokens
       ├─────► P1 API   (api.p1.wimluyckx.dev)       → Grid meter data
       ├─────► Sungrow API (api.sungrow.wimluyckx.dev) → Solar + battery data
       └─────► Belgian Energy API (api.belgianenergy.wimluyckx.dev) → Tariffs (future)
```

The dashboard is a **single HTML file** (inline CSS + JS, no build step) that the Flutter app loads in a WebView. Configuration (device IDs, Bearer tokens, theme) is passed via URL query parameters.

---

## API Contracts

### API 1: P1-Edge-VPS (Grid Meter)

**Base URL:** `https://api.p1.wimluyckx.dev`
**Auth:** `Authorization: Bearer <token>` on all `/v1/` endpoints

#### GET /v1/realtime?device_id={id}

Returns the latest P1 smart meter reading.

```json
{
  "device_id": "string",
  "ts": "2026-02-15T10:30:00",
  "power_w": 450,
  "import_power_w": 450,
  "energy_import_kwh": 12345.678,
  "energy_export_kwh": 9876.543
}
```

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | string | P1 meter identifier |
| `ts` | ISO 8601 | Measurement timestamp |
| `power_w` | int (W) | Net grid power. **Positive = importing, negative = exporting** |
| `import_power_w` | int (W) | Import-only power (always ≥ 0) |
| `energy_import_kwh` | float \| null | Cumulative energy imported from grid |
| `energy_export_kwh` | float \| null | Cumulative energy exported to grid |

#### GET /v1/series?device_id={id}&frame={frame}

Returns time-bucketed aggregated grid data.

**Frame options:**

| Frame | Bucket Size | Source View | Time Range |
|-------|-------------|-------------|------------|
| `day` | 1 hour | Hourly aggregate | Today |
| `month` | 1 day | Daily aggregate | Current month |
| `year` | 1 month | Monthly aggregate | Current year |
| `all` | 1 month | Monthly aggregate | All time |

Response shape (the series bucket fields are not yet documented in the OpenAPI spec — assume similar structure to Sungrow series but with P1 fields):

```json
{
  "device_id": "string",
  "frame": "day",
  "series": [
    {
      "bucket": "2026-02-15T08:00:00",
      "...": "aggregated P1 fields"
    }
  ]
}
```

#### GET /v1/capacity/month/{YYYY-MM}?device_id={id}

Returns 15-minute average power peaks for capacity tariff tracking (Belgian "kwartierpiek" / capaciteitstarief).

Response includes a list of quarter-hour peaks and the monthly maximum peak.

#### GET /health

No auth required. Returns `{"status": "ok"}` with DB and Redis status.

---

### API 2: Sungrow-to-VPS (Solar + Battery)

**Base URL:** `https://api.sungrow.wimluyckx.dev`
**Auth:** `Authorization: Bearer <token>` on all `/v1/` endpoints

#### GET /v1/realtime?device_id={id}

Returns the latest inverter sample.

```json
{
  "device_id": "inverter-01",
  "ts": "2026-02-15T10:30:00",
  "pv_power_w": 3450.5,
  "pv_daily_kwh": 12.3,
  "battery_power_w": -1200.0,
  "battery_soc_pct": 85.0,
  "battery_temp_c": 28.5,
  "load_power_w": 1500.0,
  "export_power_w": 750.5,
  "sample_count": 1
}
```

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `device_id` | string | — | Inverter identifier |
| `ts` | ISO 8601 | — | Sample timestamp |
| `pv_power_w` | float | W | Total solar DC production |
| `pv_daily_kwh` | float \| null | kWh | Cumulative PV energy today |
| `battery_power_w` | float | W | **Positive = charging, negative = discharging** |
| `battery_soc_pct` | float | % | Battery state of charge (0–100) |
| `battery_temp_c` | float \| null | °C | Battery temperature |
| `load_power_w` | float | W | Total household consumption |
| `export_power_w` | float | W | **Positive = exporting to grid, negative = importing** |
| `sample_count` | int | — | Number of aggregated raw samples |

#### GET /v1/series?device_id={id}&frame={frame}

Returns time-bucketed aggregated solar/battery data.

**Frame options:** Same as P1 — `day` (hourly), `month` (daily), `year` (monthly), `all` (monthly).

```json
{
  "device_id": "inverter-01",
  "frame": "day",
  "series": [
    {
      "bucket": "2026-02-15T08:00:00",
      "avg_pv_power_w": 1200.5,
      "max_pv_power_w": 2100.0,
      "avg_battery_power_w": -500.0,
      "avg_battery_soc_pct": 72.3,
      "avg_load_power_w": 1100.0,
      "avg_export_power_w": 600.5,
      "sample_count": 60
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `bucket` | ISO 8601 | Start of time bucket |
| `avg_pv_power_w` | float | Average PV power |
| `max_pv_power_w` | float | Peak PV power |
| `avg_battery_power_w` | float | Average battery power |
| `avg_battery_soc_pct` | float | Average battery SoC |
| `avg_load_power_w` | float | Average home load |
| `avg_export_power_w` | float | Average grid export |
| `sample_count` | int | Raw samples in bucket |

#### GET /health

No auth. Returns `{"status": "ok"}`.

---

### API 3: Belgian Energy Tariff API (Future)

**Base URL:** `https://api.belgianenergy.wimluyckx.dev`
**Auth:** API key (not yet available)
**Status:** Not yet integrated — design a placeholder/stub for the cost dashboard section so it can be wired up later.

---

## Sign Convention Reference (Critical)

| Field | Positive means | Negative means |
|-------|---------------|----------------|
| P1 `power_w` | Importing from grid | Exporting to grid |
| Sungrow `battery_power_w` | Charging | Discharging |
| Sungrow `export_power_w` | Exporting to grid | Importing from grid |

---

## Dashboard Sections to Build

### Section A: Live Power Flow Diagram (Hero)

An animated diagram showing real-time energy flow between four nodes: **Solar**, **Battery**, **Home**, **Grid**.

```
         ☀️ Solar
            │
            ▼
   🔋 Battery ◄──► 🏠 Home ◄──► ⚡ Grid
```

- Animated lines flow in the direction of energy transfer
- Line thickness proportional to power magnitude
- Each node shows current power value (W or kW)
- Battery node shows SoC percentage
- Colors: solar = amber/yellow, grid-import = red, grid-export = green, battery = teal/purple
- Updates every **5 seconds** by polling both `/v1/realtime` endpoints

**Data mapping:**
- Solar → Home: `min(pv_power_w, load_power_w)` (solar directly consumed)
- Solar → Battery: `pv_power_w - solar_to_home - solar_to_grid` (when battery charging)
- Solar → Grid: `export_power_w` when positive and solar is producing
- Grid → Home: P1 `import_power_w` (when importing)
- Battery → Home: `abs(battery_power_w)` when discharging (negative)
- Home → Grid: not applicable (grid import is one-directional from home perspective)

### Section B: KPI Strip

Four cards in a horizontal row below the power flow:

1. **Now** — Current net power. "Consuming 1.2 kW" or "Exporting 0.8 kW". Use P1 `power_w`.
2. **Battery** — SoC with visual gauge. "85% 🔋". Use Sungrow `battery_soc_pct`.
3. **Solar Today** — Daily production. "12.3 kWh ☀️". Use Sungrow `pv_daily_kwh`.
4. **Peak** — Monthly capacity peak. "2.1 kW peak". Use P1 `/v1/capacity/month/`.

### Section C: Today's Energy Balance

Horizontal stacked bar or donut chart:
- Solar produced (kWh)
- Self-consumed (kWh)
- Exported to grid (kWh)
- Imported from grid (kWh)
- Battery charged/discharged (kWh)

Below: **self-consumption rate** and **self-sufficiency rate** as percentage indicators.

**Derived formulas:**
- Self-consumption = `1 - (export_kwh / production_kwh)` × 100%
- Self-sufficiency = `1 - (import_kwh / consumption_kwh)` × 100%

Data source: Sungrow `/v1/series?frame=day` for today's hourly buckets, summed.

### Section D: Power Timeline (Last 24h)

Area/line chart showing power over time:
- Solar production (yellow area, above baseline)
- Battery charge/discharge (purple area)
- Grid import/export (red below / green above baseline)
- Home consumption (grey line overlay)

Interactive: tap/hover for exact values at a point in time.

Data source: Sungrow `/v1/series?frame=day` (hourly buckets for today).

### Section E: Cost Dashboard (Stub)

Placeholder section for when the Belgian Energy tariff API key is available:
- Contract selector (provider + product)
- Running cost for current period
- Projected monthly bill
- Breakdown: energy, distribution, taxes, capacity tariff

For now, show a "Connect your energy contract" placeholder card.

### Section F: Monthly Overview

Bar chart of daily production vs consumption for the current month.
Month-over-month comparison if data available.

Data source: Sungrow `/v1/series?frame=month` (daily buckets).

---

## Technical Requirements

### Delivery Format
- **Single self-contained HTML file** — all CSS and JS inline
- No build step, no npm, no framework dependencies
- Lightweight charting: use [Chart.js](https://cdn.jsdelivr.net/npm/chart.js) via CDN or pure SVG for the power flow
- Total payload target: **< 200 KB**

### Configuration via URL Parameters

```
dashboard.html?p1_base=https://api.p1.wimluyckx.dev
               &sungrow_base=https://api.sungrow.wimluyckx.dev
               &p1_token=<bearer_token>
               &sungrow_token=<bearer_token>
               &p1_device_id=<device_id>
               &sungrow_device_id=<device_id>
               &theme=dark
```

The Flutter app constructs this URL and loads it in a WebView.

### Design Specifications
- **Dark mode first** (dark background, light text) — standard for energy dashboards
- **Responsive**: must work at 360px (phone) through 1024px+ (tablet/desktop)
- Large, legible numbers for power values
- Color coding: green = good (self-consuming/exporting), red/orange = importing/costly
- Smooth CSS animations for power flow lines
- **No emojis in production** — use SVG icons for solar, battery, grid, home

### Data Refresh Strategy

| Section | Refresh Interval | Trigger |
|---------|-----------------|---------|
| Power Flow + KPIs | 5 seconds | `setInterval` polling |
| Energy Balance | 60 seconds | `setInterval` polling |
| Timeline chart | 5 minutes | `setInterval` polling |
| Monthly overview | On page load | Single fetch |
| Cost dashboard | On contract change | User-triggered (future) |

### Error Handling
- Show "stale" indicator if API hasn't responded for 30+ seconds
- Show "offline" banner if both APIs are unreachable
- Cache last known values and display with timestamp
- Never show a blank screen — always show last known data or mock placeholder

### Flutter WebView Integration
- Communicate via `window.postMessage` for events (Flutter → Dashboard: token refresh, theme change)
- Dashboard dispatches events back: `window.flutter_inappwebview.callHandler('onEvent', data)` (if using flutter_inappwebview package)
- Fall back to URL parameter reload if postMessage bridge not available

---

## Mock Data for Development

Use this mock data to render the dashboard without live API access:

```javascript
const MOCK_P1_REALTIME = {
  device_id: "p1-meter-01",
  ts: new Date().toISOString(),
  power_w: 450,        // importing 450W from grid
  import_power_w: 450,
  energy_import_kwh: 12345.678,
  energy_export_kwh: 9876.543
};

const MOCK_SUNGROW_REALTIME = {
  device_id: "inverter-01",
  ts: new Date().toISOString(),
  pv_power_w: 3450.5,       // solar producing 3.4kW
  pv_daily_kwh: 12.3,
  battery_power_w: -1200.0, // battery discharging 1.2kW
  battery_soc_pct: 85.0,
  battery_temp_c: 28.5,
  load_power_w: 2700.0,     // home consuming 2.7kW
  export_power_w: 750.5,    // exporting 750W
  sample_count: 1
};

const MOCK_SUNGROW_SERIES_DAY = {
  device_id: "inverter-01",
  frame: "day",
  series: [
    { bucket: "2026-02-15T06:00:00", avg_pv_power_w: 50,   max_pv_power_w: 200,  avg_battery_power_w: -100, avg_battery_soc_pct: 40, avg_load_power_w: 800,  avg_export_power_w: -650, sample_count: 12 },
    { bucket: "2026-02-15T07:00:00", avg_pv_power_w: 500,  max_pv_power_w: 1200, avg_battery_power_w: -300, avg_battery_soc_pct: 35, avg_load_power_w: 1100, avg_export_power_w: -400, sample_count: 60 },
    { bucket: "2026-02-15T08:00:00", avg_pv_power_w: 1500, max_pv_power_w: 2400, avg_battery_power_w: 200,  avg_battery_soc_pct: 45, avg_load_power_w: 1050, avg_export_power_w: 250,  sample_count: 60 },
    { bucket: "2026-02-15T09:00:00", avg_pv_power_w: 2800, max_pv_power_w: 3600, avg_battery_power_w: 500,  avg_battery_soc_pct: 58, avg_load_power_w: 1200, avg_export_power_w: 600,  sample_count: 60 },
    { bucket: "2026-02-15T10:00:00", avg_pv_power_w: 3400, max_pv_power_w: 4100, avg_battery_power_w: 800,  avg_battery_soc_pct: 72, avg_load_power_w: 1300, avg_export_power_w: 500,  sample_count: 60 },
    { bucket: "2026-02-15T11:00:00", avg_pv_power_w: 3800, max_pv_power_w: 4500, avg_battery_power_w: 400,  avg_battery_soc_pct: 82, avg_load_power_w: 1500, avg_export_power_w: 1500, sample_count: 60 },
    { bucket: "2026-02-15T12:00:00", avg_pv_power_w: 3600, max_pv_power_w: 4200, avg_battery_power_w: 100,  avg_battery_soc_pct: 88, avg_load_power_w: 2000, avg_export_power_w: 1200, sample_count: 60 },
    { bucket: "2026-02-15T13:00:00", avg_pv_power_w: 3200, max_pv_power_w: 3900, avg_battery_power_w: 0,    avg_battery_soc_pct: 90, avg_load_power_w: 1800, avg_export_power_w: 1400, sample_count: 60 },
    { bucket: "2026-02-15T14:00:00", avg_pv_power_w: 2500, max_pv_power_w: 3200, avg_battery_power_w: -200, avg_battery_soc_pct: 88, avg_load_power_w: 1600, avg_export_power_w: 500,  sample_count: 60 },
    { bucket: "2026-02-15T15:00:00", avg_pv_power_w: 1200, max_pv_power_w: 2000, avg_battery_power_w: -600, avg_battery_soc_pct: 80, avg_load_power_w: 1400, avg_export_power_w: -200, sample_count: 60 }
  ]
};

const MOCK_P1_CAPACITY = {
  device_id: "p1-meter-01",
  month: "2026-02",
  peaks: [
    { ts: "2026-02-03T18:15:00", avg_power_w: 4200 },
    { ts: "2026-02-07T19:00:00", avg_power_w: 3800 },
    { ts: "2026-02-12T17:45:00", avg_power_w: 5100 }
  ],
  monthly_peak_w: 5100,
  monthly_peak_ts: "2026-02-12T17:45:00"
};
```

Toggle between mock and live data with a URL parameter: `&mock=true`.

---

## File Structure (Suggested)

```
energy-dashboard/
├── index.html          # The single-file dashboard (CSS + JS inline)
├── README.md           # Setup instructions
└── mock-server/        # Optional: tiny Express/Python server for local dev
    └── server.js       # Serves mock API responses on localhost
```

---

## Priority Order

1. **Power Flow Diagram** (Section A) — the centerpiece, get this right first
2. **KPI Strip** (Section B) — quick wins, high visibility
3. **Power Timeline** (Section D) — most useful chart
4. **Energy Balance** (Section C) — daily summary
5. **Monthly Overview** (Section F) — historical context
6. **Cost Dashboard stub** (Section E) — placeholder for future tariff integration

---

## Reference: Sungrow Data Model (Full)

The Sungrow edge daemon reads these Modbus registers from the inverter every 5 seconds:

| SungrowSample Field | Type | Unit | Sign Convention |
|---------------------|------|------|-----------------|
| `pv_power_w` | float | W | Always ≥ 0 (DC solar production) |
| `pv_daily_kwh` | float | kWh | Cumulative today, resets at midnight |
| `battery_power_w` | float | W | + charging, − discharging |
| `battery_soc_pct` | float | % | 0–100 |
| `battery_temp_c` | float | °C | Battery temperature |
| `load_power_w` | float | W | Always ≥ 0 (household consumption) |
| `export_power_w` | float | W | + exporting, − importing |

The underlying Modbus registers also provide (available in raw data, may not be in API):
- MPPT1/MPPT2 voltage and current (per-string solar data)
- Total lifetime PV generation (kWh)
- Daily battery charge/discharge (kWh)
- Grid power (separate from export_power)
- Daily direct solar consumption (kWh)

## Reference: TimescaleDB Continuous Aggregates

Both APIs use TimescaleDB with continuous aggregate views at three granularities:

| View | Bucket | Used by frame |
|------|--------|--------------|
| `*_hourly` | 1 hour | `day` |
| `*_daily` | 1 day | `month` |
| `*_monthly` | 1 month | `year`, `all` |

Each bucket computes: avg, max for power fields + sample_count.
