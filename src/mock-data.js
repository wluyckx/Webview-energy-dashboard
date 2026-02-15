/**
 * Mock Data module for Energy Dashboard.
 *
 * Provides realistic mock API responses matching the data shapes from the
 * P1 and Sungrow APIs. When config.mock is true, the API client returns
 * this mock data without making network requests.
 *
 * All functions return fresh objects with dynamic timestamps so data is
 * never stale or cached between calls.
 *
 * STORY-004: Mock Data System
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-004)
 */

// eslint-disable-next-line no-unused-vars
const MockData = (() => {
  /**
   * Helper: return an ISO-style timestamp string for today at the given hour.
   * Format: "YYYY-MM-DDTHH:00:00" (no timezone suffix, seconds-precision).
   *
   * @param {number} hour - Hour of day (0-23).
   * @returns {string} Timestamp string.
   */
  function todayAt(hour) {
    var d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toISOString().slice(0, 19);
  }

  /**
   * Helper: return the current month as "YYYY-MM".
   *
   * @returns {string} Current month string.
   */
  function currentMonth() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return year + '-' + month;
  }

  /**
   * Mock P1 realtime data.
   *
   * @returns {Object} Mock P1 realtime response.
   */
  function getMockP1Realtime() {
    return {
      device_id: 'p1-meter-01',
      ts: new Date().toISOString(),
      power_w: 450,
      import_power_w: 450,
      energy_import_kwh: 12345.678,
      energy_export_kwh: 9876.543,
    };
  }

  /**
   * Mock Sungrow realtime data.
   *
   * @returns {Object} Mock Sungrow realtime response.
   */
  function getMockSungrowRealtime() {
    return {
      device_id: 'inverter-01',
      ts: new Date().toISOString(),
      pv_power_w: 3450.5,
      pv_daily_kwh: 12.3,
      battery_power_w: -1200.0,
      battery_soc_pct: 85.0,
      battery_temp_c: 28.5,
      load_power_w: 2700.0,
      export_power_w: 750.5,
      sample_count: 1,
    };
  }

  /**
   * Mock Sungrow series (day frame) data with 10 hourly buckets.
   *
   * @returns {Object} Mock Sungrow series response.
   */
  function getMockSungrowSeriesDay() {
    return {
      device_id: 'inverter-01',
      frame: 'day',
      series: [
        {
          bucket: todayAt(6),
          avg_pv_power_w: 50,
          max_pv_power_w: 200,
          avg_battery_power_w: -100,
          avg_battery_soc_pct: 40,
          avg_load_power_w: 800,
          avg_export_power_w: -650,
          sample_count: 12,
        },
        {
          bucket: todayAt(7),
          avg_pv_power_w: 500,
          max_pv_power_w: 1200,
          avg_battery_power_w: -300,
          avg_battery_soc_pct: 35,
          avg_load_power_w: 1100,
          avg_export_power_w: -400,
          sample_count: 60,
        },
        {
          bucket: todayAt(8),
          avg_pv_power_w: 1500,
          max_pv_power_w: 2400,
          avg_battery_power_w: 200,
          avg_battery_soc_pct: 45,
          avg_load_power_w: 1050,
          avg_export_power_w: 250,
          sample_count: 60,
        },
        {
          bucket: todayAt(9),
          avg_pv_power_w: 2800,
          max_pv_power_w: 3600,
          avg_battery_power_w: 500,
          avg_battery_soc_pct: 58,
          avg_load_power_w: 1200,
          avg_export_power_w: 600,
          sample_count: 60,
        },
        {
          bucket: todayAt(10),
          avg_pv_power_w: 3400,
          max_pv_power_w: 4100,
          avg_battery_power_w: 800,
          avg_battery_soc_pct: 72,
          avg_load_power_w: 1300,
          avg_export_power_w: 500,
          sample_count: 60,
        },
        {
          bucket: todayAt(11),
          avg_pv_power_w: 3800,
          max_pv_power_w: 4500,
          avg_battery_power_w: 400,
          avg_battery_soc_pct: 82,
          avg_load_power_w: 1500,
          avg_export_power_w: 1500,
          sample_count: 60,
        },
        {
          bucket: todayAt(12),
          avg_pv_power_w: 3600,
          max_pv_power_w: 4200,
          avg_battery_power_w: 100,
          avg_battery_soc_pct: 88,
          avg_load_power_w: 2000,
          avg_export_power_w: 1200,
          sample_count: 60,
        },
        {
          bucket: todayAt(13),
          avg_pv_power_w: 3200,
          max_pv_power_w: 3900,
          avg_battery_power_w: 0,
          avg_battery_soc_pct: 90,
          avg_load_power_w: 1800,
          avg_export_power_w: 1400,
          sample_count: 60,
        },
        {
          bucket: todayAt(14),
          avg_pv_power_w: 2500,
          max_pv_power_w: 3200,
          avg_battery_power_w: -200,
          avg_battery_soc_pct: 88,
          avg_load_power_w: 1600,
          avg_export_power_w: 500,
          sample_count: 60,
        },
        {
          bucket: todayAt(15),
          avg_pv_power_w: 1200,
          max_pv_power_w: 2000,
          avg_battery_power_w: -600,
          avg_battery_soc_pct: 80,
          avg_load_power_w: 1400,
          avg_export_power_w: -200,
          sample_count: 60,
        },
      ],
    };
  }

  /**
   * Mock P1 capacity data for the current month.
   *
   * @returns {Object} Mock P1 capacity response.
   */
  function getMockP1Capacity() {
    return {
      device_id: 'p1-meter-01',
      month: currentMonth(),
      peaks: [
        { ts: '2026-02-03T18:15:00', avg_power_w: 4200 },
        { ts: '2026-02-07T19:00:00', avg_power_w: 3800 },
        { ts: '2026-02-12T17:45:00', avg_power_w: 5100 },
      ],
      monthly_peak_w: 5100,
      monthly_peak_ts: '2026-02-12T17:45:00',
    };
  }

  /**
   * Mock health check response (used for both P1 and Sungrow health).
   *
   * @returns {Object} Mock health response.
   */
  function getMockHealthResponse() {
    return { status: 'ok' };
  }

  // Public API
  return {
    getMockP1Realtime: getMockP1Realtime,
    getMockSungrowRealtime: getMockSungrowRealtime,
    getMockSungrowSeriesDay: getMockSungrowSeriesDay,
    getMockP1Capacity: getMockP1Capacity,
    getMockHealthResponse: getMockHealthResponse,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockData;
}
