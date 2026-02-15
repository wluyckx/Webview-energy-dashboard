# Energy Dashboard — Frontend Design Prompt

> Use this prompt as input for Lovable, Figma Make, or similar AI design tools to generate the dashboard UI.

---

## Product Context

Design a **residential energy monitoring dashboard** for a Belgian homeowner with rooftop solar panels, a home battery, and a smart meter. The dashboard is the primary interface embedded inside a mobile app (Flutter WebView), but must also work on tablet and desktop for quick checks.

**User profile:** Tech-savvy homeowner who installed solar + battery to save money and reduce grid dependence. Checks the dashboard 5–10 times per day — quick glances during the day ("am I exporting?"), deeper dives in the evening ("how did today go?"). Values clarity and data density over decoration.

**Core question the dashboard answers in < 2 seconds:** "Where is my energy going right now?"

---

## Design Direction

### Aesthetic: "Calm Control Room"

Think: Tesla Powerwall app meets a Dieter Rams–designed instrument panel. Restrained, confident, information-dense but never cluttered. The feeling of being in quiet control of your home's energy.

- **Dark mode only** — this is an always-on monitoring tool, not a marketing page. Dark backgrounds reduce eye strain and make colored energy flows pop.
- **Data-first** — every pixel earns its place. No decorative illustrations, no stock imagery, no filler cards.
- **Purposeful color** — color is reserved for meaning (energy flow direction, status, alerts). The UI chrome itself is neutral.
- **Smooth, physical feel** — subtle transitions that feel like real gauges moving, not web page animations. Fluid number counters, gentle glow on active flows.

### Not This

- ❌ Neon/cyberpunk gamer aesthetic
- ❌ Bright white SaaS dashboard with blue accents
- ❌ Skeuomorphic gauges and dials
- ❌ Cluttered smart home app with too many tiles
- ❌ Generic admin template with sidebar navigation

### Reference Products (for mood, not copying)

- **Tesla Powerwall app** — clean power flow animation, dark UI, large readable numbers
- **Home Assistant Energy Dashboard** — energy flow cards, daily balance visualization
- **Smappee app** — Belgian energy monitoring, capacity tariff tracking
- **Linear app** — for UI craft quality (typography, spacing, subtle animation)
- **Arc browser** — for how to make a dark UI feel warm, not cold

---

## Color System

### Background Layers

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#0A0E14` | Page background — near-black with a hint of blue |
| `--bg-surface` | `#111820` | Card/panel background |
| `--bg-elevated` | `#1A2230` | Hover states, active cards, popover backgrounds |
| `--bg-subtle` | `#0D1219` | Recessed areas, chart backgrounds |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#E8ECF1` | Primary text, large numbers |
| `--text-secondary` | `#8899AA` | Labels, descriptions, secondary info |
| `--text-tertiary` | `#4A5568` | Disabled, timestamps, fine print |

### Energy Flow Colors (the heart of the palette)

| Token | Hex | Meaning |
|-------|-----|---------|
| `--solar` | `#F6B93B` | Solar production — warm amber/gold |
| `--solar-glow` | `#F6B93B33` | Solar glow effect (20% opacity) |
| `--battery-charge` | `#6C5CE7` | Battery charging — electric purple |
| `--battery-discharge` | `#A29BFE` | Battery discharging — soft lavender |
| `--grid-import` | `#E17055` | Importing from grid — warm coral/red |
| `--grid-export` | `#00B894` | Exporting to grid — fresh green |
| `--home` | `#DFE6E9` | Home consumption — neutral light grey |

### Status & Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#00B894` | Good status, money saved, exporting |
| `--warning` | `#FDCB6E` | Approaching capacity peak, battery low |
| `--danger` | `#E17055` | High import, peak exceeded, offline |
| `--accent` | `#74B9FF` | Interactive elements, links, focus rings |

### Borders & Dividers

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#1E2A3A` | Card borders, dividers |
| `--border-focus` | `#74B9FF` | Focus rings for accessibility |

---

## Typography

### Font Pairing

- **Numbers / Data:** Use a **tabular-lining monospace or semi-mono** typeface so digits don't shift width when counters animate. Recommendation: **JetBrains Mono**, **IBM Plex Mono**, or **SF Mono**. The power values (e.g., "3.4 kW") are the most important text on the screen — they must be instantly legible at a glance.
- **Labels / Body:** A clean, humanist sans-serif with good readability at small sizes. Recommendation: **DM Sans**, **Nunito Sans**, or **Plus Jakarta Sans**. Not Inter or Roboto — those are too generic.
- **Section Headers:** Same as body font but in medium/semibold weight.

