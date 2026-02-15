/**
 * Tests for Power Flow Diagram module (STORY-005).
 *
 * Validates SVG structure: 4 nodes, 5 connection lines,
 * power value text elements, and battery SoC placeholder.
 *
 * CHANGELOG:
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
});
