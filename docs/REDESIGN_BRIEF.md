# Energy Dashboard — Re-design Brief (Lovable)

> Input brief for the Lovable design agent. The generated screens become the
> authoritative frontend; this repo's architecture will be re-based on them.
> Supersedes `docs/FE_design.md` as the *visual* source once screens land —
> FE_design.md's token system and design direction are carried forward
> unchanged below and remain binding.

---

## 1. Product context

A **residential energy monitoring dashboard** for a Belgian homeowner with
rooftop solar, a home battery (Sungrow inverter), and a P1 smart meter.

- **Primary surface**: embedded in a Flutter mobile app WebView. Phone-first,
  360–414 px. Must also hold up on tablet and desktop.
- **User**: tech-savvy homeowner who installed solar + battery to save money and
  cut grid dependence. Opens it 5–10× a day — quick glances during the day
  ("am I exporting right now?"), a deeper look in the evening ("how did today
  go?", "did the battery carry us through dinner?").
- **The question the dashboard answers in under 2 seconds**: *where is my energy
  going right now?*
- **The question it should start answering**: *am I about to get charged for a
  new monthly peak?* (Belgian capacity tariff — see §6.)

## 2. Why re-design

A working v1 exists (vanilla JS, single HTML file). It is functionally
complete but visually and interactively under-delivered against its own spec:

- Every number **hard-snaps** on each 5-second poll — no counting animation,
  which was specified and never built. The dashboard feels like a page, not an
  instrument.
- **No loading state.** Cards show a literal "Waiting for data" string.
- **No per-section staleness.** One global status dot; a section showing
  10-minute-old numbers looks identical to a live one.
- **Battery has no visual anywhere** — no fill level in the node icon, no
  progress bar on the card. Just "85%" as text.
- **The Peak Demand card omits its entire point** — it shows a number and a
  timestamp, with no reference threshold, no progress, no colour escalation.
  For a Belgian user this card is the one that maps to money.
- Flow lines don't react to direction changes; the solar node's glow is static
  day and night; grid card accent never switches colour.

Treat v1 as a functional reference, not a visual one. Re-design freely within
the design system in §4.

## 3. Runtime constraints (non-negotiable)

1. **Dark mode only.** No light theme, no toggle, no system-preference switch.
   This is an always-on instrument; dark backgrounds make the energy colours
   carry meaning.
2. **No authentication UI.** The parent Flutter app owns identity. No login,
   signup, profile, or account screens.
3. **No navigation chrome.** No sidebar, hamburger, tab bar, footer, or
   onboarding. The main dashboard is one vertically scrolling page; detail views
   are pushed routes.
4. **No settings panel.** Configuration arrives via URL parameters from the
   host app.
5. **Offline-tolerant.** The network drops. Every component needs a defined
   loading, stale, and offline appearance — never a blank screen, never a raw
   error string.
6. **Touch targets ≥ 44 × 44 px.** All animation respects
   `prefers-reduced-motion`. Text meets WCAG AA (4.5:1; 3:1 for large).
7. **Frontend only.** No database, no backend, no Supabase, no auth provider,
   no edge functions. Drive everything from a mock data layer in the client.

## 4. Design system — carry forward unchanged

Direction: **"Calm Control Room."** Tesla Powerwall app meets a Dieter
Rams instrument panel. Restrained, confident, information-dense, never
cluttered. Data-first — every pixel earns its place, no decorative
illustration or stock imagery. Colour is reserved for *meaning* (flow
direction, status); the UI chrome itself stays neutral. Motion should feel
like a real gauge settling, not a web transition.

**Explicitly not**: neon/cyberpunk, bright white SaaS with blue accents,
skeuomorphic dials, cluttered smart-home tile grids, generic admin templates.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#0A0E14` | Page background — near-black, hint of blue |
| `--bg-surface` | `#111820` | Card / panel background |
| `--bg-elevated` | `#1A2230` | Hover, active, popover |
| `--bg-subtle` | `#0D1219` | Recessed areas, chart backgrounds |
| `--text-primary` | `#E8ECF1` | Primary text, large numbers |
| `--text-secondary` | `#8899AA` | Labels, descriptions |
| `--text-tertiary` | `#4A5568` | Timestamps, fine print, disabled |
| `--solar` | `#F6B93B` | Solar production — warm amber |
| `--battery-charge` | `#6C5CE7` | Battery charging — electric purple |
| `--battery-discharge` | `#A29BFE` | Battery discharging — soft lavender |
| `--grid-import` | `#E17055` | Importing — warm coral |
| `--grid-export` | `#00B894` | Exporting — fresh green |
| `--home` | `#DFE6E9` | Home consumption — neutral light grey |
| `--success` | `#00B894` | Good status, savings, exporting |
| `--warning` | `#FDCB6E` | Approaching peak, battery low |
| `--danger` | `#E17055` | High import, peak exceeded, offline |
| `--accent` | `#74B9FF` | Interactive, links, focus rings |
| `--border-subtle` | `#1E2A3A` | Card borders, dividers |
| `--border-focus` | `#74B9FF` | Focus rings |

### Typography

- **Numbers/data**: tabular-lining mono so digits don't shift width while
  counters animate — **JetBrains Mono** (or IBM Plex Mono). Power values are the
  most important text on screen.
- **Labels/body**: humanist sans — **DM Sans** (or Plus Jakarta Sans).
  Not Inter, not Roboto.
- Scale: hero value 40–48/700 · node label 20–24/600 · KPI value 28–32/700 ·
  KPI label 12–13/500 uppercase letter-spaced · section heading 16–18/600 ·
  body 14/400 · caption 11–12/400.
- **Hard rule**: units (kW, kWh, %, °C) are always smaller and lighter than the
  number. "3.4" large and bold; "kW" small and light beside it.

### Spacing

8 px base grid: 4, 8, 12, 16, 24, 32, 48, 64. Card padding 20–24. Gap between
cards 12–16. Section gap 32–48. Mobile page padding 16 horizontal.

## 5. Data contract — design only against these fields

Two REST APIs. **Do not invent metrics.** If a design needs a number not listed
here, call it out rather than assuming it exists.

**P1 smart meter — realtime** (5 s): `power_w` (**signed: positive = importing,
negative = exporting — this is the authoritative source for grid direction**),
`import_power_w` (≥ 0), `energy_import_kwh`, `energy_export_kwh` (cumulative
meter totals), `ts`.

**P1 — monthly capacity** (`/v1/capacity/month/YYYY-MM`): `monthly_peak_w`,
`monthly_peak_ts`, and `peaks[]` — an array of `{ts, avg_power_w}` giving every
recorded peak this month. *Currently underused; §6 depends on it.*

**Sungrow inverter — realtime** (5 s): `pv_power_w` (≥ 0, AC output),
`pv_daily_kwh`, `battery_power_w` (**positive = charging, negative =
discharging**), `battery_soc_pct` (0–100), `battery_temp_c`, `load_power_w`
(≥ 0, house consumption).

> ⚠️ `export_power_w` exists in the Sungrow payload but is **always 0** on this
> inverter's firmware. Never design against it. Grid direction comes from P1
> `power_w`.

**Sungrow — series** (`?frame=day|month|year`): buckets of
`{bucket, avg_pv_power_w, max_pv_power_w, avg_battery_power_w,
avg_battery_soc_pct, avg_load_power_w}`. `day` = hourly, `month` = daily,
`year` = monthly. Note `avg_battery_soc_pct` — a full state-of-charge curve is
available and currently unused.

Poll cadence: realtime 5 s · balance 60 s · timeline 5 min.

## 6. Screens to design

### Screen 1 — Main dashboard (the core scroll)

Vertical, single column on phone; two-column below the hero from 768 px.

1. **Status bar** (slim, sticky). Live / Delayed / Offline dot + last-update
   time. Optional quick-glance battery % and solar kW.
2. **Power flow diagram — the hero.** Four nodes (Solar top, Battery left, Home
   centre, Grid right) with animated connection lines. Node = rounded square,
   geometric SVG icon (not emoji), power value beneath in the data font.
   Line colour = source node's energy colour; thickness and opacity scale with
   magnitude; inactive connections stay as faint dashed hints. Battery node
   shows SoC as an actual **fill level inside the icon**. Solar node glows amber
   while producing and dims to neutral at night. When flow direction flips, the
   line flashes brighter then settles (~300 ms).
3. **KPI strip** — four cards (2×2 on phone, row of 4 from 415 px):
   - **Grid** — signed value, "importing"/"exporting" subtext, **left accent bar
     that switches coral ↔ green with direction**.
   - **Battery** — SoC %, **thin progress bar with a glow at the fill edge**,
     "charging 1.2 kW" / "discharging 0.8 kW". Below 20 %, pulse gently in
     `--warning`.
   - **Solar today** — kWh cumulative, "producing 3.4 kW" subtext.
   - **Month peak** — see Screen 3; this card is the entry point.
4. **Energy balance (today)** — horizontal stacked bar of *sources* covering
   today's consumption: solar self-consumed (amber), battery discharged
   (lavender), grid imported (coral). Tap a segment for exact kWh. Below it two
   pill badges — self-consumption % and self-sufficiency % — then a compact
   summary line: produced / exported / imported.
5. **Power timeline (24 h)** — area chart over today's hours. Solar amber above
   zero; grid export green above, grid import coral mirrored below the zero
   line; battery purple above when charging, below when discharging; home
   consumption as a single grey line overlay. Emphasised zero line. Touch shows
   a crosshair with a floating tooltip listing every series for that hour.
   **Add a battery SoC curve as a secondary axis** — the data exists and answers
   the evening question directly.
6. **Monthly overview** — daily bars for the current month. Header row: month
   name left, "14.2 kWh avg/day" right. Paired bars — solar production up, net
   grid down; a net-export day's bar turns green. Today's bar highlighted.
7. **Cost tracking (stub)** — a deliberately unfinished card that reads as
   *coming soon*, not broken. Icon, heading, one sentence, ghost CTA. Frosted
   overlay treatment.

### Screen 2 — Grid detail

Pushed from the Grid KPI card. Large signed power readout, live area chart of
the last ~5 minutes (import above zero, export below), and **Live / Day / Month
/ Year** segmented tabs. Day/Month/Year show import-vs-export bars per bucket,
with period totals in the header. Import purple-leaning, export emerald — this
view may depart slightly from the main palette to read as its own space, as long
as import/export stay unambiguous.

### Screen 3 — Capacity peak (the new one, highest value)

Belgium bills residential customers on the **highest 15-minute average import
of the month**, so a single careless moment sets the bill. This screen turns
monitoring into avoidance.

- Big current monthly peak in kW, with the date and time it happened.
- A **gauge or threshold bar** against a 2.5 kW reference (the Belgian
  residential average), colour-escalating green → `--warning` → `--danger`.
- **Live headroom**: "you're at 62 % of this month's peak right now" — the
  single most actionable number on the whole dashboard.
- A chart of `peaks[]` across the month so the user sees which days spiked.
- A plain-language line explaining what the peak costs and what sets it.

### Required states (design all three, they are not edge cases)

- **Skeleton loading** — shimmer placeholders matching each component's real
  layout. This is the first thing the user sees on every cold open.
- **Stale section** — a `--warning`-tinted badge ("Data from 45s ago"), content
  still visible but slightly dimmed.
- **Offline** — a top banner, with last-known values retained and visibly
  marked as historical.

## 7. Motion

- **Numbers count to their new value over ~400 ms ease-out. They never snap.**
  This is the single biggest quality lever in the whole brief.
- Flow lines: dashes travelling along the path, ~3 s loop, calm not frantic.
- Battery fill animates smoothly on SoC change.
- Cards lift ~2 px with a deepened shadow on desktop hover, 200 ms.
- Every animation collapses under `prefers-reduced-motion`.

## 8. Integration seam

The generated screens will be integrated into this repo as-is, so:

- Keep every component **presentational and prop-driven**. No component fetches
  its own data.
- Route **all** live values through a single data layer — one hook or context
  (e.g. `useEnergyData()`) backed by one mock module — so replacing mock with
  the real API is a single-file change.
- Type the data shapes explicitly against §5, with the sign conventions written
  into the type comments.

## 9. Out of scope

No login/auth, no sidebar or hamburger, no settings panel, no notifications or
toasts, no footer, no onboarding, no theme toggle, no language selector, no
backend or database.
