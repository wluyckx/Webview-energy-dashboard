/**
 * Tests for Charts module (STORY-009, STORY-011, RW-M06).
 *
 * Validates the pure transformSeriesToDatasets function: label formatting,
 * kW conversion, dataset count, color assignments, and empty data handling.
 *
 * Validates transformMonthlyToBarData: day-of-month labels, daily kWh
 * conversion, dataset count, color assignments, and empty data handling.
 *
 * RW-M06 (D4 fix): the Grid series used to sum bucket.avg_export_power_w --
 * the always-0-on-real-firmware field (HC-006) -- so the production grid
 * line was flat 0. Replaced with the Architect-ruled, negated conservation
 * identity:
 *   gridKw(bucket) = (avg_pv_power_w - avg_load_power_w - avg_battery_power_w) / 1000
 * (export positive, import negative -- the chart's existing orientation;
 * this is RW-M03's balance identity negated). One pre-existing test pinned
 * the defective derivation and is replaced in place (marked
 * `REPLACED (RW-M06 AC1)`); the "handles multiple buckets" test's grid
 * assertion is annotated -- its fixture's avg_export_power_w values were
 * constructed to already equal the identity, so it survives numerically
 * unchanged but does not discriminate the fix (same masking pattern as
 * D1/D2, called out rather than silently left as false regression cover).
 * New AC1-AC6 tests below trace 1:1 to docs/stories/RW-M06.md.
 *
 * CHANGELOG:
 * - 2026-07-30: Replace defective-derivation pin, add AC1-AC6 tests (RW-M06)
 * - 2026-02-15: Add monthly bar chart tests (STORY-011)
 * - 2026-02-15: Initial tests (STORY-009)
 */

