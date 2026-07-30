/**
 * Tests for P1 Power Card module (src/p1-card.js).
 *
 * RW-M04: D3 — the Day/Month/Year tabs must stop rendering NaN bars computed
 * from four invented `/v1/series` fields (energy_import_kwh,
 * energy_export_kwh, avg_power_w, max_power_w — none captured from the live
 * API, HC-006) and instead render a static, honest unavailable state that
 * makes zero API calls. The Live tab's realtime path is correct today and is
 * pinned here as regression cover, not changed by this story.
 *
 * These are the FIRST tests p1-card.js has ever had.
 *
 * CHANGELOG:
 * - 2026-07-30: Add AC10 — pin the Live ring buffer's export leg
 *   (export_w = Math.max(0, -power_w), plotted as -p.export_w) after
 *   mutation testing found it covered only by coincidence: every existing
 *   fixture used a positive power_w, so a mutant dropping the negation on
 *   the export leg survived (RW-M04)
 * - 2026-07-30: Add AC9 — pin the Builder's Architect-ratified deviation
 *   resetting the header live-value indicator (#p1-card-live-value) to idle
 *   ("--W", non-active dot) on entering a gated view, so a stale reading
 *   never poses as live next to a pulsing dot (RW-M04)
 * - 2026-07-30: Initial test suite — AC1-AC7 coverage for RW-M04 (RW-M04)
 */

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
// p1-card.js is an IIFE with module-level state (currentView, chart,
// liveBuffer, pollTimer) captured in its closure at require() time. To keep
// tests order-independent, every test gets a FRESH module instance:
// jest.resetModules() clears the require cache, then require() re-executes
// the IIFE, resetting all closure state to its initial values. No test may
// rely on state left behind by a previous test.
//
// Fake timers are armed for every test (jest.useFakeTimers()) because AC2's
// poll-tick assertions need jest.advanceTimersByTime(). Native Promise
// microtasks are NOT affected by fake timers (only macrotasks are), so
// `await Promise.resolve()` still reliably flushes pending .then() callbacks
// — the same pattern already used alongside fake timers in
// tests/api-client.test.js.

function freshChartConstructor() {
  return jest.fn(function (ctx, chartConfig) {
    this.destroy = jest.fn();
    this.update = jest.fn();
    this.data = chartConfig.data;
    this.config = chartConfig;
  });
}

function makeConfig(overrides) {
  return Object.assign(
    {
      p1_base: 'https://api.p1.example.dev',
      p1_device_id: 'device-p1-001',
      mock: false,
    },
    overrides || {}
  );
}

var P1Card;

beforeEach(function () {
  jest.useFakeTimers();

  document.body.innerHTML = '<div id="section-p1-card"></div>';

  global.Chart = freshChartConstructor();

  // jsdom does not implement <canvas> 2D rendering. Stub just enough of the
  // context surface p1-card.js touches: createLinearGradient/addColorStop,
  // used only by the live-view gradient fills.
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    return {
      createLinearGradient: jest.fn(function () {
        return { addColorStop: jest.fn() };
      }),
    };
  });

  global.Config = {
    getConfig: jest.fn(function () {
      return makeConfig();
    }),
  };

  global.ApiClient = {
    fetchP1Realtime: jest.fn(function () {
      return Promise.resolve({ power_w: 100 });
    }),
    fetchP1Series: jest.fn(function () {
      return Promise.resolve({ device_id: 'p1-meter-01', frame: 'day', series: [] });
    }),
  };

  jest.resetModules();
  P1Card = require('../src/p1-card.js');
});

afterEach(function () {
  jest.clearAllTimers();
  jest.useRealTimers();
  document.body.innerHTML = '';
  delete global.Chart;
  delete global.Config;
  delete global.ApiClient;
});

