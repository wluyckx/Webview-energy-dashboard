/**
 * Tests for Power Flow Diagram module (STORY-005, STORY-006, STORY-007).
 *
 * Validates SVG structure: 4 nodes, 5 connection lines,
 * power value text elements, and battery SoC placeholder.
 * Also validates flow animation helper functions.
 * Also validates computeFlows data mapping and formatPower formatting.
 *
 * CHANGELOG:
 * - 2026-07-30: RW-M02 AC10 — add failing tests pinning solarToGrid === 0
 *   (never NaN) for non-finite p1.power_w (absent/undefined/NaN/wrong-type/
 *   null), per HC-003 (never render NaN as data); closes the gap the
 *   Builder's self-review found in Math.max(0, -p1Data.power_w) (Spec Author)
 * - 2026-07-30: RW-M02 — add failing tests pinning solarToGrid =
 *   max(0, -p1.power_w) (D1 fix); annotate the two pre-existing tests that
 *   interact with the change as non-discriminating / dead-field-independence
 *   (Spec Author; production code and this test file's ownership are
 *   separate per the Story Contract)
 * - 2026-02-15: computeFlows and formatPower tests (STORY-007)
 * - 2026-02-15: Flow animation helper tests (STORY-006)
 * - 2026-02-15: Initial layout tests (STORY-005)
 */

const PowerFlow = require('../src/power-flow.js');

