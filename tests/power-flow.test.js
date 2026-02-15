/**
 * Tests for Power Flow Diagram module (STORY-005, STORY-006).
 *
 * Validates SVG structure: 4 nodes, 5 connection lines,
 * power value text elements, and battery SoC placeholder.
 * Also validates flow animation helper functions.
 *
 * CHANGELOG:
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
});