// ===========================================================================
// AC1: gated views render a defined unavailable state; no canvas chart; the
// rendered card never contains "NaN" or "undefined".
// ===========================================================================
describe('AC1: unavailable state on gated tabs', function () {
  ['day', 'month', 'year'].forEach(function (view) {
    test(
      'switching to ' +
        view +
        ' renders .p1-card__unavailable with role="status" ' +
        'and explanatory text',
      function () {
        P1Card.init();
        P1Card.switchView(view);

        var el = document.querySelector('#section-p1-card .p1-card__unavailable');
        expect(el).not.toBeNull();
        expect(el.getAttribute('role')).toBe('status');
        expect(el.textContent.trim().length).toBeGreaterThan(0);
      }
    );
  });

  // Represents all three gated views: switchView('day'|'month'|'year') runs
  // the same code path (verified by reading src/p1-card.js), so one
  // representative check is sufficient here for the canvas-absence claim.
  test('no <canvas> element remains in the card while on a gated view (day)', function () {
    P1Card.init();
    P1Card.switchView('day');

    var canvas = document.querySelector('#section-p1-card canvas');
    expect(canvas).toBeNull();
  });

  test('rendered card never contains "NaN" or "undefined", even for a series payload that lacks the invented fields', async function () {
    // NOTE: this fixture intentionally omits energy_import_kwh /
    // energy_export_kwh / avg_power_w / max_power_w. The real P1 /v1/series
    // bucket shape has never been captured (R1/HC-006) — these four names
    // are the invented fields this story deletes. Any bucket shape lacking
    // them reproduces the NaN defect today via computeDeltas.
    global.ApiClient.fetchP1Series.mockImplementation(function () {
      return Promise.resolve({
        device_id: 'p1-meter-01',
        frame: 'day',
        series: [{ bucket: '2026-07-30T08:00:00' }, { bucket: '2026-07-30T09:00:00' }],
      });
    });

    P1Card.init();
    P1Card.switchView('day');
    await Promise.resolve();
    await Promise.resolve();

    var section = document.getElementById('section-p1-card');
    expect(section.innerHTML).not.toMatch(/NaN/);
    expect(section.innerHTML).not.toMatch(/undefined/);
  });
});

