/**
 * Tests for Energy Balance module (STORY-010).
 *
 * Validates computeBalance pure function: production, export, import,
 * battery charge/discharge, consumption, self-consumption rate,
 * self-sufficiency rate, zero-division safety, and clamping.
 *
 * RW-M03 (D2 fix): the old derivation summed both totalExport and
 * totalImport from avg_export_power_w -- the always-0-on-real-firmware
 * field (HC-006). Replaced with the Architect-ruled grid identity:
 *   gridSignedW(bucket) = avg_load_power_w - avg_pv_power_w + avg_battery_power_w
 * (P1 convention: positive = import, negative = export). Three pre-existing
 * tests pinned the defective derivation or a value derived from it and are
 * replaced in place (marked `REPLACED (RW-M03 ...)`); the zero-production,
 * zero-consumption, clamp and empty-series tests are unaffected by the fix
 * and are left untouched. New AC1-AC8 tests below trace 1:1 to
 * docs/stories/RW-M03.md.
 *
 * CHANGELOG:
 * - 2026-07-30: Replace defective-derivation pins, add AC1-AC8 tests (RW-M03)
 * - 2026-02-15: Initial tests (STORY-010)
 */

const EnergyBalance = require('../src/energy-balance.js');
const MockData = require('../src/mock-data.js');

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

    // REPLACED (RW-M03 AC2b/AC4): this test pinned the DEFECTIVE derivation
    // (export summed straight from avg_export_power_w -- the always-0
    // firmware field). Under the grid identity (gridSignedW =
    // avg_load_power_w - avg_pv_power_w + avg_battery_power_w; grid < 0 =>
    // export), mockSeries's real export is: bucket1 grid = 1050-1500+200 =
    // -250 (0.25 kWh), bucket2 grid = 1200-2800+500 = -1100 (1.1 kWh);
    // total = 1.35, not the old 0.85.
    test('AC2b/AC4: computes export from the grid identity, not avg_export_power_w', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      expect(balance.export).toBeCloseTo(1.35, 6);
    });

    // REPLACED (RW-M03 AC2a/AC4): this test pinned the DEFECTIVE derivation
    // (import summed from abs(avg_export_power_w) when <= 0). Under the grid
    // identity: bucket1 grid = 1200-500+0 = 700 (0.7 kWh import), bucket2
    // grid = 800-300+0 = 500 (0.5 kWh import); total import = 1.2, not the
    // old 1.0 -- and this fixture has no export at all under the fix
    // (both buckets' grid is positive), matching the old export=0 by
    // coincidence only.
    test('AC2a/AC4: computes import from the grid identity, not avg_export_power_w', () => {
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
      // (1200-500+0) + (800-300+0) = 700 + 500 = 1200 / 1000 = 1.2
      expect(balance.import).toBeCloseTo(1.2, 6);
      expect(balance.export).toBeCloseTo(0, 6);
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

    // REPLACED (RW-M03, discovered dependency -- NOT in the Story Contract's
    // explicit replace list, which named only the tests at the old lines
    // ~50/~56). This test's expected value (80.23%) was itself computed from
    // the DEFECTIVE export (0.85) that the old-line-50 test asserted. Under
    // the grid identity mockSeries's real export is 1.35 (see the replaced
    // export test above), so the correct self-consumption is
    // (1 - 1.35/4.3)*100 ~= 68.6047%. Flagged in the Spec Author report as a
    // NEEDS-SPEC-adjacent finding: a downstream test silently depended on the
    // same defective field without being named as a defective pin -- the
    // exact RW-M02-lesson shape the story warned about.
    test('AC2b: self-consumption = (1 - export/production) * 100, using the corrected export', () => {
      var balance = EnergyBalance.computeBalance(mockSeries);
      // production = 4.3, export = 1.35 (grid identity, not avg_export_power_w)
      var expected = (1 - 1.35 / 4.3) * 100;
      expect(balance.selfConsumption).toBeCloseTo(expected, 6);
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

    test('zero consumption returns 100% self-sufficiency (per spec)', () => {
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
      expect(balance.selfSufficiency).toBe(100);
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
      // Zero consumption → 100% self-sufficiency (per spec: no imports needed)
      expect(balance.selfSufficiency).toBe(100);
    });
  });

  describe('RW-M03 AC1: the D2 pin (mixed fixture with real export and import)', () => {
    test('AC1: export=2.2, import=1.0, both ratios below 100 for a mixed-direction fixture', () => {
      var series = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          // grid = 800 - 3000 + 0 = -2200 => exporting 2.2 kWh
          {
            bucket: '2026-02-15T11:00:00',
            avg_pv_power_w: 3000,
            max_pv_power_w: 3500,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 70,
            avg_load_power_w: 800,
            sample_count: 60,
          },
          // grid = 1000 - 0 + 0 = 1000 => importing 1.0 kWh
          {
            bucket: '2026-02-15T19:00:00',
            avg_pv_power_w: 0,
            max_pv_power_w: 0,
            avg_battery_power_w: 0,
            avg_battery_soc_pct: 68,
            avg_load_power_w: 1000,
            sample_count: 60,
          },
        ],
      };
      var balance = EnergyBalance.computeBalance(series);
      expect(balance.export).toBeCloseTo(2.2, 6);
      expect(balance.import).toBeCloseTo(1.0, 6);
      expect(balance.production).toBeCloseTo(3.0, 6);
      expect(balance.consumption).toBeCloseTo(1.8, 6);
      // selfConsumption = (1 - 2.2/3.0) * 100 ~= 26.6667
      expect(balance.selfConsumption).toBeCloseTo((1 - 2.2 / 3.0) * 100, 6);
      // selfSufficiency = (1 - 1.0/1.8) * 100 ~= 44.4444
      expect(balance.selfSufficiency).toBeCloseTo((1 - 1.0 / 1.8) * 100, 6);
      expect(balance.selfConsumption).toBeLessThan(100);
      expect(balance.selfSufficiency).toBeLessThan(100);
    });
  });

  describe('RW-M03 AC2: the grid identity, exactly (single-bucket fixtures)', () => {
    test('AC2a: {pv 0, load 1000, battery 0} => import 1.0, export 0', () => {
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 0, avg_load_power_w: 1000, avg_battery_power_w: 0 }],
      });
      expect(balance.import).toBeCloseTo(1.0, 6);
      expect(balance.export).toBeCloseTo(0, 6);
    });

    test('AC2b: {pv 3000, load 800, battery 0} => export 2.2, import 0', () => {
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 0 }],
      });
      expect(balance.export).toBeCloseTo(2.2, 6);
      expect(balance.import).toBeCloseTo(0, 6);
    });

    test('AC2c: {pv 3000, load 800, battery +2200} => import 0 and export 0 (surplus fully charges battery)', () => {
      // grid = 800 - 3000 + 2200 = 0
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 2200 }],
      });
      expect(balance.import).toBeCloseTo(0, 6);
      expect(balance.export).toBeCloseTo(0, 6);
    });

    test('AC2d: {pv 0, load 500, battery -1200} => export 0.7 (battery discharge exceeding load exports)', () => {
      // grid = 500 - 0 - 1200 = -700
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 0, avg_load_power_w: 500, avg_battery_power_w: -1200 }],
      });
      expect(balance.export).toBeCloseTo(0.7, 6);
      expect(balance.import).toBeCloseTo(0, 6);
    });
  });

  describe('RW-M03 AC3: dead-field independence (avg_export_power_w is never read)', () => {
    function bucketWithExport(exportValue) {
      var bucket = {
        avg_pv_power_w: 1500,
        max_pv_power_w: 2400,
        avg_battery_power_w: 200,
        avg_battery_soc_pct: 45,
        avg_load_power_w: 1050,
        sample_count: 60,
      };
      if (exportValue !== undefined) {
        bucket.avg_export_power_w = exportValue;
      }
      return bucket;
    }

    test('AC3: avg_export_power_w absent, 0, +9999 and -9999 all return deep-equal results', () => {
      var absent = EnergyBalance.computeBalance({ series: [bucketWithExport(undefined)] });
      var zero = EnergyBalance.computeBalance({ series: [bucketWithExport(0)] });
      var plus = EnergyBalance.computeBalance({ series: [bucketWithExport(9999)] });
      var minus = EnergyBalance.computeBalance({ series: [bucketWithExport(-9999)] });

      expect(zero).toEqual(absent);
      expect(plus).toEqual(absent);
      expect(minus).toEqual(absent);
    });

    test('AC3: the shared result derives only from pv/load/battery (grid = 1050-1500+200 = -250 => export 0.25)', () => {
      var balance = EnergyBalance.computeBalance({ series: [bucketWithExport(undefined)] });
      expect(balance.export).toBeCloseTo(0.25, 6);
      expect(balance.import).toBeCloseTo(0, 6);
    });
  });

  describe('RW-M03 AC4: unchanged aggregations (production, consumption, battery)', () => {
    test('AC4: production, consumption, batteryCharge, batteryDischarge sum exactly as before', () => {
      var series = {
        series: [
          { avg_pv_power_w: 2000, avg_load_power_w: 1500, avg_battery_power_w: 300 },
          { avg_pv_power_w: 500, avg_load_power_w: 1200, avg_battery_power_w: -400 },
          { avg_pv_power_w: 0, avg_load_power_w: 900, avg_battery_power_w: 0 },
        ],
      };
      var balance = EnergyBalance.computeBalance(series);
      // production = (2000+500+0)/1000 = 2.5
      expect(balance.production).toBeCloseTo(2.5, 6);
      // consumption = (1500+1200+900)/1000 = 3.6
      expect(balance.consumption).toBeCloseTo(3.6, 6);
      // batteryCharge = 300/1000 = 0.3 (only the positive bucket)
      expect(balance.batteryCharge).toBeCloseTo(0.3, 6);
      // batteryDischarge = abs(-400)/1000 = 0.4 (only the negative bucket)
      expect(balance.batteryDischarge).toBeCloseTo(0.4, 6);
    });
  });

  describe('RW-M03 AC5: zero edges preserved (additional AC-traced coverage; originals above stay untouched)', () => {
    test('AC5: zero production => selfConsumption 0, not NaN', () => {
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 0, avg_load_power_w: 800, avg_battery_power_w: -500 }],
      });
      expect(balance.production).toBe(0);
      expect(balance.selfConsumption).toBe(0);
      expect(Number.isNaN(balance.selfConsumption)).toBe(false);
    });

    test('AC5: zero consumption => selfSufficiency 100, not NaN', () => {
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 3000, avg_load_power_w: 0, avg_battery_power_w: 1000 }],
      });
      expect(balance.consumption).toBe(0);
      expect(balance.selfSufficiency).toBe(100);
      expect(Number.isNaN(balance.selfSufficiency)).toBe(false);
    });

    test('AC5: selfConsumption and selfSufficiency stay clamped 0-100', () => {
      var balance = EnergyBalance.computeBalance({
        series: [{ avg_pv_power_w: 5000, avg_load_power_w: 100, avg_battery_power_w: 0 }],
      });
      expect(balance.selfConsumption).toBeGreaterThanOrEqual(0);
      expect(balance.selfConsumption).toBeLessThanOrEqual(100);
      expect(balance.selfSufficiency).toBeGreaterThanOrEqual(0);
      expect(balance.selfSufficiency).toBeLessThanOrEqual(100);
    });

    test('AC5: empty series => all zeros, selfSufficiency 100, no throw', () => {
      expect(() => {
        var balance = EnergyBalance.computeBalance({ series: [] });
        expect(balance.production).toBe(0);
        expect(balance.export).toBe(0);
        expect(balance.import).toBe(0);
        expect(balance.batteryCharge).toBe(0);
        expect(balance.batteryDischarge).toBe(0);
        expect(balance.consumption).toBe(0);
        expect(balance.selfConsumption).toBe(0);
        expect(balance.selfSufficiency).toBe(100);
      }).not.toThrow();
    });
  });

  describe('RW-M03 AC6: malformed buckets degrade, never NaN (the RW-M02 lesson, specified up front)', () => {
    // Hardcoded target reference for a single well-formed bucket computed
    // alone (pv=1000, load=1500, battery=200 => grid=700 => import 0.7).
    // Hardcoded (not computed live) so this reference cannot itself be
    // NaN-poisoned by today's pre-fix code when a test file is loaded.
    var GOOD_ALONE = {
      production: 1,
      export: 0,
      import: 0.7,
      batteryCharge: 0.2,
      batteryDischarge: 0,
      consumption: 1.5,
      selfConsumption: 100,
      selfSufficiency: 53.333333,
    };
    var GOOD_BUCKET = { avg_pv_power_w: 1000, avg_load_power_w: 1500, avg_battery_power_w: 200 };

    function expectNoNaN(balance) {
      Object.keys(balance).forEach(function (key) {
        expect(Number.isNaN(balance[key])).toBe(false);
      });
    }

    function expectEqualsGoodAlone(balance) {
      expect(balance.production).toBeCloseTo(GOOD_ALONE.production, 6);
      expect(balance.export).toBeCloseTo(GOOD_ALONE.export, 6);
      expect(balance.import).toBeCloseTo(GOOD_ALONE.import, 6);
      expect(balance.batteryCharge).toBeCloseTo(GOOD_ALONE.batteryCharge, 6);
      expect(balance.batteryDischarge).toBeCloseTo(GOOD_ALONE.batteryDischarge, 6);
      expect(balance.consumption).toBeCloseTo(GOOD_ALONE.consumption, 6);
      expect(balance.selfConsumption).toBeCloseTo(GOOD_ALONE.selfConsumption, 6);
      expect(balance.selfSufficiency).toBeCloseTo(GOOD_ALONE.selfSufficiency, 5);
    }

    // Malformed-value catalogue: absent key, explicit undefined, NaN,
    // non-numeric string, and null -- each applied to exactly one of the
    // three fields the identity reads, while the OTHER TWO fields on that
    // same bucket stay valid and non-zero. This distinguishes "skip the
    // whole malformed bucket" (contract-specified: "contributes 0 to every
    // total") from "zero out only the bad field, keep the rest" (a
    // plausible but wrong partial-credit implementation) -- if the Builder
    // only zeroes the bad field, these tests fail because the bucket's
    // other valid fields would still count.
    // RULING (Governor, AC6 confirmed): whole-bucket skip is required, not
    // just accepted -- the identity needs all three fields at once, so
    // per-field zeroing would fabricate a phantom grid value from a partial
    // bucket (e.g. load 800 with pv coerced to 0 => a fake 800 W import),
    // and that phantom value would break AC7's conservation property; a
    // bucket unusable for the identity is unusable entirely.
    var MALFORMED_LABELS = [
      'absent (key omitted)',
      'explicit undefined',
      'NaN',
      'non-numeric string',
      'null',
    ];

    function applyMalformed(bucket, field, label) {
      switch (label) {
        case 'absent (key omitted)':
          delete bucket[field];
          break;
        case 'explicit undefined':
          bucket[field] = undefined;
          break;
        case 'NaN':
          bucket[field] = NaN;
          break;
        case 'non-numeric string':
          bucket[field] = 'not-a-number';
          break;
        case 'null':
          bucket[field] = null;
          break;
        default:
          throw new Error('unknown label: ' + label);
      }
      return bucket;
    }

    ['avg_pv_power_w', 'avg_load_power_w', 'avg_battery_power_w'].forEach(function (field) {
      MALFORMED_LABELS.forEach(function (label) {
        test(
          'AC6: bucket with ' +
            label +
            ' ' +
            field +
            ' contributes 0 to every total (whole bucket skipped)',
          () => {
            var malformed = applyMalformed(
              { avg_pv_power_w: 2000, avg_load_power_w: 1300, avg_battery_power_w: 400 },
              field,
              label
            );

            var balance = EnergyBalance.computeBalance({ series: [GOOD_BUCKET, malformed] });
            expectNoNaN(balance);
            expectEqualsGoodAlone(balance);
          }
        );
      });
    });

    test('AC6: the contract fixture [good, {avg_pv_power_w: NaN}, {}] => totals equal the good bucket alone', () => {
      // good bucket: pv=1500, load=1050, battery=200 => grid=-250 => export 0.25
      var goodBucket = {
        avg_pv_power_w: 1500,
        max_pv_power_w: 2400,
        avg_battery_power_w: 200,
        avg_battery_soc_pct: 45,
        avg_load_power_w: 1050,
        sample_count: 60,
      };
      var expected = {
        production: 1.5,
        export: 0.25,
        import: 0,
        batteryCharge: 0.2,
        batteryDischarge: 0,
        consumption: 1.05,
        selfConsumption: 83.333333,
        selfSufficiency: 100,
      };

      var balance = EnergyBalance.computeBalance({
        series: [goodBucket, { avg_pv_power_w: NaN }, {}],
      });

      expectNoNaN(balance);
      expect(balance.production).toBeCloseTo(expected.production, 6);
      expect(balance.export).toBeCloseTo(expected.export, 6);
      expect(balance.import).toBeCloseTo(expected.import, 6);
      expect(balance.batteryCharge).toBeCloseTo(expected.batteryCharge, 6);
      expect(balance.batteryDischarge).toBeCloseTo(expected.batteryDischarge, 6);
      expect(balance.consumption).toBeCloseTo(expected.consumption, 6);
      expect(balance.selfConsumption).toBeCloseTo(expected.selfConsumption, 5);
      expect(balance.selfSufficiency).toBeCloseTo(expected.selfSufficiency, 6);
    });

    // RULING (Governor, AC6b ratified): a numeric string is not coerced --
    // same precedent as RW-M02 AC10g: a JSON number arriving as a string
    // means the payload contract broke, and improvising a coercion around it
    // is the HC-006 failure mode, not a fix.
    test('AC6b: bucket with avg_pv_power_w as a numeric string ("1000") is skipped whole, not coerced', () => {
      var malformed = { avg_pv_power_w: '1000', avg_load_power_w: 500, avg_battery_power_w: 0 };

      var balance = EnergyBalance.computeBalance({ series: [GOOD_BUCKET, malformed] });
      expectNoNaN(balance);
      expectEqualsGoodAlone(balance);
    });
  });

  describe('RW-M03 AC7: conservation property on the AC1 mixed fixture', () => {
    test('AC7: production - export + import + batteryDischarge - batteryCharge ~= consumption (tolerance 1e-9)', () => {
      var series = {
        series: [
          { avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 0 },
          { avg_pv_power_w: 0, avg_load_power_w: 1000, avg_battery_power_w: 0 },
        ],
      };
      var balance = EnergyBalance.computeBalance(series);
      var lhs =
        balance.production -
        balance.export +
        balance.import +
        balance.batteryDischarge -
        balance.batteryCharge;
      expect(Math.abs(lhs - balance.consumption)).toBeLessThan(1e-9);
    });

    // Added after mutation testing showed AC7's original fixture was blind
    // to battery-sign errors (RW-M03 Verification): both AC7 buckets have
    // avg_battery_power_w: 0, so a mutant that subtracts the battery term
    // instead of adding it (grid = load - pv - battery) produces the same
    // grid value there and passes undetected. This fixture uses nonzero,
    // mixed-sign battery values so the conservation check actually exercises
    // the battery term it exists to verify.
    test('AC7b: conservation holds with nonzero, mixed-sign battery values (tolerance 1e-9)', () => {
      var series = {
        series: [
          { avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 1500 },
          { avg_pv_power_w: 0, avg_load_power_w: 1200, avg_battery_power_w: -900 },
          { avg_pv_power_w: 500, avg_load_power_w: 500, avg_battery_power_w: 200 },
        ],
      };
      var balance = EnergyBalance.computeBalance(series);
      var lhs =
        balance.production -
        balance.export +
        balance.import +
        balance.batteryDischarge -
        balance.batteryCharge;
      expect(Math.abs(lhs - balance.consumption)).toBeLessThan(1e-9);
    });
  });

  describe('RW-M03 AC8: mock rider -- mock-mode balance numbers pinned', () => {
    // RULING (Governor, AC8 rewritten): the Spec Author's original pin of
    // TODAY's pre-fix numbers exposed that the Architect's "mock buckets are
    // conservation-consistent" claim was wrong for 8 of the 10 buckets (it
    // was verified on one bucket and generalised). Corrected ruling: mock-mode
    // numbers DO change under the fix, and that is correct -- the mock's
    // avg_export_power_w values are internally inconsistent fiction that
    // disagree with the mock's own pv/load/battery in 8/10 buckets, and
    // post-fix computeBalance derives from the grid identity, which is the
    // self-consistent truth. This test now pins the IDENTITY-DERIVED totals
    // (RED today, green after the Builder's fix, and thereafter the
    // regression pin for mock-mode balance).
    //
    // The pre-fix mock numbers this replaces (export 5.95 / import 1.25 /
    // selfConsumption 73.614191 / selfSufficiency 90.909091) were produced by
    // the dead field's invented values and die with it. The mock's
    // avg_export_power_w stays in the payload untouched (charts.js:70 / D4
    // still reads it -- its disposition is a separate decision, out of scope
    // here).
    test('AC8: getMockSungrowSeriesDay() balance totals, pinned to the identity-derived derivation', () => {
      var series = MockData.getMockSungrowSeriesDay();
      var balance = EnergyBalance.computeBalance(series);

      expect(Math.round(balance.production * 1e6) / 1e6).toBe(22.55);
      expect(Math.round(balance.export * 1e6) / 1e6).toBe(8.95);
      expect(Math.round(balance.import * 1e6) / 1e6).toBe(0.95);
      expect(Math.round(balance.batteryCharge * 1e6) / 1e6).toBe(2);
      expect(Math.round(balance.batteryDischarge * 1e6) / 1e6).toBe(1.2);
      expect(Math.round(balance.consumption * 1e6) / 1e6).toBe(13.75);
      expect(Math.round(balance.selfConsumption * 1e6) / 1e6).toBe(60.310421);
      expect(Math.round(balance.selfSufficiency * 1e6) / 1e6).toBe(93.090909);
    });
  });
});
