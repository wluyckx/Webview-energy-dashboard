/**
 * Tests for MockData module (src/mock-data.js).
 *
 * STORY-004: Mock Data System
 * TDD: Tests written FIRST, before implementation.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial test suite (STORY-004)
 */

const MockData = require('../src/mock-data.js');

// ---------------------------------------------------------------------------
// Helper: get today's date as YYYY-MM-DD
// ---------------------------------------------------------------------------
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helper: get current month as YYYY-MM
// ---------------------------------------------------------------------------
function currentMonthString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return year + '-' + month;
}

// ===========================================================================
// 1. getMockP1Realtime
// ===========================================================================
describe('getMockP1Realtime', () => {
  test('returns object with all expected fields', () => {
    const data = MockData.getMockP1Realtime();
    expect(data).toHaveProperty('device_id');
    expect(data).toHaveProperty('ts');
    expect(data).toHaveProperty('power_w');
    expect(data).toHaveProperty('import_power_w');
    expect(data).toHaveProperty('energy_import_kwh');
    expect(data).toHaveProperty('energy_export_kwh');
  });

  test('device_id is p1-meter-01', () => {
    const data = MockData.getMockP1Realtime();
    expect(data.device_id).toBe('p1-meter-01');
  });

  test("ts contains today's date", () => {
    const data = MockData.getMockP1Realtime();
    expect(data.ts).toContain(todayDateString());
  });

  test('numeric fields are numbers', () => {
    const data = MockData.getMockP1Realtime();
    expect(typeof data.power_w).toBe('number');
    expect(typeof data.import_power_w).toBe('number');
    expect(typeof data.energy_import_kwh).toBe('number');
    expect(typeof data.energy_export_kwh).toBe('number');
  });
});

// ===========================================================================
// 2. getMockSungrowRealtime
// ===========================================================================
describe('getMockSungrowRealtime', () => {
  test('returns object with all expected fields', () => {
    const data = MockData.getMockSungrowRealtime();
    expect(data).toHaveProperty('device_id');
    expect(data).toHaveProperty('ts');
    expect(data).toHaveProperty('pv_power_w');
    expect(data).toHaveProperty('pv_daily_kwh');
    expect(data).toHaveProperty('battery_power_w');
    expect(data).toHaveProperty('battery_soc_pct');
    expect(data).toHaveProperty('battery_temp_c');
    expect(data).toHaveProperty('load_power_w');
    expect(data).toHaveProperty('export_power_w');
    expect(data).toHaveProperty('sample_count');
  });

  test('device_id is inverter-01', () => {
    const data = MockData.getMockSungrowRealtime();
    expect(data.device_id).toBe('inverter-01');
  });

  test("ts contains today's date", () => {
    const data = MockData.getMockSungrowRealtime();
    expect(data.ts).toContain(todayDateString());
  });

  test('numeric fields are numbers', () => {
    const data = MockData.getMockSungrowRealtime();
    expect(typeof data.pv_power_w).toBe('number');
    expect(typeof data.pv_daily_kwh).toBe('number');
    expect(typeof data.battery_power_w).toBe('number');
    expect(typeof data.battery_soc_pct).toBe('number');
    expect(typeof data.battery_temp_c).toBe('number');
    expect(typeof data.load_power_w).toBe('number');
    expect(typeof data.export_power_w).toBe('number');
    expect(typeof data.sample_count).toBe('number');
  });
});

// ===========================================================================
// 3. getMockSungrowSeriesDay
// ===========================================================================
describe('getMockSungrowSeriesDay', () => {
  test('returns object with device_id, frame, and series', () => {
    const data = MockData.getMockSungrowSeriesDay();
    expect(data).toHaveProperty('device_id');
    expect(data).toHaveProperty('frame');
    expect(data).toHaveProperty('series');
  });

  test('series is an array with length > 0', () => {
    const data = MockData.getMockSungrowSeriesDay();
    expect(Array.isArray(data.series)).toBe(true);
    expect(data.series.length).toBeGreaterThan(0);
  });

  test('series items have all expected fields', () => {
    const data = MockData.getMockSungrowSeriesDay();
    const item = data.series[0];
    expect(item).toHaveProperty('bucket');
    expect(item).toHaveProperty('avg_pv_power_w');
    expect(item).toHaveProperty('max_pv_power_w');
    expect(item).toHaveProperty('avg_battery_power_w');
    expect(item).toHaveProperty('avg_battery_soc_pct');
    expect(item).toHaveProperty('avg_load_power_w');
    expect(item).toHaveProperty('avg_export_power_w');
    expect(item).toHaveProperty('sample_count');
  });

  test("bucket timestamps use today's date", () => {
    const data = MockData.getMockSungrowSeriesDay();
    const today = todayDateString();
    data.series.forEach((item) => {
      expect(item.bucket).toContain(today);
    });
  });

  test('frame is "day"', () => {
    const data = MockData.getMockSungrowSeriesDay();
    expect(data.frame).toBe('day');
  });
});