// ===========================================================================
// AC2: gated views make zero API calls — neither on switching to the tab,
// nor on the 5s poll tick while a gated tab is current.
// ===========================================================================
describe('AC2: zero API calls on gated tabs', function () {
  ['day', 'month', 'year'].forEach(function (view) {
    test('switching to ' + view + ' calls neither fetchP1Series nor fetchP1Realtime', function () {
      P1Card.init();
      global.ApiClient.fetchP1Series.mockClear();
      global.ApiClient.fetchP1Realtime.mockClear();

      P1Card.switchView(view);

      expect(global.ApiClient.fetchP1Series).not.toHaveBeenCalled();
      expect(global.ApiClient.fetchP1Realtime).not.toHaveBeenCalled();
    });
  });

  test('the 5s poll tick makes no API call while a gated tab (day) is current', function () {
    P1Card.init();
    P1Card.switchView('day');
    global.ApiClient.fetchP1Series.mockClear();
    global.ApiClient.fetchP1Realtime.mockClear();

    jest.advanceTimersByTime(5000);

    expect(global.ApiClient.fetchP1Series).not.toHaveBeenCalled();
    expect(global.ApiClient.fetchP1Realtime).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AC3: computeDeltas and the invented-field reads are gone.
//
// The file-level half (grep for zero reads of energy_import_kwh,
// energy_export_kwh, avg_power_w, max_power_w anywhere in src/p1-card.js) is
// Verifier work (static analysis over source text), not a unit test.
//
// computeDeltas is NOT part of P1Card's public API today — the module
// returns only { init, onRealtimeData, switchView, fetchAndUpdate }. So
// `expect(P1Card.computeDeltas).toBeUndefined()` is true BOTH before and
// after this story ships and cannot serve as RED evidence; it is omitted in
// favor of the observable-behavior test below, per the Story Contract's
// guidance for this exact situation.
// ===========================================================================
describe('AC3: no bar values derived from the invented fields', function () {
  test('switching to a gated tab with a series payload containing all four invented fields renders none of their derived values', async function () {
    global.ApiClient.fetchP1Series.mockImplementation(function () {
      return Promise.resolve({
        device_id: 'p1-meter-01',
        frame: 'day',
        series: [
          {
            bucket: '2026-07-30T08:00:00',
            energy_import_kwh: 1000,
            energy_export_kwh: 500,
            avg_power_w: 800,
            max_power_w: 1200,
          },
          {
            bucket: '2026-07-30T09:00:00',
            energy_import_kwh: 1500,
            energy_export_kwh: 620,
            avg_power_w: 900,
            max_power_w: 1300,
          },
        ],
      });
    });

    P1Card.init();
    P1Card.switchView('day');
    await Promise.resolve();
    await Promise.resolve();

    // If computeDeltas ran on this payload it would produce an import delta
    // of (1500-1000)/1000 = 0.50 kWh and an export delta of
    // (620-500)/1000 = 0.12 kWh — both plausible, non-NaN numbers. Neither
    // derived value may appear anywhere in the gated card.
    var section = document.getElementById('section-p1-card');
    expect(section.innerHTML).not.toContain('0.50');
    expect(section.innerHTML).not.toContain('0.12');
  });
});

// ===========================================================================
// AC4: robustness — a gated tab still renders the unavailable state (it is
// static) and never throws, even when Config.getConfig() returns null.
// ===========================================================================
describe('AC4: robustness against a null config', function () {
  test('switching to a gated tab renders the unavailable state without throwing when Config.getConfig() returns null', function () {
    P1Card.init();
    global.Config.getConfig.mockReturnValue(null);

    expect(function () {
      P1Card.switchView('month');
    }).not.toThrow();

    var el = document.querySelector('#section-p1-card .p1-card__unavailable');
    expect(el).not.toBeNull();
  });
});

// ===========================================================================
// AC5: Live tab regression pins — unchanged by this story.
// ===========================================================================
describe('AC5: Live view regression pins', function () {
  test('updateLiveView (via onRealtimeData) appends to the ring buffer and trims at 60 samples', function () {
    P1Card.init();
    var liveChart = global.Chart.mock.instances[global.Chart.mock.instances.length - 1];

    for (var i = 0; i < 65; i++) {
      P1Card.onRealtimeData({ power_w: 100 + i });
    }

    expect(liveChart.data.labels.length).toBe(60);
    expect(liveChart.data.datasets[0].data.length).toBe(60);
    // The oldest 5 samples (power_w 100..104) were trimmed; the buffer now
    // holds the most recent 60 (105..164).
    expect(liveChart.data.datasets[0].data[0]).toBe(105);
    expect(liveChart.data.datasets[0].data[59]).toBe(164);
  });

  test('header shows formatted current power from realtime power_w', function () {
    P1Card.init();
    P1Card.onRealtimeData({ power_w: 1500 });

    expect(document.getElementById('p1-card-import').textContent).toBe('1.5 kW');
    expect(document.getElementById('p1-card-export').textContent).toBe('');
  });

  test('switching Live -> Day -> Live constructs the chart exactly once for the return-to-Live entry', function () {
    P1Card.init();
    P1Card.switchView('day');

    var callsBeforeReturn = global.Chart.mock.calls.length;
    P1Card.switchView('live');

    expect(global.Chart.mock.calls.length).toBe(callsBeforeReturn + 1);
  });
});

// ===========================================================================
// AC6: gated header shows — for both import and export values.
// ===========================================================================
describe('AC6: gated header shows em dash for both values', function () {
  ['day', 'month', 'year'].forEach(function (view) {
    test('gated header (' + view + ') shows — for both import and export values', function () {
      P1Card.init();
      P1Card.switchView(view);

      expect(document.getElementById('p1-card-import').textContent).toBe('—');
      expect(document.getElementById('p1-card-export').textContent).toBe('—');
    });
  });
});

// ===========================================================================
// AC7: chart lifecycle — destroy on entering a gated view, no construction
// while gated, exactly one new construction on returning to Live.
// ===========================================================================
describe('AC7: chart lifecycle across gated transitions', function () {
  test('entering a gated view calls destroy on the existing chart', function () {
    P1Card.init();
    var liveChart = global.Chart.mock.instances[global.Chart.mock.instances.length - 1];

    P1Card.switchView('day');

    expect(liveChart.destroy).toHaveBeenCalledTimes(1);
  });

  test('no Chart construction happens while on a gated view (day)', function () {
    P1Card.init();
    var callsBeforeSwitch = global.Chart.mock.calls.length;

    P1Card.switchView('day');

    expect(global.Chart.mock.calls.length).toBe(callsBeforeSwitch);
  });

  // Overlaps in spirit with the AC5 Live->Day->Live pin above (both count
  // exactly one construction on the return to Live); kept as a separate
  // test because it is this AC's own explicit invariant, isolated from the
  // ring-buffer/header assertions AC5 also makes in the same journey.
  test('returning to Live from a gated view constructs exactly one new chart', function () {
    P1Card.init();
    P1Card.switchView('day');
    var callsBeforeReturn = global.Chart.mock.calls.length;

    P1Card.switchView('live');

    expect(global.Chart.mock.calls.length).toBe(callsBeforeReturn + 1);
  });
});

// ===========================================================================
// AC8 — the gate must carry a code comment naming RW-C01/R1 as the unlock
// condition. This is a Verifier grep over src/p1-card.js, not a unit test:
// no runtime behavior distinguishes a commented gate from an uncommented
// one. Not covered here; the Verifier checks it by hand.
// ===========================================================================

// ===========================================================================
// AC9 — the header's live-value indicator (#p1-card-live-value: the pulsing
// dot + wattage next to the tabs) must not keep posing as live once a gated
// view is entered. The original Story Contract under-specified this element;
// without intervention it froze on the last reading next to a still-pulsing
// dot while gated — a stale number presented as live, exactly the HC-003
// failure mode this story exists to remove. The Builder found it and reset
// it to the idle markup on gating; Architect ruling: correct, ratified.
// Pinned here so a future refactor cannot silently flip it back.
//
// This behavior is already implemented — GREEN today, a regression pin, not
// RED evidence.
// ===========================================================================
describe('AC9: live-value indicator resets to idle on gating', function () {
  test('switching to a gated tab after a live reading resets #p1-card-live-value to idle ("--W", non-active dot)', function () {
    P1Card.init();
    P1Card.onRealtimeData({ power_w: 1500 });

    var liveEl = document.getElementById('p1-card-live-value');
    // Sanity: a live reading really did render first (pulsing dot present) —
    // otherwise the assertions below would pass vacuously.
    expect(liveEl.querySelector('.p1-card__live-dot--active')).not.toBeNull();

    P1Card.switchView('day');

    expect(liveEl.textContent).toContain('--W');
    expect(liveEl.querySelector('.p1-card__live-dot--active')).toBeNull();
  });
});

// ===========================================================================
// AC10 — the Live ring buffer's export leg, sign-convention pin.
//
// updateLiveView computes both legs from a single power_w reading:
//   import_w = Math.max(0, power_w)
//   export_w = Math.max(0, -power_w)
// and plots them as datasets[0].data = import_w, datasets[1].data = -export_w
// (export negated so it renders below zero — the two legs must be
// distinguishable by direction, not just magnitude; this is D1's failure
// class on the card's one remaining live data path).
//
// The Verifier's mutation pass found the export leg covered only by
// coincidence: every existing fixture in this file uses a positive power_w,
// so a mutant dropping the negation on export_w (export_w = Math.max(0,
// power_w), import untouched) survived — nothing here ever exercised a
// negative reading. This is a sign-convention pin, not decoration: it is
// already GREEN today (the source is already correct), added specifically
// to kill that mutant and lock the export leg in for future refactors.
// ===========================================================================
describe('AC10: Live export leg — negative power_w sign convention', function () {
  test('a negative realtime reading (power_w: -1800) routes to the export leg, not import', function () {
    P1Card.init();
    var liveChart = global.Chart.mock.instances[global.Chart.mock.instances.length - 1];

    P1Card.onRealtimeData({ power_w: -1800 });

    var importSeries = liveChart.data.datasets[0].data;
    var exportSeries = liveChart.data.datasets[1].data;

    // Buffer entry: import_w = Math.max(0, -1800) = 0.
    expect(importSeries[importSeries.length - 1]).toBe(0);
    // Buffer entry: export_w = Math.max(0, -(-1800)) = 1800, plotted as
    // -export_w = -1800 — export appears below zero, direction
    // distinguishable from import.
    expect(exportSeries[exportSeries.length - 1]).toBe(-1800);
  });

  test('a mixed sequence (positive then negative) records both the import and export legs in one buffer', function () {
    P1Card.init();
    var liveChart = global.Chart.mock.instances[global.Chart.mock.instances.length - 1];

    P1Card.onRealtimeData({ power_w: 1200 }); // importing
    P1Card.onRealtimeData({ power_w: -1800 }); // exporting

    var importSeries = liveChart.data.datasets[0].data;
    var exportSeries = liveChart.data.datasets[1].data;

    expect(importSeries).toHaveLength(2);
    expect(exportSeries).toHaveLength(2);

    // First sample: importing 1200 W, export leg at zero (toBeCloseTo avoids
    // the -0/+0 Object.is distinction toBe would otherwise enforce here —
    // -p.export_w on a zero export_w evaluates to -0, which is not the
    // property under test).
    expect(importSeries[0]).toBe(1200);
    expect(exportSeries[0]).toBeCloseTo(0);

    // Second sample: exporting 1800 W — import leg at zero, export leg
    // plotted below zero. Both legs now present in the same buffer.
    expect(importSeries[1]).toBe(0);
    expect(exportSeries[1]).toBe(-1800);
  });
});