### Type Scale

| Role | Size | Weight | Font |
|------|------|--------|------|
| Hero power value | 40–48px | 700 | Mono/data font |
| Node power label | 20–24px | 600 | Mono/data font |
| KPI value | 28–32px | 700 | Mono/data font |
| KPI label | 12–13px | 500 | Body font, uppercase, letter-spaced |
| Section heading | 16–18px | 600 | Body font |
| Body text | 14px | 400 | Body font |
| Caption / timestamp | 11–12px | 400 | Body font, `--text-tertiary` |
| Unit suffix (kW, %, kWh) | 60% of parent | 400 | Body font, `--text-secondary` |

**Key rule:** Units (kW, kWh, %, °C) are always displayed in a lighter weight and smaller size than the number itself. "3.4" is bold and large, "kW" is lighter and smaller, right next to it.

---

## Layout Structure

### Mobile-First (360–414px)

Single-column, vertically scrollable. The power flow diagram takes the full viewport height minus a slim status bar at top.

```
┌──────────────────────────┐
│  Status Bar (slim)       │  ← connectivity indicator, last update time
├──────────────────────────┤
│                          │
│   Power Flow Diagram     │  ← 60-70% of viewport height
│   (Solar/Battery/Home/   │
│    Grid with animated    │
│    flow lines)           │
│                          │
├──────────────────────────┤
│  KPI Strip (4 cards)     │  ← horizontal scroll or 2×2 grid
├──────────────────────────┤
│  Energy Balance (today)  │  ← stacked bar + percentages
├──────────────────────────┤
│  Power Timeline (24h)    │  ← area chart, full width
├──────────────────────────┤
│  Monthly Overview        │  ← bar chart
├──────────────────────────┤
│  Cost Dashboard (stub)   │  ← placeholder card
└──────────────────────────┘
```

### Tablet / Desktop (768px+)

Two-column layout below the power flow:

```
┌────────────────────────────────────────────┐
│  Status Bar                                │
├────────────────────────────────────────────┤
│                                            │
│        Power Flow Diagram (centered)       │
│                                            │
├────────────────────────────────────────────┤
│  KPI 1  │  KPI 2  │  KPI 3  │  KPI 4     │
├─────────────────────┬──────────────────────┤
│  Energy Balance     │  Power Timeline      │
│  (today)            │  (24h area chart)    │
├─────────────────────┴──────────────────────┤
│  Monthly Overview (full width bar chart)   │
├────────────────────────────────────────────┤
│  Cost Dashboard stub                       │
└────────────────────────────────────────────┘
```

### Spacing System

Use an 8px base grid: `4, 8, 12, 16, 24, 32, 48, 64`.
- Card padding: 20–24px
- Gap between cards: 12–16px
- Section gap: 32–48px
- Page padding (mobile): 16px horizontal

---

## Component Designs

### Component 1: Power Flow Diagram (Hero)

The centerpiece of the entire dashboard. A schematic showing four energy nodes with animated connection lines between them.

**Node Layout (diamond/cross arrangement):**

```
              ☀️ SOLAR
             3.4 kW
               │
               │ (amber animated dots flowing down)
               │
🔋 BATTERY ───┼─── 🏠 HOME
   85%         │     2.7 kW
  -1.2 kW     │
               │
               │ (green dots flowing down = exporting)
               │
             ⚡ GRID
            +0.5 kW
```

**Node Design:**
- Each node is a rounded square (56–72px) with a subtle background matching its energy color at ~10% opacity
- Icon inside: simple, geometric SVG icon (not emoji). Solar = sun rays, Battery = rectangle with level indicator, Home = house outline, Grid = pylon/lightning
- Power value displayed below each node in the data font
- Battery node additionally shows SoC as a fill-level inside the icon and percentage text

**Flow Lines:**
- SVG paths connecting the nodes
- Active flows: animated dots/dashes traveling along the path in the direction of energy transfer
- Line color matches the source node's energy color
- Line opacity/thickness proportional to power magnitude (0W = invisible, 5000W = thick and bright)
- Inactive flows: very faint dashed line at ~10% opacity (shows the connection exists but no energy flowing)

