/**
 * Tests for Charts module (STORY-009, STORY-011).
 *
 * Validates the pure transformSeriesToDatasets function: label formatting,
 * kW conversion, dataset count, color assignments, and empty data handling.
 *
 * Validates transformMonthlyToBarData: day-of-month labels, daily kWh
 * conversion, dataset count, color assignments, and empty data handling.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial tests (STORY-009)
 * - 2026-02-15: Add monthly bar chart tests (STORY-011)
 */

var Charts = require('../src/charts.js');
var fixtureData = require('./fixtures/sungrow-series-day.json');

describe('Charts', function () {
  describe('transformSeriesToDatasets()', function () {
    test('returns labels formatted as time strings ("HH:MM")', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      expect(result.labels).toEqual(['08:00']);
    });

    test('returns exactly 4 datasets', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      expect(result.datasets).toHaveLength(4);
    });

    test('Solar dataset contains avg_pv_power_w / 1000 as kW', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var solar = result.datasets.find(function (ds) {
        return ds.label === 'Solar';
      });
      expect(solar).toBeDefined();
      // 1200.5 / 1000 = 1.2005
      expect(solar.data[0]).toBeCloseTo(1.2005, 4);
    });

    test('Battery dataset contains avg_battery_power_w / 1000 as signed kW', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var battery = result.datasets.find(function (ds) {
        return ds.label === 'Battery';
      });
      expect(battery).toBeDefined();
      // -500.0 / 1000 = -0.5 (discharging)
      expect(battery.data[0]).toBeCloseTo(-0.5, 4);
    });

    test('Grid dataset contains avg_export_power_w / 1000 as signed kW', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      expect(grid).toBeDefined();
      // 600.5 / 1000 = 0.6005 (exporting)
      expect(grid.data[0]).toBeCloseTo(0.6005, 4);
    });

    test('Home dataset contains avg_load_power_w / 1000 as kW', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var home = result.datasets.find(function (ds) {
        return ds.label === 'Home';
      });
      expect(home).toBeDefined();
      // 1100.0 / 1000 = 1.1
      expect(home.data[0]).toBeCloseTo(1.1, 4);
    });

    test('datasets are ordered: Solar, Battery, Grid, Home', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      expect(result.datasets[0].label).toBe('Solar');
      expect(result.datasets[1].label).toBe('Battery');
      expect(result.datasets[2].label).toBe('Grid');
      expect(result.datasets[3].label).toBe('Home');
    });

    test('Solar dataset has correct border color (#F6B93B)', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var solar = result.datasets[0];
      expect(solar.borderColor).toBe('#F6B93B');
    });

    test('Battery dataset has correct charge color (#6c5ce7)', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var battery = result.datasets[1];
      expect(battery.borderColor).toBe('#6c5ce7');
    });

    test('Grid dataset has correct export color (#00b894)', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var grid = result.datasets[2];
      expect(grid.borderColor).toBe('#00b894');
    });

    test('Home dataset has correct color (#DFE6E9) and is a line (no fill)', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var home = result.datasets[3];
      expect(home.borderColor).toBe('#DFE6E9');
      expect(home.fill).toBe(false);
    });

    test('all datasets have smooth interpolation (tension: 0.4)', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      result.datasets.forEach(function (ds) {
        expect(ds.tension).toBe(0.4);
      });
    });

    test('Home dataset has borderWidth of 2', function () {
      var result = Charts.transformSeriesToDatasets(fixtureData);
      var home = result.datasets[3];
      expect(home.borderWidth).toBe(2);
    });

    test('empty series array returns empty labels and datasets with empty data', function () {
      var emptyData = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [],
      };
      var result = Charts.transformSeriesToDatasets(emptyData);
      expect(result.labels).toEqual([]);
      expect(result.datasets).toHaveLength(4);
      result.datasets.forEach(function (ds) {
        expect(ds.data).toEqual([]);
      });
    });

    test('handles multiple buckets and produces matching labels and data lengths', function () {
      var multiData = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T08:00:00',
            avg_pv_power_w: 1200.5,
            avg_battery_power_w: -500.0,
            avg_load_power_w: 1100.0,
            avg_export_power_w: 600.5,
          },
          {
            bucket: '2026-02-15T09:00:00',
            avg_pv_power_w: 2800.0,
            avg_battery_power_w: 300.0,
            avg_load_power_w: 1300.0,
            avg_export_power_w: 1200.0,
          },
          {
            bucket: '2026-02-15T10:00:00',
            avg_pv_power_w: 4500.0,
            avg_battery_power_w: 800.0,
            avg_load_power_w: 1500.0,
            avg_export_power_w: 2200.0,
          },
        ],
      };
      var result = Charts.transformSeriesToDatasets(multiData);
      expect(result.labels).toEqual(['08:00', '09:00', '10:00']);
      expect(result.datasets[0].data).toEqual([1.2005, 2.8, 4.5]);
      expect(result.datasets[1].data).toEqual([-0.5, 0.3, 0.8]);
      expect(result.datasets[2].data).toEqual([0.6005, 1.2, 2.2]);
      expect(result.datasets[3].data).toEqual([1.1, 1.3, 1.5]);
    });
  });

  describe('COLORS constant', function () {
    test('exposes correct color constants', function () {
      expect(Charts.COLORS.solar).toBe('#F6B93B');
      expect(Charts.COLORS.batteryCharge).toBe('#6c5ce7');
      expect(Charts.COLORS.batteryDischarge).toBe('#a29bfe');
      expect(Charts.COLORS.gridImport).toBe('#e17055');
      expect(Charts.COLORS.gridExport).toBe('#00b894');
      expect(Charts.COLORS.home).toBe('#DFE6E9');
    });
  });

  describe('transformMonthlyToBarData()', function () {
    var monthlyFixture = {
      device_id: 'inverter-01',
      frame: 'month',
      series: [
        {
          bucket: '2026-02-01T00:00:00',
          avg_pv_power_w: 520.8,
          avg_load_power_w: 345.0,
          avg_battery_power_w: 50.0,
          avg_export_power_w: 125.8,
          sample_count: 1440,
        },
        {
          bucket: '2026-02-02T00:00:00',
          avg_pv_power_w: 633.3,
          avg_load_power_w: 412.5,
          avg_battery_power_w: -80.0,
          avg_export_power_w: 140.8,
          sample_count: 1440,
        },
      ],
    };

    test('labels are day-of-month numbers', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      expect(result.labels).toEqual([1, 2]);
    });

    test('production kWh = avg_pv_power_w * 24 / 1000', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      var production = result.datasets.find(function (ds) {
        return ds.label === 'Production';
      });
      // 520.8 * 24 / 1000 = 12.4992
      expect(production.data[0]).toBeCloseTo(12.4992, 4);
      // 633.3 * 24 / 1000 = 15.1992
      expect(production.data[1]).toBeCloseTo(15.1992, 4);
    });

    test('consumption kWh = avg_load_power_w * 24 / 1000', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      var consumption = result.datasets.find(function (ds) {
        return ds.label === 'Consumption';
      });
      // 345.0 * 24 / 1000 = 8.28
      expect(consumption.data[0]).toBeCloseTo(8.28, 4);
      // 412.5 * 24 / 1000 = 9.9
      expect(consumption.data[1]).toBeCloseTo(9.9, 4);
    });

    test('returns 2 datasets (Production and Consumption)', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('Production');
      expect(result.datasets[1].label).toBe('Consumption');
    });

    test('Production has correct color (#F6B93B)', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      var production = result.datasets.find(function (ds) {
        return ds.label === 'Production';
      });
      expect(production.backgroundColor).toBe('#F6B93B');
    });

    test('Consumption has correct color (#DFE6E9)', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      var consumption = result.datasets.find(function (ds) {
        return ds.label === 'Consumption';
      });
      expect(consumption.backgroundColor).toBe('#DFE6E9');
    });

    test('empty series returns empty labels and datasets with empty data', function () {
      var emptyData = {
        device_id: 'inverter-01',
        frame: 'month',
        series: [],
      };
      var result = Charts.transformMonthlyToBarData(emptyData);
      expect(result.labels).toEqual([]);
      expect(result.datasets).toHaveLength(2);
      result.datasets.forEach(function (ds) {
        expect(ds.data).toEqual([]);
      });
    });

    test('multiple daily buckets produce correct day numbers and kWh values', function () {
      var result = Charts.transformMonthlyToBarData(monthlyFixture);
      expect(result.labels).toEqual([1, 2]);
      // Production: [12.4992, 15.1992]
      expect(result.datasets[0].data[0]).toBeCloseTo(12.4992, 4);
      expect(result.datasets[0].data[1]).toBeCloseTo(15.1992, 4);
      // Consumption: [8.28, 9.9]
      expect(result.datasets[1].data[0]).toBeCloseTo(8.28, 4);
      expect(result.datasets[1].data[1]).toBeCloseTo(9.9, 4);
    });
  });
});