// ===========================================================================
// 3b. getMockP1SeriesDay
// ===========================================================================
describe('getMockP1SeriesDay', () => {
  test('returns object with device_id, frame, and series', () => {
    const data = MockData.getMockP1SeriesDay();
    expect(data).toHaveProperty('device_id');
    expect(data).toHaveProperty('frame');
    expect(data).toHaveProperty('series');
  });

  test('device_id is p1-meter-01', () => {
    const data = MockData.getMockP1SeriesDay();
    expect(data.device_id).toBe('p1-meter-01');
  });

  test('frame is "day"', () => {
    const data = MockData.getMockP1SeriesDay();
    expect(data.frame).toBe('day');
  });

  test('series is a non-empty array', () => {
    const data = MockData.getMockP1SeriesDay();
    expect(Array.isArray(data.series)).toBe(true);
    expect(data.series.length).toBeGreaterThan(0);
  });

  test('series items have P1-shaped fields (avg_import_power_w, avg_export_power_w)', () => {
    const data = MockData.getMockP1SeriesDay();
    const item = data.series[0];
    expect(item).toHaveProperty('bucket');
    expect(item).toHaveProperty('avg_import_power_w');
    expect(item).toHaveProperty('avg_export_power_w');
    expect(item).toHaveProperty('sample_count');
  });

  test('series items do NOT have Sungrow-specific fields', () => {
    const data = MockData.getMockP1SeriesDay();
    const item = data.series[0];
    expect(item).not.toHaveProperty('avg_pv_power_w');
    expect(item).not.toHaveProperty('avg_battery_power_w');
    expect(item).not.toHaveProperty('avg_load_power_w');
  });

  test("bucket timestamps use today's date", () => {
    const data = MockData.getMockP1SeriesDay();
    const today = todayDateString();
    data.series.forEach((item) => {
      expect(item.bucket).toContain(today);
    });
  });
});

// ===========================================================================
// 4. getMockP1Capacity
// ===========================================================================
describe('getMockP1Capacity', () => {
  test('returns object with all expected fields', () => {
    const data = MockData.getMockP1Capacity();
    expect(data).toHaveProperty('device_id');
    expect(data).toHaveProperty('month');
    expect(data).toHaveProperty('peaks');
    expect(data).toHaveProperty('monthly_peak_w');
    expect(data).toHaveProperty('monthly_peak_ts');
  });

  test('peaks is an array', () => {
    const data = MockData.getMockP1Capacity();
    expect(Array.isArray(data.peaks)).toBe(true);
  });

  test('month uses current month dynamically', () => {
    const data = MockData.getMockP1Capacity();
    expect(data.month).toBe(currentMonthString());
  });

  test('monthly_peak_w is a number', () => {
    const data = MockData.getMockP1Capacity();
    expect(typeof data.monthly_peak_w).toBe('number');
  });

  test('device_id is p1-meter-01', () => {
    const data = MockData.getMockP1Capacity();
    expect(data.device_id).toBe('p1-meter-01');
  });
});

// ===========================================================================
// 5. getMockHealthResponse
// ===========================================================================
describe('getMockHealthResponse', () => {
  test('returns { status: "ok" }', () => {
    const data = MockData.getMockHealthResponse();
    expect(data).toEqual({ status: 'ok' });
  });
});

// ===========================================================================
// 6. Dynamic timestamps (not stale/cached)
// ===========================================================================
describe('dynamic timestamps', () => {
  test('calling getMockP1Realtime twice returns fresh objects (not same reference)', () => {
    const first = MockData.getMockP1Realtime();
    const second = MockData.getMockP1Realtime();
    expect(first).not.toBe(second);
  });

  test('calling getMockSungrowRealtime twice returns fresh objects (not same reference)', () => {
    const first = MockData.getMockSungrowRealtime();
    const second = MockData.getMockSungrowRealtime();
    expect(first).not.toBe(second);
  });

  test('calling getMockSungrowSeriesDay twice returns fresh objects (not same reference)', () => {
    const first = MockData.getMockSungrowSeriesDay();
    const second = MockData.getMockSungrowSeriesDay();
    expect(first).not.toBe(second);
  });

  test('calling getMockP1Capacity twice returns fresh objects (not same reference)', () => {
    const first = MockData.getMockP1Capacity();
    const second = MockData.getMockP1Capacity();
    expect(first).not.toBe(second);
  });

  test('calling getMockHealthResponse twice returns fresh objects (not same reference)', () => {
    const first = MockData.getMockHealthResponse();
    const second = MockData.getMockHealthResponse();
    expect(first).not.toBe(second);
  });
});
