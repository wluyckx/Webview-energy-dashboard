/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured verbatim from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E05. See lovable/MANIFEST.md.
 *
 * PORT NOTES:
 * - DETERMINISM: no `Math.random()` and no `Date.now()` anywhere. Randomness is
 *   the hash `seeded(n) = frac(Math.sin(n * 12.9898) * 43758.5453)` — pure.
 *   Clock coupling instead, via `new Date()` DEFAULT PARAMETERS at six call
 *   sites: `getSnapshot(now = new Date())`, `getDaySeries(now = new Date())`,
 *   `getCapacity(now = new Date())`, `getMonthDays(now = new Date())`,
 *   `getGridLive(now = new Date())`, `getGridBuckets(frame, now = new Date())`.
 *   Derived clock reads: `hourFloat()` = `getHours() + getMinutes()/60 +
 *   getSeconds()/3600` (ms ignored); `getSnapshot`'s `jitter =
 *   1 + (seeded(now.getSeconds() + now.getMinutes()*60) - 0.5) * 0.12`;
 *   `getGridLive` uses `new Date(now.getTime() - i*5000)` and
 *   `seeded(t.getTime() / 5000)`; `getCapacity`/`getMonthDays` use
 *   `now.getDate()`, `now.getMonth()`, `now.getFullYear()` and construct
 *   `new Date(y, m, d, 18, 45, 0)` / `(y, m, d, 8, 15, 0)`; `getDaySeries` does
 *   `new Date(now); bucket.setHours(hr, 0, 0, 0)`; year branch of
 *   `getGridBuckets` does `new Date(now.getFullYear(), m, 1)` and
 *   `.slice(0, now.getMonth() + 1)`. CONSEQUENCE: two calls at the same instant
 *   return identical data — every function is a pure function of `now` at
 *   whole-second resolution, so the module is testable by injecting a fixed
 *   `now`. It is NOT stable across time (output changes every second via
 *   `jitter`/`hourFloat`, and every 5 s in `getGridLive`), and NOT stable
 *   across timezones: all reads are local-time while all emitted timestamps go
 *   through `toISOString()` (UTC). At port, pin `now` (and TZ) in tests rather
 *   than the module internals. Note `new Date(y, m, d).toISOString().slice(0,10)`
 *   in `getMonthDays` yields the PREVIOUS calendar day for UTC+ zones such as
 *   Europe/Brussels — a real off-by-one to fix at port, left as-is here.
 *   Perf: `getGridLive` calls `socNow(t)` inside its 61-sample loop and
 *   `socNow` re-integrates from midnight each time (O(n^2)).
 * - INVENTED CONTRACT (R1): grid history buckets are the mock's own invention.
 *   `getGridBuckets()` emits `GridBucket` = `{ bucket, import_kwh, export_kwh }`
 *   for all three frames (day/month/year). No such shape has ever been captured
 *   from the live P1 `/v1/series` endpoint — Architecture.md:410 records the
 *   bucket field names as never captured, and :432 already flags this exact
 *   `{bucket, import_kwh, export_kwh}` as an invention. Values are synthesized
 *   from the Sungrow-side simulation (`avg_load - avg_pv + avg_battery`), not
 *   from any P1 series field. Do not treat as a contract; blocked on E7 capture.
 *   Other invented (i.e. not in Architecture.md's API tables) shapes, all
 *   client-side view models rather than claimed API responses: `MonthlyDay` =
 *   `{ date, solar_kwh, net_grid_kwh }`; `EnergyBalanceToday` =
 *   `{ solar_self_consumed_kwh, battery_discharged_kwh, grid_imported_kwh,
 *   produced_kwh, exported_kwh }`; `GridSample` = `{ ts, power_w }` (both
 *   fields are documented realtime fields, the array is a local ring buffer).
 *   Sungrow buckets are CLEAN: `getDaySeries()` emits exactly `bucket`,
 *   `avg_pv_power_w`, `max_pv_power_w`, `avg_battery_power_w`,
 *   `avg_battery_soc_pct`, `avg_load_power_w` — the five documented fields plus
 *   the `bucket` timestamp, nothing invented beyond them. P1 realtime is clean
 *   too: `power_w`, `import_power_w`, `energy_import_kwh`, `energy_export_kwh`,
 *   `ts`. Capacity is clean: `monthly_peak_w`, `monthly_peak_ts`,
 *   `peaks[]: {ts, avg_power_w}`. Sungrow realtime is clean: `pv_power_w`,
 *   `pv_daily_kwh`, `battery_power_w`, `battery_soc_pct`, `battery_temp_c`,
 *   `load_power_w`.
 * - FORBIDDEN FIELD: `export_power_w` does NOT appear in this file — neither
 *   generated nor read. Grid direction comes from signed P1 `power_w` only
 *   (`gridSigned = load - pv + battery`), which is the correct convention.
 * - SIGN CONVENTIONS: correct on both axes. P1 `power_w` positive = import,
 *   negative = export; export IS exercised — `batteryAt()` only absorbs 82% of
 *   surplus (`Math.min(surplus * 0.82, 3300)`), so any surplus > 150 W leaves
 *   `gridSigned = 0.18 * (load - pv) < 0`, i.e. midday buckets and
 *   `getGridLive` samples do go negative. Sungrow `battery_power_w` positive =
 *   charging, negative = discharging; discharge IS exercised
 *   (`-Math.min(-surplus * 0.92, 2600)` whenever surplus < -100 W and SoC > 12).
 *   `getBalance()` splits on `grid > 0 ? import : export`, consistent with the
 *   same convention. This mock therefore satisfies the D1 invariant scenario
 *   (negative `power_w` with no `export_power_w` involved at all).
 * - RANGES (sanity bounds for future tests): `pv_power_w` 0 W outside
 *   hour 6.4–21.2, otherwise `4600 * sin(pi*t)^1.6 * cloud(0.72–1.00)` so
 *   0–4600 W, up to ~4876 W after `getSnapshot`'s +/-6% jitter;
 *   `max_pv_power_w` = pv * 1.18, so up to ~5428 W. `battery_soc_pct` hard
 *   clamped to 8–100 (`Math.max(8, Math.min(100, ...))`), starts at
 *   `START_SOC = 58`, 0.1 rounding; battery capacity constant 9600 Wh with
 *   0.95/1.05 charge/discharge efficiency fudge. `battery_power_w` +150..+3300 W
 *   charging, -100..-2600 W discharging. `load_power_w` base 260–350 W plus
 *   fixed blocks (+900 07:00–09:00, +520 12:00–13:30, +1750 17:30–20:30,
 *   +620 20:30–23:00) so ~260–2100 W, up to ~2226 W with jitter, and +/-17.5%
 *   extra in `getGridLive`. Monthly capacity peak: per-day evening peaks
 *   1400–3800 W plus optional morning peaks 900–2400 W, `monthly_peak_w` is the
 *   max over the month-to-date, so realistically ~2600–3800 W and never above
 *   3800 W. `battery_temp_c` ~21.4–25.4 C. `pv_daily_kwh` 0 to ~40 kWh
 *   (integral of the curve). Lifetime counters are hardcoded bases:
 *   `energy_import_kwh = 8421.6 + today`, `energy_export_kwh = 5093.2 + today`.
 *   Year-frame grid buckets: `import_kwh` ~110–360, `export_kwh` ~30–320.
 * - HC-003 HAZARD: `getDaySeries` emits future hours (`hr >= upto`) as a real
 *   `bucket` timestamp with every value literally 0 — not null, not omitted. A
 *   chart cannot distinguish "no data yet" from "0 W", and `avg_battery_soc_pct:
 *   0` is an impossible SoC given the 8% floor. Needs an explicit
 *   unavailable/no-data representation at port.
 * - IMPORTS: exactly one — `import type { ... } from "@/types/energy"` (type-only:
 *   EnergyBalanceToday, EnergySnapshot, GridBucket, GridSample, MonthlyDay,
 *   P1MonthlyCapacity, P1Peak, SeriesFrame, SungrowBucket). No runtime imports,
 *   no React, no date library, no fetch — pure TS, framework-free, which is
 *   exactly where the port wants it (`lib/energy/`).
 */
import type {
  EnergyBalanceToday,
  EnergySnapshot,
  GridBucket,
  GridSample,
  MonthlyDay,
  P1MonthlyCapacity,
  P1Peak,
  SeriesFrame,
  SungrowBucket,
} from "@/types/energy";

/**
 * Single mock data layer.
 *
 * Swapping mock data for the real API is a one-file change: replace the
 * exported functions below with fetch calls that return the same shapes.
 */

const START_SOC = 58;

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Clear-sky PV curve, W. hour is a float 0–24. */
function pvAt(hour: number, dayIndex = 0): number {
  const sunrise = 6.4;
  const sunset = 21.2;
  if (hour <= sunrise || hour >= sunset) return 0;
  const t = (hour - sunrise) / (sunset - sunrise);
  const bell = Math.sin(Math.PI * t) ** 1.6;
  const cloud = 0.72 + 0.28 * seeded(dayIndex * 7.3 + Math.floor(hour));
  return Math.round(4600 * bell * cloud);
}

/** House load, W. */
function loadAt(hour: number, dayIndex = 0): number {
  let base = 260 + 90 * seeded(dayIndex * 3.1 + Math.floor(hour * 2));
  if (hour >= 7 && hour < 9) base += 900;
  if (hour >= 12 && hour < 13.5) base += 520;
  if (hour >= 17.5 && hour < 20.5) base += 1750;
  if (hour >= 20.5 && hour < 23) base += 620;
  return Math.round(base);
}

/** Battery behaviour: soak surplus, cover deficit. Positive = charging. */
function batteryAt(pv: number, load: number, soc: number): number {
  const surplus = pv - load;
  if (surplus > 150 && soc < 99) return Math.min(surplus * 0.82, 3300);
  if (surplus < -100 && soc > 12) return -Math.min(-surplus * 0.92, 2600);
  return 0;
}

function hourFloat(d: Date) {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/** Simulated state-of-charge for "now", integrated from midnight. */
function socNow(now: Date): number {
  let soc = START_SOC;
  const step = 0.25;
  const capacityWh = 9600;
  for (let h = 0; h < hourFloat(now); h += step) {
    const pv = pvAt(h);
    const load = loadAt(h);
    const bp = batteryAt(pv, load, soc);
    soc += ((bp * step) / capacityWh) * 100 * (bp > 0 ? 0.95 : 1.05);
    soc = Math.max(8, Math.min(100, soc));
  }
  return Math.round(soc * 10) / 10;
}

export function getSnapshot(now = new Date()): EnergySnapshot {
  const h = hourFloat(now);
  const jitter = 1 + (seeded(now.getSeconds() + now.getMinutes() * 60) - 0.5) * 0.12;
  const pv = Math.round(pvAt(h) * jitter);
  const load = Math.round(loadAt(h) * jitter);
  const soc = socNow(now);
  const battery = Math.round(batteryAt(pv, load, soc));
  const gridSigned = Math.round(load - pv + battery);

  const daySeries = getDaySeries(now);
  const balance = getBalance(daySeries);

  return {
    p1: {
      power_w: gridSigned,
      import_power_w: Math.max(0, gridSigned),
      energy_import_kwh: 8421.6 + balance.grid_imported_kwh,
      energy_export_kwh: 5093.2 + balance.exported_kwh,
      ts: now.toISOString(),
    },
    capacity: getCapacity(now),
    sungrow: {
      pv_power_w: pv,
      pv_daily_kwh: Math.round(pvDailyKwh(now) * 100) / 100,
      battery_power_w: battery,
      battery_soc_pct: soc,
      battery_temp_c: Math.round((21.4 + soc / 40 + seeded(h) * 1.5) * 10) / 10,
      load_power_w: load,
    },
    daySeries,
    balance,
    monthDays: getMonthDays(now),
    gridLive: getGridLive(now),
  };
}

function pvDailyKwh(now: Date): number {
  let wh = 0;
  for (let hh = 0; hh < hourFloat(now); hh += 0.25) wh += pvAt(hh) * 0.25;
  return wh / 1000;
}

export function getDaySeries(now = new Date()): SungrowBucket[] {
  const out: SungrowBucket[] = [];
  let soc = START_SOC;
  const capacityWh = 9600;
  const upto = Math.ceil(hourFloat(now));
  for (let hr = 0; hr < 24; hr++) {
    const mid = hr + 0.5;
    const pv = pvAt(mid);
    const load = loadAt(mid);
    const bp = batteryAt(pv, load, soc);
    const socStart = soc;
    soc = Math.max(8, Math.min(100, soc + ((bp * 1) / capacityWh) * 100));
    const bucket = new Date(now);
    bucket.setHours(hr, 0, 0, 0);
    if (hr >= upto) {
      out.push({
        bucket: bucket.toISOString(),
        avg_pv_power_w: 0,
        max_pv_power_w: 0,
        avg_battery_power_w: 0,
        avg_battery_soc_pct: 0,
        avg_load_power_w: 0,
      });
      continue;
    }
    out.push({
      bucket: bucket.toISOString(),
      avg_pv_power_w: Math.round(pv),
      max_pv_power_w: Math.round(pv * 1.18),
      avg_battery_power_w: Math.round(bp),
      avg_battery_soc_pct: Math.round(((socStart + soc) / 2) * 10) / 10,
      avg_load_power_w: Math.round(load),
    });
  }
  return out;
}

function getBalance(series: SungrowBucket[]): EnergyBalanceToday {
  let solarSelf = 0;
  let batteryOut = 0;
  let gridIn = 0;
  let produced = 0;
  let exported = 0;
  for (const b of series) {
    const pv = b.avg_pv_power_w / 1000;
    const load = b.avg_load_power_w / 1000;
    const bat = b.avg_battery_power_w / 1000;
    produced += pv;
    const grid = load - pv + bat;
    if (grid > 0) gridIn += grid;
    else exported += -grid;
    solarSelf += Math.min(pv, load);
    if (bat < 0) batteryOut += -bat;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    solar_self_consumed_kwh: r(solarSelf),
    battery_discharged_kwh: r(batteryOut),
    grid_imported_kwh: r(gridIn),
    produced_kwh: r(produced),
    exported_kwh: r(exported),
  };
}

export function getCapacity(now = new Date()): P1MonthlyCapacity {
  const peaks: P1Peak[] = [];
  const days = now.getDate();
  for (let d = 1; d <= days; d++) {
    const s = seeded(d * 5.7 + now.getMonth());
    const w = 1400 + s * 2400;
    const ts = new Date(now.getFullYear(), now.getMonth(), d, 18, 45, 0);
    peaks.push({ ts: ts.toISOString(), avg_power_w: Math.round(w) });
    if (s > 0.6) {
      const ts2 = new Date(now.getFullYear(), now.getMonth(), d, 8, 15, 0);
      peaks.push({
        ts: ts2.toISOString(),
        avg_power_w: Math.round(900 + seeded(d * 2.2) * 1500),
      });
    }
  }
  const top = peaks.reduce((a, b) => (b.avg_power_w > a.avg_power_w ? b : a));
  return {
    monthly_peak_w: top.avg_power_w,
    monthly_peak_ts: top.ts,
    peaks: peaks.sort((a, b) => a.ts.localeCompare(b.ts)),
  };
}

export function getMonthDays(now = new Date()): MonthlyDay[] {
  const out: MonthlyDay[] = [];
  const days = now.getDate();
  for (let d = 1; d <= days; d++) {
    let pvKwh = 0;
    let net = 0;
    let soc = START_SOC;
    for (let hh = 0; hh < 24; hh += 0.5) {
      const pv = pvAt(hh, d);
      const load = loadAt(hh, d);
      const bp = batteryAt(pv, load, soc);
      soc = Math.max(8, Math.min(100, soc + ((bp * 0.5) / 9600) * 100));
      pvKwh += (pv * 0.5) / 1000;
      net += ((load - pv + bp) * 0.5) / 1000;
    }
    const partial = d === days ? hourFloat(now) / 24 : 1;
    out.push({
      date: new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10),
      solar_kwh: Math.round(pvKwh * partial * 10) / 10,
      net_grid_kwh: Math.round(net * partial * 10) / 10,
    });
  }
  return out;
}

/** ~5 minutes of live grid samples at 5s cadence. */
export function getGridLive(now = new Date()): GridSample[] {
  const out: GridSample[] = [];
  for (let i = 60; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5000);
    const hh = hourFloat(t);
    const pv = pvAt(hh);
    const load = loadAt(hh) * (1 + (seeded(t.getTime() / 5000) - 0.5) * 0.35);
    const bp = batteryAt(pv, load, socNow(t));
    out.push({ ts: t.toISOString(), power_w: Math.round(load - pv + bp) });
  }
  return out;
}

/** Grid detail buckets for the Day / Month / Year tabs. */
export function getGridBuckets(frame: SeriesFrame, now = new Date()): GridBucket[] {
  if (frame === "day") {
    return getDaySeries(now).map((b) => {
      const grid = (b.avg_load_power_w - b.avg_pv_power_w + b.avg_battery_power_w) / 1000;
      return {
        bucket: b.bucket,
        import_kwh: Math.round(Math.max(0, grid) * 100) / 100,
        export_kwh: Math.round(Math.max(0, -grid) * 100) / 100,
      };
    });
  }
  if (frame === "month") {
    return getMonthDays(now).map((d) => ({
      bucket: d.date,
      import_kwh: Math.round(Math.max(0, d.net_grid_kwh) * 10) / 10,
      export_kwh: Math.round(Math.max(0, -d.net_grid_kwh) * 10) / 10,
    }));
  }
  return Array.from({ length: 12 }, (_, m) => {
    const s = seeded(m * 4.4);
    const summer = Math.sin(((m - 2) / 12) * Math.PI * 2) * 0.5 + 0.5;
    return {
      bucket: new Date(now.getFullYear(), m, 1).toISOString().slice(0, 10),
      import_kwh: Math.round((320 - summer * 210 + s * 40) * 10) / 10,
      export_kwh: Math.round((30 + summer * 260 + s * 30) * 10) / 10,
    };
  }).slice(0, now.getMonth() + 1);
}
