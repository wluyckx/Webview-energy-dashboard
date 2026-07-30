/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E04. See lovable/MANIFEST.md.
 */

/**
 * Energy data contract.
 *
 * These shapes mirror the two upstream REST APIs exactly (P1 smart meter and
 * Sungrow inverter). Sign conventions are part of the contract — do not
 * normalise them away.
 */

/** P1 smart meter, realtime. Polled every 5s. */
export interface P1Realtime {
  /** SIGNED. positive = importing FROM grid, negative = exporting TO grid.
   *  Authoritative source for grid direction. */
  power_w: number;
  /** >= 0. Import-only magnitude. */
  import_power_w: number;
  /** Cumulative lifetime meter total, kWh. */
  energy_import_kwh: number;
  /** Cumulative lifetime meter total, kWh. */
  energy_export_kwh: number;
  /** ISO timestamp of the reading. */
  ts: string;
}

/** A single recorded 15-minute capacity peak. */
export interface P1Peak {
  ts: string;
  /** 15-minute average import power, W. */
  avg_power_w: number;
}

/** P1 monthly capacity tariff data. */
export interface P1MonthlyCapacity {
  /** Highest 15-minute average import this month, W. Sets the capacity bill. */
  monthly_peak_w: number;
  monthly_peak_ts: string;
  peaks: P1Peak[];
}

/** Sungrow inverter, realtime. Polled every 5s. */
export interface SungrowRealtime {
  /** >= 0. AC output power of the PV array, W. */
  pv_power_w: number;
  pv_daily_kwh: number;
  /** SIGNED. positive = battery CHARGING, negative = battery DISCHARGING. */
  battery_power_w: number;
  /** 0–100. */
  battery_soc_pct: number;
  battery_temp_c: number;
  /** >= 0. Total house consumption, W. */
  load_power_w: number;
  /**
   * NOTE: `export_power_w` exists in the upstream payload but is ALWAYS 0 on
   * this inverter's firmware. It is intentionally not modelled here — grid
   * direction always comes from P1 `power_w`.
   */
}

export type SeriesFrame = "day" | "month" | "year";

/** One bucket of the Sungrow series (day = hourly, month = daily, year = monthly). */
export interface SungrowBucket {
  /** ISO timestamp marking the start of the bucket. */
  bucket: string;
  avg_pv_power_w: number;
  max_pv_power_w: number;
  /** SIGNED, same convention as realtime: positive = charging. */
  avg_battery_power_w: number;
  avg_battery_soc_pct: number;
  avg_load_power_w: number;
}

/** Derived today-totals used by the energy balance card (kWh). */
export interface EnergyBalanceToday {
  solar_self_consumed_kwh: number;
  battery_discharged_kwh: number;
  grid_imported_kwh: number;
  produced_kwh: number;
  exported_kwh: number;
}

/** Grid detail live sample (~last 5 minutes, one sample per 5s). */
export interface GridSample {
  ts: string;
  /** SIGNED, P1 convention: positive = import, negative = export. */
  power_w: number;
}

/**
 * Grid detail bucket for day / month / year tabs.
 *
 * ⚠️ UNVERIFIED CONTRACT (Architecture.md R1 / HC-006). The real P1
 * `/v1/series` bucket field names have never been captured from the live API.
 * This shape is the mock's invention and must NOT be treated as the contract —
 * capture the real response before building anything on it.
 */
export interface GridBucket {
  bucket: string;
  import_kwh: number;
  export_kwh: number;
}

/** Daily bar for the monthly overview. */
export interface MonthlyDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  solar_kwh: number;
  /** SIGNED net grid, kWh: positive = net import, negative = net export. */
  net_grid_kwh: number;
}

export type ConnectionStatus = "live" | "stale" | "offline";

export interface EnergySnapshot {
  p1: P1Realtime;
  capacity: P1MonthlyCapacity;
  sungrow: SungrowRealtime;
  daySeries: SungrowBucket[];
  balance: EnergyBalanceToday;
  monthDays: MonthlyDay[];
  gridLive: GridSample[];
}
