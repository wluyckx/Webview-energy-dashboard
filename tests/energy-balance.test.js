/**
 * Tests for Energy Balance module (STORY-010).
 *
 * Validates computeBalance pure function: production, export, import,
 * battery charge/discharge, consumption, self-consumption rate,
 * self-sufficiency rate, zero-division safety, and clamping.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial tests (STORY-010)
 */

const EnergyBalance = require('../src/energy-balance.js');

// Mock series data with two hourly buckets
var mockSeries = {
  device_id: 'inverter-01',
  frame: 'day',
  series: [
    {
      bucket: '2026-02-15T08:00:00',
      avg_pv_power_w: 1500,
      max_pv_power_w: 2400,
      avg_battery_power_w: 200,
      avg_battery_soc_pct: 45,
      avg_load_power_w: 1050,
      avg_export_power_w: 250,
      sample_count: 60,
    },
    {
      bucket: '2026-02-15T09:00:00',
      avg_pv_power_w: 2800,
      max_pv_power_w: 3600,
      avg_battery_power_w: 500,
      avg_battery_soc_pct: 58,
      avg_load_power_w: 1200,
      avg_export_power_w: 600,
      sample_count: 60,
    },
  ],
};

describe('EnergyBalance', () => {
  describe('computeBalance()', () => {
    test('computes total production from sum of avg_pv_power_w / 1000', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // (1500 + 2800) / 1000 = 4.3
      expect(balance.production).toBeCloseTo(4.3, 2);
    });

    test('computes export from positive avg_export_power_w', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // (250 + 600) / 1000 = 0.85
      expect(balance.export).toBeCloseTo(0.85, 2);
    });

    test('computes import from negative avg_export_power_w (abs)', () => {
      var importSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T08:00:00',
            avg_pv_power_w: 500,
            max_pv_power_w: 800,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 50,
            avg_load_power_w: 1200,
            avg_export_power_w: -700,
            sample_count: 60,
          },
          {
            bucket: '2026-02-15T09:00:00',
            avg_pv_power_w: 300,
            max_pv_power_w: 500,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 50,
            avg_load_power_w: 800,
            avg_export_power_w: -300,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(importSeries);
      // abs(-700) + abs(-300) = 1000 / 1000 = 1.0
      expect(balance.import).toBeCloseTo(1.0, 2);
      // No positive export values, so export should be 0
      expect(balance.export).toBeCloseTo(0, 2);
    });

    test('computes battery charge from positive avg_battery_power_w', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // (200 + 500) / 1000 = 0.7
      expect(balance.batteryCharge).toBeCloseTo(0.7, 2);
    });

    test('computes battery discharge from negative avg_battery_power_w (abs)', () => {
      var dischargeSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T18:00:00',
            avg_pv_power_w: 0,
            max_pv_power_w: 0,
            avg_battery_power_w: -800,
            avg_battery_soc_pct: 30,
            avg_load_power_w: 900,
            avg_export_power_w: -100,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(dischargeSeries);
      // abs(-800) / 1000 = 0.8
      expect(balance.batteryDischarge).toBeCloseTo(0.8, 2);
      expect(balance.batteryCharge).toBeCloseTo(0, 2);
    });

    test('computes total consumption from sum of avg_load_power_w / 1000', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // (1050 + 1200) / 1000 = 2.25
      expect(balance.consumption).toBeCloseTo(2.25, 2);
    });

    test('self-consumption = (1 - export/production) * 100', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // production = 4.3, export = 0.85
      // selfConsumption = (1 - 0.85/4.3) * 100 = (1 - 0.19767...) * 100 = 80.233...
      var expected = (1 - 0.85 / 4.3) * 100;
      expect(balance.selfConsumption).toBeCloseTo(expected, 2);
    });

    test('self-sufficiency = (1 - import/consumption) * 100', () => {
      var mixedSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T08:00:00',
            avg_pv_power_w: 1000,
            max_pv_power_w: 1500,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 50,
            avg_load_power_w: 1500,
            avg_export_power_w: -500,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(mixedSeries);
      // import = 0.5, consumption = 1.5
      // selfSufficiency = (1 - 0.5/1.5) * 100 = 66.667...
      var expected = (1 - 0.5 / 1.5) * 100;
      expect(balance.selfSufficiency).toBeCloseTo(expected, 2);
    });

    test('zero production returns 0% self-consumption (no division by zero)', () => {
      var zeroProductionSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T20:00:00',
            avg_pv_power_w: 0,
            max_pv_power_w: 0,
            avg_battery_power_w: -500,
            avg_battery_soc_pct: 40,
            avg_load_power_w: 800,
            avg_export_power_w: -800,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(zeroProductionSeries);
      expect(balance.production).toBe(0);
      expect(balance.selfConsumption).toBe(0);
    });

    test('zero consumption returns 0% self-sufficiency (no division by zero)', () => {
      var zeroConsumptionSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T12:00:00',
            avg_pv_power_w: 3000,
            max_pv_power_w: 4000,
            avg_battery_power_w: 1000,
            avg_battery_soc_pct: 80,
            avg_load_power_w: 0,
            avg_export_power_w: 2000,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(zeroConsumptionSeries);
      expect(balance.consumption).toBe(0);
      expect(balance.selfSufficiency).toBe(0);
    });

    test('self-consumption and self-sufficiency are clamped between 0 and 100', () => {
      // All export, no local consumption: selfConsumption would be 0 (edge case)
      var allExportSeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T12:00:00',
            avg_pv_power_w: 5000,
            max_pv_power_w: 6000,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 50,
            avg_load_power_w: 100,
            avg_export_power_w: 5000,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(allExportSeries);
      // selfConsumption = (1 - 5000/5000) * 100 = 0 -> clamped to 0
      expect(balance.selfConsumption).toBeGreaterThanOrEqual(0);
      expect(balance.selfConsumption).toBeLessThanOrEqual(100);
      expect(balance.selfSufficiency).toBeGreaterThanOrEqual(0);
      expect(balance.selfSufficiency).toBeLessThanOrEqual(100);
    });

    test('handles empty series array', () => {
      var emptySeries = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [],
      };
      var balance = EnergyBalance.computeBalance(emptySeries);
      expect(balance.production).toBe(0);
      expect(balance.export).toBe(0);
      expect(balance.import).toBe(0);
      expect(balance.batteryCharge).toBe(0);
      expect(balance.batteryDischarge).toBe(0);
      expect(balance.consumption).toBe(0);
      expect(balance.selfConsumption).toBe(0);
      expect(balance.selfSufficiency).toBe(0);
    });
  });
});