**Animation Style:**
- CSS `stroke-dashoffset` animation for flowing dashes, or small circles moving along an SVG `<path>` using `<animateMotion>`
- Speed: moderate, calming — not frantic. ~3 second loop per flow cycle
- When power values update (every 5s), numbers should animate/count to the new value over ~400ms (not snap)

**Glow Effect:**
- Active nodes have a subtle radial glow in their energy color (CSS `box-shadow` or SVG `<filter>`)
- The solar node glows amber when producing, dims to neutral at night

### Component 2: KPI Strip

Four cards in a horizontal row. Each card is a compact, vertically-stacked information unit.

**Card anatomy:**
```
┌─────────────────┐
│  LABEL           │  ← 11px, uppercase, letter-spaced, --text-secondary
│  VALUE UNIT      │  ← 28px bold number + 16px light unit
│  ▪ subtext       │  ← 11px, optional context line
└─────────────────┘
```

**The four KPIs:**

1. **Grid Now**
   - Label: "GRID"
   - Value: "450 W" or "−0.8 kW"
   - Subtext: "importing" (coral) or "exporting" (green)
   - Left color accent bar: coral when importing, green when exporting

2. **Battery**
   - Label: "BATTERY"
   - Value: "85%"
   - Visual: thin horizontal progress bar below the value, filled in purple, with glow at the fill edge
   - Subtext: "charging 1.2 kW" (purple) or "discharging" (lavender)

3. **Solar Today**
   - Label: "SOLAR TODAY"
   - Value: "12.3 kWh"
   - Subtext: "producing 3.4 kW" (amber)

4. **Peak Demand**
   - Label: "MONTH PEAK"
   - Value: "5.1 kW"
   - Visual: thin progress bar showing peak vs a 2.5 kW reference line (Belgian capacity tariff average)
   - Subtext: "Feb 12, 17:45" (timestamp of peak occurrence)
   - Color: green if under threshold, warning yellow if approaching, coral/red if exceeded

**Card styling:**
- Background: `--bg-surface`
- Border: 1px `--border-subtle`
- Border-radius: 12px
- Subtle left accent bar (3px wide, rounded) in the KPI's semantic color
- On mobile: horizontally scrollable or 2×2 grid

### Component 3: Energy Balance (Today)

A horizontal stacked bar showing today's energy flows in kWh, with percentage badges below.

**Bar design:**
- Full-width horizontal bar (height: 32–40px, border-radius: 8px)
- Segments (left to right): Solar self-consumed (amber), Battery discharged (lavender), Grid imported (coral)
- The bar represents total consumption; segments show the source breakdown
- Each segment has a subtle inner border to separate them
- Hover/tap on a segment shows a tooltip with the exact kWh value

**Below the bar: two metric badges**

```
┌──────────────────┐  ┌──────────────────┐
│ Self-consumption │  │ Self-sufficiency  │
│      78%         │  │      62%          │
└──────────────────┘  └──────────────────┘
```

- Badge style: rounded pill with the percentage in bold, label above in small caps
- Background: very subtle tint of green at ~5% opacity
- The percentage itself in `--success` green

**Summary row below badges:**

```
☀️ 18.4 kWh produced  │  ⬆️ 6.2 kWh exported  │  ⬇️ 3.1 kWh imported
```

Compact, single-line, icon + value pairs in `--text-secondary`.

### Component 4: Power Timeline (24h Chart)

A stacked area chart showing power over today's hours.

**Chart design:**
- X-axis: hours (06:00, 07:00, ... current hour). Clean, minimal tick labels in `--text-tertiary`
- Y-axis: power in kW. Auto-scaled. Label on the left side.
- Zero line: thin horizontal line at 0 kW, slightly emphasized

**Areas (layered back to front):**
- Solar production: amber fill with ~30% opacity, solid amber top edge
- Grid export (above 0): green fill with ~20% opacity
- Grid import (below 0): coral fill with ~20% opacity, mirrored below the zero line
- Battery: purple fill, above 0 when charging, below 0 when discharging

**Home consumption overlay:** A single grey line (2px, `--home` color) showing total load.

**Interaction:**
- Touch/hover on the chart shows a vertical crosshair line with a floating tooltip card displaying exact values for that hour
- Tooltip card: dark elevated background, lists all metrics for that bucket with colored dots as legends