describe('PowerFlow', () => {
  describe('createPowerFlowSVG()', () => {
    let svg;

    beforeEach(() => {
      svg = PowerFlow.createPowerFlowSVG();
    });

    test('returns an SVG element', () => {
      expect(svg).toBeDefined();
      expect(svg.nodeName.toLowerCase()).toBe('svg');
    });

    test('SVG has a viewBox attribute', () => {
      expect(svg.getAttribute('viewBox')).toBeTruthy();
    });

    test('SVG has an aria-label for accessibility', () => {
      expect(svg.getAttribute('aria-label')).toBeTruthy();
    });

    test('SVG has role="img" for accessibility', () => {
      expect(svg.getAttribute('role')).toBe('img');
    });

    test('SVG contains a title element', () => {
      var titleEl = svg.querySelector('title');
      expect(titleEl).not.toBeNull();
      expect(titleEl.textContent).toBe('Power Flow Diagram');
    });

    test('SVG contains exactly 4 node groups', () => {
      var nodeGroups = svg.querySelectorAll('[data-node]');
      expect(nodeGroups.length).toBe(4);
    });

    test('nodes include Solar, Battery, Home, and Grid', () => {
      var expectedNodes = ['solar', 'battery', 'home', 'grid'];
      expectedNodes.forEach((nodeKey) => {
        var node = svg.querySelector('[data-node="' + nodeKey + '"]');
        expect(node).not.toBeNull();
      });
    });

    test('SVG contains 5 connection line elements', () => {
      var connections = svg.querySelectorAll('[data-connection]');
      expect(connections.length).toBe(5);
    });

    test('connection lines include all required energy paths', () => {
      var expectedConnections = [
        'solar-home',
        'solar-battery',
        'solar-grid',
        'grid-home',
        'battery-home',
      ];
      expectedConnections.forEach((connId) => {
        var conn = svg.querySelector('[data-connection="' + connId + '"]');
        expect(conn).not.toBeNull();
      });
    });

    test('each node has a text element for power value', () => {
      var expectedNodes = ['solar', 'battery', 'home', 'grid'];
      expectedNodes.forEach((nodeKey) => {
        var powerText = svg.querySelector('[data-power="' + nodeKey + '"]');
        expect(powerText).not.toBeNull();
        expect(powerText.textContent).toBe('-- W');
      });
    });

    test('battery node has SoC text element', () => {
      var socText = svg.querySelector('[data-soc="battery"]');
      expect(socText).not.toBeNull();
      expect(socText.textContent).toBe('--%');
    });

    test('non-battery nodes do not have SoC text element', () => {
      var nonBatteryNodes = ['solar', 'home', 'grid'];
      nonBatteryNodes.forEach((nodeKey) => {
        var socText = svg.querySelector('[data-soc="' + nodeKey + '"]');
        expect(socText).toBeNull();
      });
    });

    test('each node group has role="img" and aria-label', () => {
      var nodeGroups = svg.querySelectorAll('[data-node]');
      nodeGroups.forEach((node) => {
        expect(node.getAttribute('role')).toBe('img');
        expect(node.getAttribute('aria-label')).toBeTruthy();
      });
    });

    test('each connection line has an aria-label', () => {
      var connections = svg.querySelectorAll('[data-connection]');
      connections.forEach((conn) => {
        expect(conn.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });

  describe('init()', () => {
    test('appends SVG to the provided container', () => {
      var container = document.createElement('div');
      PowerFlow.init(container);
      var svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg.nodeName.toLowerCase()).toBe('svg');
    });

    test('does not throw when container is null', () => {
      expect(() => {
        PowerFlow.init(null);
      }).not.toThrow();
    });

    test('does not throw when container is undefined', () => {
      expect(() => {
        PowerFlow.init(undefined);
      }).not.toThrow();
    });
  });

  // ---- STORY-006: Flow animation helpers ----

  describe('Flow animation helpers', () => {
    describe('getStrokeWidth', () => {
      test('returns 0 for zero power', () => {
        expect(PowerFlow.getStrokeWidth(0, 5000)).toBe(0);
      });

      test('returns minimum 1 for small non-zero power', () => {
        expect(PowerFlow.getStrokeWidth(1, 5000)).toBeGreaterThanOrEqual(1);
      });

      test('returns max 6 for power >= maxPower', () => {
        expect(PowerFlow.getStrokeWidth(5000, 5000)).toBe(6);
        expect(PowerFlow.getStrokeWidth(7000, 5000)).toBe(6);
      });

      test('scales proportionally between 1 and 6', () => {
        var half = PowerFlow.getStrokeWidth(2500, 5000);
        // At 50% power, stroke = 1 + 0.5 * 5 = 3.5
        expect(half).toBeCloseTo(3.5, 1);
        // Quarter power: 1 + 0.25 * 5 = 2.25
        var quarter = PowerFlow.getStrokeWidth(1250, 5000);
        expect(quarter).toBeCloseTo(2.25, 1);
        // Verify ordering
        expect(quarter).toBeLessThan(half);
        expect(half).toBeLessThan(6);
      });
    });

    describe('getFlowColor', () => {
      test('returns correct CSS variable for solar', () => {
        expect(PowerFlow.getFlowColor('solar')).toBe('var(--solar)');
      });

      test('returns correct CSS variable for grid-import', () => {
        expect(PowerFlow.getFlowColor('grid-import')).toBe('var(--grid-import)');
      });

      test('returns correct CSS variable for grid-export', () => {
        expect(PowerFlow.getFlowColor('grid-export')).toBe('var(--grid-export)');
      });

      test('returns correct CSS variable for battery-charge', () => {
        expect(PowerFlow.getFlowColor('battery-charge')).toBe('var(--battery-charge)');
      });

      test('returns correct CSS variable for battery-discharge', () => {
        expect(PowerFlow.getFlowColor('battery-discharge')).toBe('var(--battery-discharge)');
      });

      test('returns default for unknown type', () => {
        expect(PowerFlow.getFlowColor('unknown')).toBe('var(--text-tertiary)');
        expect(PowerFlow.getFlowColor('')).toBe('var(--text-tertiary)');
      });
    });

    describe('isFlowActive', () => {
      test('returns false for zero power', () => {
        expect(PowerFlow.isFlowActive(0)).toBe(false);
      });

      test('returns true for positive power', () => {
        expect(PowerFlow.isFlowActive(100)).toBe(true);
        expect(PowerFlow.isFlowActive(1)).toBe(true);
      });

      test('returns true for negative power', () => {
        expect(PowerFlow.isFlowActive(-100)).toBe(true);
        expect(PowerFlow.isFlowActive(-1)).toBe(true);
      });
    });
  });

  describe('updateFlow', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      PowerFlow.init(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('sets inactive state when power is 0', () => {
      PowerFlow.updateFlow('solar-home', { power: 0, flowType: 'solar', maxPower: 5000 });
      var line = container.querySelector('[data-connection="solar-home"]');
      expect(line.getAttribute('opacity')).toBe('0.1');
      expect(line.getAttribute('stroke')).toBe('var(--text-tertiary)');
      expect(line.getAttribute('stroke-width')).toBe('1');
      expect(line.getAttribute('class')).toBe('flow-line--inactive');
    });

    test('sets active state with correct color when power > 0', () => {
      PowerFlow.updateFlow('solar-home', { power: 2500, flowType: 'solar', maxPower: 5000 });
      var line = container.querySelector('[data-connection="solar-home"]');
      expect(line.getAttribute('stroke')).toBe('var(--solar)');
      expect(line.getAttribute('class')).toBe('flow-line--active');
      expect(parseFloat(line.getAttribute('opacity'))).toBeGreaterThanOrEqual(0.8);
      expect(parseFloat(line.getAttribute('stroke-width'))).toBeGreaterThan(1);
    });

    test('sets reverse animation class when power < 0', () => {
      PowerFlow.updateFlow('grid-home', { power: -1000, flowType: 'grid-export', maxPower: 5000 });
      var line = container.querySelector('[data-connection="grid-home"]');
      expect(line.getAttribute('class')).toBe('flow-line--reverse');
      expect(line.getAttribute('stroke')).toBe('var(--grid-export)');
    });

    test('scales stroke-width proportionally', () => {
      PowerFlow.updateFlow('solar-home', { power: 5000, flowType: 'solar', maxPower: 5000 });
      var line = container.querySelector('[data-connection="solar-home"]');
      expect(parseFloat(line.getAttribute('stroke-width'))).toBe(6);
    });

    test('does not throw when connection does not exist', () => {
      expect(() => {
        PowerFlow.updateFlow('nonexistent', { power: 1000, flowType: 'solar', maxPower: 5000 });
      }).not.toThrow();
    });

    test('opacity ranges from 0.8 to 1.0 for active flows', () => {
      // Small power -> opacity near 0.8
      PowerFlow.updateFlow('solar-home', { power: 1, flowType: 'solar', maxPower: 5000 });
      var line = container.querySelector('[data-connection="solar-home"]');
      var lowOpacity = parseFloat(line.getAttribute('opacity'));
      expect(lowOpacity).toBeGreaterThanOrEqual(0.8);
      expect(lowOpacity).toBeLessThanOrEqual(1.0);

      // Max power -> opacity 1.0
      PowerFlow.updateFlow('solar-home', { power: 5000, flowType: 'solar', maxPower: 5000 });
      var highOpacity = parseFloat(line.getAttribute('opacity'));
      expect(highOpacity).toBeCloseTo(1.0, 1);
    });
  });

  // ---- STORY-007: computeFlows data mapping ----

  describe('computeFlows', () => {
    test('solar-to-home equals min(pv_power_w, load_power_w)', () => {
      var p1 = { power_w: 0, import_power_w: 0 };
      var sungrow = {
        pv_power_w: 3000,
        load_power_w: 2000,
        battery_power_w: 0,
        battery_soc_pct: 50,
        export_power_w: 0,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.solarToHome).toBe(2000);

      // When load is greater than solar
      var sungrow2 = {
        pv_power_w: 1500,
        load_power_w: 2000,
        battery_power_w: 0,
        battery_soc_pct: 50,
        export_power_w: 0,
      };
      var flows2 = PowerFlow.computeFlows(p1, sungrow2);
      expect(flows2.solarToHome).toBe(1500);
    });

    test('battery discharging (negative battery_power_w) maps to batteryToHome', () => {
      var p1 = { power_w: 0, import_power_w: 0 };
      var sungrow = {
        pv_power_w: 0,
        load_power_w: 1200,
        battery_power_w: -1200,
        battery_soc_pct: 80,
        export_power_w: 0,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.batteryToHome).toBe(1200);
      expect(flows.solarToBattery).toBe(0);
    });

    test('battery charging (positive battery_power_w) maps to solarToBattery', () => {
      var p1 = { power_w: 0, import_power_w: 0 };
      var sungrow = {
        pv_power_w: 4000,
        load_power_w: 2000,
        battery_power_w: 1500,
        battery_soc_pct: 60,
        export_power_w: 0,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      // solarToBattery = pv_power_w - solarToHome - solarToGrid = 4000 - 2000 - 0 = 2000
      expect(flows.solarToBattery).toBe(2000);
      expect(flows.batteryToHome).toBe(0);
    });

    test('grid importing (positive P1 import_power_w) maps to gridToHome', () => {
      var p1 = { power_w: 500, import_power_w: 500 };
      var sungrow = {
        pv_power_w: 0,
        load_power_w: 500,
        battery_power_w: 0,
        battery_soc_pct: 50,
        export_power_w: 0,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.gridToHome).toBe(500);
    });

    test('zero solar production results in no solar flows', () => {
      var p1 = { power_w: 1000, import_power_w: 1000 };
      var sungrow = {
        pv_power_w: 0,
        load_power_w: 1000,
        battery_power_w: 0,
        battery_soc_pct: 50,
        export_power_w: 0,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.solarToHome).toBe(0);
      expect(flows.solarToBattery).toBe(0);
      expect(flows.solarToGrid).toBe(0);
    });

    test('export when solar producing maps to solarToGrid', () => {
      // NON-DISCRIMINATING (RW-M02): export_power_w (750) here equals the
      // magnitude of -power_w (750), so this fixture passes under both the
      // old sungrow.export_power_w-gated formula and the new
      // max(0, -p1.power_w) formula. Retained for regression coverage; does
      // NOT count as RW-M02 RED evidence — see the 'RW-M02:' describe block
      // below for the tests that actually discriminate.
      var p1 = { power_w: -750, import_power_w: 0 };
      var sungrow = {
        pv_power_w: 3450,
        load_power_w: 2700,
        battery_power_w: 0,
        battery_soc_pct: 85,
        export_power_w: 750,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.solarToGrid).toBe(750);
    });

    test('no export when solar not producing (solarToGrid = 0)', () => {
      // RW-M02 AC3 (dead-field independence): power_w=0 ⇒ solarToGrid=0
      // under the new max(0, -power_w) formula regardless of export_power_w
      // (=100 here, contradicting a genuine zero-export state). This test
      // used to pin the old pv_power_w>0 gate's behaviour; it now survives
      // as proof the dead field cannot influence the result in this branch.
      var p1 = { power_w: 0, import_power_w: 0 };
      var sungrow = {
        pv_power_w: 0,
        load_power_w: 0,
        battery_power_w: 0,
        battery_soc_pct: 50,
        export_power_w: 100,
      };
      var flows = PowerFlow.computeFlows(p1, sungrow);
      expect(flows.solarToGrid).toBe(0);
    });

    // ------------------------------------------------------------------
    // RW-M02 (D1 fix): solarToGrid must derive from P1's authoritative,
    // signed power_w — never from Sungrow export_power_w, which is always
    // 0 on the real WiNet-S firmware (Architecture.md, Sign Convention
    // Reference). Fixtures below set export_power_w: 0 where the AC doesn't
    // otherwise specify it, matching that real firmware behaviour — this is
    // the physically accurate fixture, not an arbitrary choice.
    //
    // Target formula (Architect ruling): solarToGrid = max(0, -p1.power_w)
    // ------------------------------------------------------------------
    describe('RW-M02: solarToGrid = max(0, -power_w)', () => {
      test('AC1: D1 pin — p1.power_w=-2000, sungrow.export_power_w=0 ⇒ solarToGrid === 2000', () => {
        var p1 = { power_w: -2000, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 3000,
          load_power_w: 800,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(2000);
      });

      test('AC2a: power_w=-1 ⇒ solarToGrid === 1', () => {
        var p1 = { power_w: -1, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(1);
      });

      test('AC2b: power_w=0 ⇒ solarToGrid === 0', () => {
        // GREEN-today: old and new formulas both yield 0 (export_power_w: 0).
        var p1 = { power_w: 0, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC2c: power_w=+800 ⇒ solarToGrid === 0', () => {
        // GREEN-today: old and new formulas both yield 0 (export_power_w: 0).
        var p1 = { power_w: 800, import_power_w: 800 };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC2d: power_w=-3200 with pv=4000, load=600, battery=+200 ⇒ solarToGrid === 3200', () => {
        var p1 = { power_w: -3200, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 4000,
          load_power_w: 600,
          battery_power_w: 200,
          battery_soc_pct: 60,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(3200);
      });

      test('AC3: dead-field independence — export_power_w in {0, 9999, absent} return deep-equal results', () => {
        var p1 = { power_w: -900, import_power_w: 0 };
        var base = {
          pv_power_w: 2500,
          load_power_w: 1000,
          battery_power_w: 0,
          battery_soc_pct: 55,
        };

        var flowsZero = PowerFlow.computeFlows(p1, Object.assign({}, base, { export_power_w: 0 }));
        var flowsHuge = PowerFlow.computeFlows(
          p1,
          Object.assign({}, base, { export_power_w: 9999 })
        );
        // export_power_w intentionally omitted here: undefined/absent.
        var flowsAbsent = PowerFlow.computeFlows(p1, Object.assign({}, base));

        expect(flowsZero.solarToGrid).toBe(900);
        expect(flowsZero).toEqual(flowsHuge);
        expect(flowsZero).toEqual(flowsAbsent);
      });

      test('AC3b: dead-field independence with battery charging — export_power_w in {0, 9999} return deep-equal results, solarToBattery===500 in both', () => {
        // Closes the charging-branch blind spot found by mutation testing
        // (RW-M02 Verification): a mutant reading export_power_w only inside
        // the battery_power_w>0 branch (folded into solarToBattery) survived
        // AC3 because every charging fixture there used export_power_w: 0.
        var p1 = { power_w: -1700, import_power_w: 0 };
        var base = {
          pv_power_w: 3000,
          load_power_w: 800,
          battery_power_w: 500,
          battery_soc_pct: 60,
        };

        var flowsZero = PowerFlow.computeFlows(p1, Object.assign({}, base, { export_power_w: 0 }));
        var flowsHuge = PowerFlow.computeFlows(
          p1,
          Object.assign({}, base, { export_power_w: 9999 })
        );

        expect(flowsZero.solarToBattery).toBe(500);
        expect(flowsHuge.solarToBattery).toBe(500);
        expect(flowsZero).toEqual(flowsHuge);
      });

      test('AC4a: exporting (power_w<0, import_power_w=0) ⇒ gridToHome===0 && solarToGrid>0', () => {
        var p1 = { power_w: -1500, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 3000,
          load_power_w: 1500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.gridToHome).toBe(0);
        expect(flows.solarToGrid).toBeGreaterThan(0);
        expect(flows.gridToHome > 0 && flows.solarToGrid > 0).toBe(false);
      });

      test('AC4b: importing (power_w>0, import_power_w===power_w) ⇒ solarToGrid===0 && gridToHome>0', () => {
        // GREEN-today: unaffected by the fix — old and new formulas both
        // yield solarToGrid=0 here (export_power_w: 0, power_w positive).
        var p1 = { power_w: 800, import_power_w: 800 };
        var sungrow = {
          pv_power_w: 0,
          load_power_w: 800,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(0);
        expect(flows.gridToHome).toBeGreaterThan(0);
        expect(flows.gridToHome > 0 && flows.solarToGrid > 0).toBe(false);
      });

      test('AC5a: battery discharging (battery_power_w<0) ⇒ batteryToHome===|battery_power_w| && solarToBattery===0', () => {
        // GREEN-today: the battery_power_w<0 branch is untouched by the fix.
        var p1 = { power_w: 200, import_power_w: 200 };
        var sungrow = {
          pv_power_w: 500,
          load_power_w: 1700,
          battery_power_w: -1000,
          battery_soc_pct: 40,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.batteryToHome).toBe(1000);
        expect(flows.solarToBattery).toBe(0);
      });

      test('AC5b: battery charging (battery_power_w>0) ⇒ solarToBattery===max(0, pv-solarToHome-solarToGrid) && batteryToHome===0', () => {
        var p1 = { power_w: -600, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 2500,
          load_power_w: 1000,
          battery_power_w: 900,
          battery_soc_pct: 65,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        // solarToHome = min(2500,1000) = 1000; solarToGrid = max(0,600) = 600;
        // solarToBattery = max(0, 2500 - 1000 - 600) = 900
        expect(flows.solarToBattery).toBe(900);
        expect(flows.batteryToHome).toBe(0);
      });

      test('AC6: conservation with real export — panel output fully attributed', () => {
        var p1 = { power_w: -1700, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 3000,
          load_power_w: 800,
          battery_power_w: 500,
          battery_soc_pct: 70,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToHome).toBe(800);
        expect(flows.solarToGrid).toBe(1700);
        expect(flows.solarToBattery).toBe(500);
        expect(flows.solarToHome + flows.solarToGrid + flows.solarToBattery).toBe(
          sungrow.pv_power_w
        );
      });

      test('AC7: unchanged surface — solarToHome, gridToHome, and passthrough fields', () => {
        // GREEN-today: none of these fields are touched by the fix.
        var p1 = { power_w: 600, import_power_w: 600 };
        var sungrow = {
          pv_power_w: 1200,
          load_power_w: 1800,
          battery_power_w: -50,
          battery_soc_pct: 33,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToHome).toBe(Math.min(sungrow.pv_power_w, sungrow.load_power_w));
        expect(flows.gridToHome).toBe(p1.import_power_w);
        expect(flows.solarTotal).toBe(sungrow.pv_power_w);
        expect(flows.homeTotal).toBe(sungrow.load_power_w);
        expect(flows.gridTotal).toBe(p1.power_w);
        expect(flows.batterySoc).toBe(sungrow.battery_soc_pct);
        expect(flows.batteryPower).toBe(sungrow.battery_power_w);
      });

      test('AC8: night-export edge — power_w=-500, pv_power_w=0 ⇒ solarToGrid === 500', () => {
        // The old pv_power_w>0 gate hides export whenever solar isn't
        // producing; the direction is real (e.g. battery discharging past
        // load overnight) and must render, not be dodged by the gate.
        var p1 = { power_w: -500, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 0,
          load_power_w: 300,
          battery_power_w: -800,
          battery_soc_pct: 20,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(500);
      });

      // ------------------------------------------------------------------
      // AC10: solarToGrid must degrade to 0 — never NaN — for any
      // non-finite p1.power_w. Math.max(0, -p1Data.power_w) alone yields
      // NaN when power_w is absent/undefined/NaN/wrong-type, which HC-003
      // forbids rendering as data. AC10e/AC10f pin cases that already pass
      // today; AC10a-d are the NaN gap.
      // ------------------------------------------------------------------
      test('AC10a: p1={} (power_w absent) ⇒ solarToGrid === 0, not NaN', () => {
        var p1 = {};
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC10b: power_w=undefined ⇒ solarToGrid === 0, not NaN', () => {
        var p1 = { power_w: undefined };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC10c: power_w=NaN ⇒ solarToGrid === 0, not NaN', () => {
        var p1 = { power_w: NaN };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC10d: power_w="a string" (wrong type) ⇒ solarToGrid === 0, not NaN', () => {
        var p1 = { power_w: 'a string' };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC10e: power_w=null ⇒ solarToGrid === 0 (pinned as intent, not accident)', () => {
        // -null coerces to -0 today, and Math.max(0, -0) === 0 — pin that
        // outcome as an intentional guard result, not a happy coincidence of
        // JS coercion that a future refactor could break unnoticed.
        var p1 = { power_w: null };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });

      test('AC10f: regression guard — a normal finite negative power_w still works: power_w=-1200 ⇒ solarToGrid === 1200', () => {
        var p1 = { power_w: -1200, import_power_w: 0 };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(flows.solarToGrid).toBe(1200);
      });

      test('AC10g: power_w="-1200" (numeric string) ⇒ solarToGrid === 0, not NaN (regression lock)', () => {
        // Numeric strings are deliberately NOT coerced: an unobserved P1
        // contract shape must never render as authoritative data (HC-006).
        var p1 = { power_w: '-1200', import_power_w: 0 };
        var sungrow = {
          pv_power_w: 1000,
          load_power_w: 500,
          battery_power_w: 0,
          battery_soc_pct: 50,
          export_power_w: 0,
        };
        var flows = PowerFlow.computeFlows(p1, sungrow);
        expect(Number.isNaN(flows.solarToGrid)).toBe(false);
        expect(flows.solarToGrid).toBe(0);
      });
    });
  });

  // ---- STORY-007: formatPower formatting ----

  describe('formatPower', () => {
    test('450 returns "450 W"', () => {
      expect(PowerFlow.formatPower(450)).toBe('450 W');
    });

    test('3450 returns "3.5 kW"', () => {
      expect(PowerFlow.formatPower(3450)).toBe('3.5 kW');
    });

    test('0 returns "0 W"', () => {
      expect(PowerFlow.formatPower(0)).toBe('0 W');
    });

    test('999 returns "999 W"', () => {
      expect(PowerFlow.formatPower(999)).toBe('999 W');
    });

    test('1000 returns "1.0 kW"', () => {
      expect(PowerFlow.formatPower(1000)).toBe('1.0 kW');
    });

    test('-1200 returns "-1.2 kW" (negative values preserved)', () => {
      expect(PowerFlow.formatPower(-1200)).toBe('-1.2 kW');
    });
  });
});