var Charts = require('../src/charts.js');
var EnergyBalance = require('../src/energy-balance.js');
var MockData = require('../src/mock-data.js');
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

    // REPLACED (RW-M06 AC1): pinned the dead-field derivation
    // (bucket.avg_export_power_w / 1000 -- the series average of the
    // always-0 firmware field, defect D4). This fixture's
    // avg_export_power_w (600.5) happens to equal the identity result
    // (1200.5 - 1100.0 - (-500.0) = 600.5) by construction, so the pin
    // could not have caught the defect even before the fix. Replaced by
    // the 'RW-M06 AC1' and 'RW-M06 AC3' describe blocks below, which use
    // fixtures where avg_export_power_w deliberately disagrees with the
    // identity so the derivation is actually discriminated.

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
      // NOTE (RW-M06): this fixture's avg_export_power_w values (600.5,
      // 1200.0, 2200.0) were constructed to equal
      // (avg_pv_power_w - avg_load_power_w - avg_battery_power_w) exactly
      // for all three buckets, so this assertion is numerically unchanged
      // by the RW-M06 identity fix -- it is NOT a discriminating test for
      // D4 (checked per the Spec Author contract; left as-is, non-blocking
      // regression cover only). The identity itself is pinned, with
      // deliberately-disagreeing avg_export_power_w, by 'RW-M06 AC1'.
      expect(result.datasets[2].data).toEqual([0.6005, 1.2, 2.2]);
      expect(result.datasets[3].data).toEqual([1.1, 1.3, 1.5]);
    });
  });

  describe('RW-M06 AC1: grid series derives from the negated conservation identity', function () {
    test('AC1: grid data = (avg_pv_power_w - avg_load_power_w - avg_battery_power_w) / 1000, ignoring garbage avg_export_power_w', function () {
      var series = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          // grid = (2000 - 500 - 100) / 1000 = 1.4 (export). avg_export_power_w
          // is deliberately garbage/disagreeing to prove it is not read.
          {
            bucket: '2026-02-15T08:00:00',
            avg_pv_power_w: 2000,
            avg_load_power_w: 500,
            avg_battery_power_w: 100,
            avg_export_power_w: -99999,
          },
          // grid = (0 - 1200 - (-300)) / 1000 = -0.9 (import).
          {
            bucket: '2026-02-15T09:00:00',
            avg_pv_power_w: 0,
            avg_load_power_w: 1200,
            avg_battery_power_w: -300,
            avg_export_power_w: 88888,
          },
        ],
      };
      var result = Charts.transformSeriesToDatasets(series);
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      expect(grid.data[0]).toBeCloseTo(1.4, 6);
      expect(grid.data[1]).toBeCloseTo(-0.9, 6);
    });
  });

  describe('RW-M06 AC2: sign pin and cross-module direction check', function () {
    test('AC2: {pv:3000, load:800, battery:0} plots +2.2 (export up)', function () {
      var result = Charts.transformSeriesToDatasets({
        series: [{ avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 0 }],
      });
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      expect(grid.data[0]).toBeCloseTo(2.2, 6);
    });

    test('AC2: {pv:0, load:1000, battery:0} plots -1.0 (import down)', function () {
      var result = Charts.transformSeriesToDatasets({
        series: [{ avg_pv_power_w: 0, avg_load_power_w: 1000, avg_battery_power_w: 0 }],
      });
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      expect(grid.data[0]).toBeCloseTo(-1.0, 6);
    });

    // Cross-module bridge (the RW-M03 cross-module check extended to the
    // chart, per the AC2 text): the same buckets, run through
    // Charts.transformSeriesToDatasets AND EnergyBalance.computeBalance,
    // must agree on direction -- a bucket the balance classifies as export
    // (balance.export > 0) must plot POSITIVE in the grid series, and a
    // bucket classified as import (balance.import > 0) must plot NEGATIVE.
    // Reuses RW-M03's AC2(a-d) fixtures verbatim for direct traceability.
    var CROSS_MODULE_BUCKETS = [
      {
        label: 'AC2a (RW-M03): {pv:0, load:1000, battery:0} -> import',
        bucket: { avg_pv_power_w: 0, avg_load_power_w: 1000, avg_battery_power_w: 0 },
      },
      {
        label: 'AC2b (RW-M03): {pv:3000, load:800, battery:0} -> export',
        bucket: { avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 0 },
      },
      {
        label: 'AC2c (RW-M03): {pv:3000, load:800, battery:2200} -> balanced (neither)',
        bucket: { avg_pv_power_w: 3000, avg_load_power_w: 800, avg_battery_power_w: 2200 },
      },
      {
        label: 'AC2d (RW-M03): {pv:0, load:500, battery:-1200} -> export (battery-fed)',
        bucket: { avg_pv_power_w: 0, avg_load_power_w: 500, avg_battery_power_w: -1200 },
      },
    ];

    CROSS_MODULE_BUCKETS.forEach(function (fixture) {
      test('AC2 cross-module: ' + fixture.label, function () {
        var balance = EnergyBalance.computeBalance({ series: [fixture.bucket] });
        var chart = Charts.transformSeriesToDatasets({ series: [fixture.bucket] });
        var grid = chart.datasets.find(function (ds) {
          return ds.label === 'Grid';
        });
        var gridPoint = grid.data[0];

        if (balance.export > 0) {
          expect(gridPoint).toBeGreaterThan(0);
          expect(gridPoint).toBeCloseTo(balance.export, 6);
        } else if (balance.import > 0) {
          expect(gridPoint).toBeLessThan(0);
          expect(Math.abs(gridPoint)).toBeCloseTo(balance.import, 6);
        } else {
          // Balanced bucket: neither export nor import classified: the
          // chart's identity must agree at exactly zero too.
          expect(balance.export).toBeCloseTo(0, 6);
          expect(balance.import).toBeCloseTo(0, 6);
          expect(gridPoint).toBeCloseTo(0, 6);
        }
      });
    });
  });

  describe('RW-M06 AC3: dead-field independence (avg_export_power_w is never read)', function () {
    function bucketWithExport(exportValue) {
      var bucket = {
        avg_pv_power_w: 1500,
        avg_load_power_w: 1050,
        avg_battery_power_w: 200,
      };
      if (exportValue !== undefined) {
        bucket.avg_export_power_w = exportValue;
      }
      return bucket;
    }

    test('AC3: avg_export_power_w absent, 0, +9999 and -9999 all produce deep-equal transform results', function () {
      var absent = Charts.transformSeriesToDatasets({ series: [bucketWithExport(undefined)] });
      var zero = Charts.transformSeriesToDatasets({ series: [bucketWithExport(0)] });
      var plus = Charts.transformSeriesToDatasets({ series: [bucketWithExport(9999)] });
      var minus = Charts.transformSeriesToDatasets({ series: [bucketWithExport(-9999)] });

      expect(zero).toEqual(absent);
      expect(plus).toEqual(absent);
      expect(minus).toEqual(absent);
    });

    test('AC3: the shared grid value derives only from pv/load/battery (1500-1050-200=250 => 0.25)', function () {
      var result = Charts.transformSeriesToDatasets({ series: [bucketWithExport(undefined)] });
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      expect(grid.data[0]).toBeCloseTo(0.25, 6);
    });
  });

  describe('RW-M06 AC4: malformed buckets degrade the grid point to null, never NaN', function () {
    // Malformed-value catalogue, same shape as RW-M03's AC6 catalogue: each
    // applied to exactly one of the three identity fields, while the other
    // two on that same bucket stay valid and non-zero, so a Builder that
    // only guards its "own" field (rather than the whole identity) would be
    // caught by the two fields that DON'T change.
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

    // Base bucket: pv=2000 (-> 2), load=1300 (-> 1.3), battery=400 (-> 0.4).
    // Whichever field is malformed, the OTHER two identity fields stay at
    // these values, so the other two series' points for this bucket must
    // equal 2, 1.3 or 0.4 exactly wherever they are not the malformed one.
    ['avg_pv_power_w', 'avg_load_power_w', 'avg_battery_power_w'].forEach(function (field) {
      MALFORMED_LABELS.forEach(function (label) {
        test(
          'AC4: bucket with ' + label + ' ' + field + ' => grid point is null (not NaN, not 0)',
          function () {
            var bucket = applyMalformed(
              { avg_pv_power_w: 2000, avg_load_power_w: 1300, avg_battery_power_w: 400 },
              field,
              label
            );
            var result = Charts.transformSeriesToDatasets({ series: [bucket] });
            var grid = result.datasets.find(function (ds) {
              return ds.label === 'Grid';
            });
            expect(grid.data[0]).toBeNull();
            expect(Number.isNaN(grid.data[0])).toBe(false);

            // AS-IS pin (deliberately OUT OF SCOPE for this story -- guarding
            // the other three series is a separate, un-authorised change to
            // this frozen file; RW-M06 touches the grid series only). Today's
            // unguarded behaviour: `null` coerces to 0 under `/`, everything
            // else (absent/undefined/NaN/non-numeric-string) coerces to NaN.
            var solar = result.datasets.find(function (ds) {
              return ds.label === 'Solar';
            });
            var battery = result.datasets.find(function (ds) {
              return ds.label === 'Battery';
            });
            var home = result.datasets.find(function (ds) {
              return ds.label === 'Home';
            });
            var malformedIsNull = label === 'null';

            if (field === 'avg_pv_power_w') {
              if (malformedIsNull) {
                expect(solar.data[0]).toBe(0);
              } else {
                expect(Number.isNaN(solar.data[0])).toBe(true);
              }
              expect(battery.data[0]).toBeCloseTo(0.4, 6);
              expect(home.data[0]).toBeCloseTo(1.3, 6);
            } else if (field === 'avg_load_power_w') {
              if (malformedIsNull) {
                expect(home.data[0]).toBe(0);
              } else {
                expect(Number.isNaN(home.data[0])).toBe(true);
              }
              expect(solar.data[0]).toBeCloseTo(2, 6);
              expect(battery.data[0]).toBeCloseTo(0.4, 6);
            } else {
              if (malformedIsNull) {
                expect(battery.data[0]).toBe(0);
              } else {
                expect(Number.isNaN(battery.data[0])).toBe(true);
              }
              expect(solar.data[0]).toBeCloseTo(2, 6);
              expect(home.data[0]).toBeCloseTo(1.3, 6);
            }
          }
        );
      });
    });

    test('AC4: mixed fixture [good, malformed, good] => grid [value, null, value]', function () {
      var goodBucket = { avg_pv_power_w: 1500, avg_load_power_w: 1050, avg_battery_power_w: 200 };
      var malformedBucket = {
        avg_pv_power_w: NaN,
        avg_load_power_w: 1300,
        avg_battery_power_w: 400,
      };

      var result = Charts.transformSeriesToDatasets({
        series: [goodBucket, malformedBucket, goodBucket],
      });
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });

      expect(grid.data[0]).toBeCloseTo(0.25, 6);
      expect(grid.data[1]).toBeNull();
      expect(grid.data[2]).toBeCloseTo(0.25, 6);

      // AS-IS pin for the malformed bucket's other series (out of scope,
      // see above): solar NaN (pv malformed), battery/home unaffected.
      var solar = result.datasets.find(function (ds) {
        return ds.label === 'Solar';
      });
      var battery = result.datasets.find(function (ds) {
        return ds.label === 'Battery';
      });
      var home = result.datasets.find(function (ds) {
        return ds.label === 'Home';
      });
      expect(Number.isNaN(solar.data[1])).toBe(true);
      expect(battery.data[1]).toBeCloseTo(0.4, 6);
      expect(home.data[1]).toBeCloseTo(1.3, 6);
    });

    // AC10g/AC6b precedent (RW-M02/RW-M03): a numeric string is not coerced
    // into a valid identity field, even though the raw, unguarded `/1000`
    // division that the OTHER series still use WOULD coerce it. This proves
    // the guard rejects numeric strings specifically, rather than merely
    // rejecting non-numeric ones.
    test('AC4: bucket with avg_pv_power_w as a numeric string ("2000") is not coerced -- grid stays null', function () {
      var bucket = { avg_pv_power_w: '2000', avg_load_power_w: 1300, avg_battery_power_w: 400 };
      var result = Charts.transformSeriesToDatasets({ series: [bucket] });
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });
      var solar = result.datasets.find(function (ds) {
        return ds.label === 'Solar';
      });
      expect(grid.data[0]).toBeNull();
      // AS-IS pin (out of scope): the raw Solar push naively coerces the
      // numeric string via `/`, unlike the guarded grid identity.
      expect(solar.data[0]).toBeCloseTo(2, 6);
    });
  });

  describe('RW-M06 AC5: the other three series remain byte-identical in derivation', function () {
    test('AC5: Solar, Battery and Home stay avg_pv_power_w/1000, avg_battery_power_w/1000, avg_load_power_w/1000 -- unaffected by the grid fix, and independent of avg_export_power_w', function () {
      var series = {
        device_id: 'inverter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-02-15T08:00:00',
            avg_pv_power_w: 1234.5,
            avg_battery_power_w: -321.0,
            avg_load_power_w: 987.0,
            // Deliberately garbage/disagreeing avg_export_power_w to prove
            // the other three series never read it either.
            avg_export_power_w: 777777,
          },
        ],
      };
      var result = Charts.transformSeriesToDatasets(series);
      var solar = result.datasets.find(function (ds) {
        return ds.label === 'Solar';
      });
      var battery = result.datasets.find(function (ds) {
        return ds.label === 'Battery';
      });
      var home = result.datasets.find(function (ds) {
        return ds.label === 'Home';
      });

      expect(solar.data[0]).toBeCloseTo(1234.5 / 1000, 6);
      expect(battery.data[0]).toBeCloseTo(-321.0 / 1000, 6);
      expect(home.data[0]).toBeCloseTo(987.0 / 1000, 6);
      // Still exactly 4 datasets, still ordered Solar/Battery/Grid/Home, and
      // styling (colors, fill, tension) untouched -- covered already by the
      // pre-existing tests above, which stay green unmodified.
    });
  });

  describe('RW-M06 AC6: mock-mode consequence, pinned', function () {
    // Independently recomputed (not copied from src/) from
    // MockData.getMockSungrowSeriesDay()'s 10 buckets using the identity
    // (avg_pv_power_w - avg_load_power_w - avg_battery_power_w) / 1000:
    //   bucket @6:  (50   - 800  - (-100)) / 1000 = -0.65
    //   bucket @7:  (500  - 1100 - (-300)) / 1000 = -0.3
    //   bucket @8:  (1500 - 1050 - 200)    / 1000 =  0.25
    //   bucket @9:  (2800 - 1200 - 500)    / 1000 =  1.1
    //   bucket @10: (3400 - 1300 - 800)    / 1000 =  1.3
    //   bucket @11: (3800 - 1500 - 400)    / 1000 =  1.9
    //   bucket @12: (3600 - 2000 - 100)    / 1000 =  1.5
    //   bucket @13: (3200 - 1800 - 0)      / 1000 =  1.4
    //   bucket @14: (2500 - 1600 - (-200)) / 1000 =  1.1
    //   bucket @15: (1200 - 1400 - (-600)) / 1000 =  0.4
    // This differs from today's avg_export_power_w/1000 array
    // ([-0.65, -0.4, 0.25, 0.6, 0.5, 1.5, 1.2, 1.4, 0.5, -0.2]) at 7 of the
    // 10 indices -- RED today, GREEN after the RW-M06 fix, and the
    // regression pin for mock-mode grid values thereafter.
    test('AC6: getMockSungrowSeriesDay() grid series pinned to the identity-derived values', function () {
      var series = MockData.getMockSungrowSeriesDay();
      var result = Charts.transformSeriesToDatasets(series);
      var grid = result.datasets.find(function (ds) {
        return ds.label === 'Grid';
      });

      var expected = [-0.65, -0.3, 0.25, 1.1, 1.3, 1.9, 1.5, 1.4, 1.1, 0.4];
      expect(grid.data).toHaveLength(expected.length);
      expected.forEach(function (value, i) {
        expect(grid.data[i]).toBeCloseTo(value, 6);
      });
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