**Chart styling:**
- No chart borders or box — the chart area bleeds to card edges
- Soft grid lines at y-axis intervals: 1px, `--border-subtle`, dashed
- Area fills use CSS/SVG gradients that fade to transparent at the bottom
- Smooth curve interpolation (not jagged step lines)

### Component 5: Monthly Overview

A vertical bar chart showing daily totals for the current month.

**Bar design:**
- Each day is a paired bar: solar production (amber, upward) and net consumption (coral/green, downward)
- If net export for the day: the consumption bar is green (good day!)
- If net import: the consumption bar is coral
- Current day's bar is highlighted with a brighter fill or a subtle pulse
- X-axis: day numbers (1, 2, 3, ... 28/30/31)
- Y-axis: kWh

**Header row:**
```
February 2026                    ← 14.2 kWh avg/day
```
Month name on the left, a summary stat on the right.

### Component 6: Cost Dashboard (Stub/Placeholder)

A card with a coming-soon state that looks intentional, not broken.

**Design:**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│    ⚡ Cost Tracking                              │
│                                                  │
│    Connect your energy contract to see           │
│    real-time costs, projected bills, and         │
│    savings from solar + battery.                 │
│                                                  │
│    [ Set up contract → ]                         │
│                                                  │
└─────────────────────────────────────────────────┘
```

- Muted card with dashed border (`--border-subtle`, dashed)
- Icon + heading in `--text-primary`
- Description in `--text-secondary`
- CTA button: ghost/outline style with `--accent` color
- The whole card has a subtle glass/frosted overlay effect to signal "coming soon" without looking broken

### Component 7: Status Bar (Top)

A slim (32–40px) top bar showing system health at a glance.

```
● Live    Last update: 14:32:05    🔋 85%    ☀️ 3.4 kW
```

- Green dot + "Live" when both APIs are responding
- Yellow dot + "Delayed" if data is > 30s stale
- Red dot + "Offline" if APIs unreachable
- Last update timestamp in `--text-tertiary`
- Compact battery + solar readout as a quick-glance strip (optional, since these are also in the main view)

---

## Micro-Interactions & Animation

### Number Transitions
When power values update (every 5s), animate from old to new value using a counting animation (~400ms, ease-out). Numbers should never snap or jump.

### Flow Line Pulses
When the power flow changes direction (e.g., from importing to exporting), the flow line should briefly flash brighter and then settle into the new color/direction. ~300ms transition.

### Card Hover (Desktop)
Cards lift slightly on hover: `transform: translateY(-2px)` + subtle increase in `box-shadow`. Transition: 200ms ease.

### Battery SoC Animation
The battery fill level animates smoothly when SoC changes. If SoC drops below 20%, the battery icon and value pulse gently in `--warning` yellow.

### Skeleton Loading
On initial load, show skeleton placeholders (animated shimmer in `--bg-elevated` → `--bg-surface`) for each component. The skeleton shapes should match the actual component layout.

### Stale Data Indicator
If a section hasn't received fresh data for 30+ seconds, overlay a subtle `--warning` tinted badge: "Data from 45s ago". The section content remains visible but slightly dimmed.

---

## Responsive Breakpoints

| Breakpoint | Layout | Power Flow Size | KPI Layout |
|------------|--------|----------------|------------|
| < 380px | Single column, compact | 280×280px | 2×2 grid |
| 380–414px | Single column | 340×340px | 2×2 grid |
| 415–767px | Single column, spacious | 400×400px | 4-column row |
| 768–1023px | Two-column below flow | 450×450px | 4-column row |
| 1024px+ | Two-column, centered max-width 1200px | 500×500px | 4-column row |

---

## Accessibility Requirements

- All colors meet WCAG AA contrast ratio (4.5:1 for text, 3:1 for large text)
- Flow line animations can be disabled via `prefers-reduced-motion` media query
- Chart data is accessible via screen reader (aria-labels with current values)
- Focus rings visible on all interactive elements (`--border-focus`)
- Touch targets: minimum 44×44px on mobile

---

## What NOT to Include

- No sidebar navigation (single-page dashboard, all sections scroll vertically)
- No login/auth UI (handled by the parent Flutter app)
- No settings panel (configuration via URL parameters)
- No notification system or toast messages
- No footer
- No onboarding wizard
- No hamburger menu
- No theme toggle (dark mode only)
- No language selector (English only for now)
