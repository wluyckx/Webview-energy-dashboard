/**
 * Power Flow Diagram module for the Energy Dashboard.
 * Renders an inline SVG with four energy nodes (Solar, Battery, Home, Grid)
 * in a diamond/cross arrangement with connection lines between them.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial SVG layout with 4 nodes and 5 connection paths (STORY-005)
 *
 * TODO:
 * - Add animated flow lines (STORY-006)
 * - Bind real-time data (STORY-007)
 */

// eslint-disable-next-line no-unused-vars
const PowerFlow = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /** Node positions within viewBox 0 0 500 380 */
  const NODES = {
    solar: {
      cx: 250,
      cy: 70,
      label: 'Solar',
      color: 'var(--solar)',
      glowColor: 'var(--solar-glow)',
    },
    battery: {
      cx: 70,
      cy: 250,
      label: 'Battery',
      color: 'var(--battery-charge)',
      glowColor: 'rgba(108,92,231,0.2)',
    },
    home: {
      cx: 250,
      cy: 250,
      label: 'Home',
      color: 'var(--home)',
      glowColor: 'rgba(223,230,233,0.15)',
    },
    grid: {
      cx: 430,
      cy: 250,
      label: 'Grid',
      color: 'var(--grid-import)',
      glowColor: 'rgba(225,112,85,0.2)',
    },
  };

  /** Connection line definitions (5 paths) */
  const CONNECTIONS = [
    { id: 'solar-home', from: 'solar', to: 'home', label: 'Solar to Home' },
    { id: 'solar-battery', from: 'solar', to: 'battery', label: 'Solar to Battery' },
    { id: 'solar-grid', from: 'solar', to: 'grid', label: 'Solar to Grid' },
    { id: 'grid-home', from: 'grid', to: 'home', label: 'Grid to Home' },
    { id: 'battery-home', from: 'battery', to: 'home', label: 'Battery to Home' },
  ];

  /** Node icon size */
  const NODE_SIZE = 64;

  /**
   * Create an SVG element with the given tag name and attributes.
   * @param {string} tag - SVG element tag name.
   * @param {Object} attrs - Attribute key-value pairs.
   * @returns {SVGElement} The created SVG element.
   */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        el.setAttribute(key, attrs[key]);
      });
    }
    return el;
  }

  /**
   * Create the solar icon (sun with rays).
   * @returns {SVGElement} A group containing the solar icon.
   */
  function createSolarIcon() {
    var g = svgEl('g', { 'aria-hidden': 'true' });
    // Center circle
    g.appendChild(
      svgEl('circle', { cx: '0', cy: '0', r: '10', fill: 'var(--solar)', opacity: '0.9' })
    );
    // 8 rays
    for (var i = 0; i < 8; i++) {
      var angle = (i * 45 * Math.PI) / 180;
      var x1 = Math.cos(angle) * 14;
      var y1 = Math.sin(angle) * 14;
      var x2 = Math.cos(angle) * 20;
      var y2 = Math.sin(angle) * 20;
      g.appendChild(
        svgEl('line', {
          x1: x1.toFixed(1),
          y1: y1.toFixed(1),
          x2: x2.toFixed(1),
          y2: y2.toFixed(1),
          stroke: 'var(--solar)',
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
        })
      );
    }
    return g;
  }

  /**
   * Create the battery icon (rectangle with level indicator).
   * @returns {SVGElement} A group containing the battery icon.
   */
  function createBatteryIcon() {
    var g = svgEl('g', { 'aria-hidden': 'true' });
    // Battery body
    g.appendChild(
      svgEl('rect', {
        x: '-14',
        y: '-10',
        width: '24',
        height: '20',
        rx: '3',
        fill: 'none',
        stroke: 'var(--battery-charge)',
        'stroke-width': '2',
      })
    );
    // Battery terminal
    g.appendChild(
      svgEl('rect', {
        x: '10',
        y: '-4',
        width: '4',
        height: '8',
        rx: '1',
        fill: 'var(--battery-charge)',
        opacity: '0.7',
      })
    );
    // Battery level (placeholder ~60%)
    g.appendChild(
      svgEl('rect', {
        x: '-11',
        y: '-7',
        width: '12',
        height: '14',
        rx: '1',
        fill: 'var(--battery-charge)',
        opacity: '0.5',
      })
    );
    return g;
  }

  /**
   * Create the home icon (house outline).
   * @returns {SVGElement} A group containing the home icon.
   */
  function createHomeIcon() {
    var g = svgEl('g', { 'aria-hidden': 'true' });
    // Roof (triangle)
    g.appendChild(
      svgEl('path', {
        d: 'M0-16 L18 4 L-18 4 Z',
        fill: 'none',
        stroke: 'var(--home)',
        'stroke-width': '2',
        'stroke-linejoin': 'round',
      })
    );
    // Walls
    g.appendChild(
      svgEl('rect', {
        x: '-13',
        y: '4',
        width: '26',
        height: '16',
        fill: 'none',
        stroke: 'var(--home)',
        'stroke-width': '2',
      })
    );
    // Door
    g.appendChild(
      svgEl('rect', {
        x: '-4',
        y: '10',
        width: '8',
        height: '10',
        fill: 'var(--home)',
        opacity: '0.4',
      })
    );
    return g;
  }

  /**
   * Create the grid icon (lightning bolt).
   * @returns {SVGElement} A group containing the grid icon.
   */
  function createGridIcon() {
    var g = svgEl('g', { 'aria-hidden': 'true' });
    g.appendChild(
      svgEl('path', {
        d: 'M4-18 L-6 2 L2 2 L-4 18 L14-4 L6-4 Z',
        fill: 'var(--grid-import)',
        opacity: '0.85',
        stroke: 'var(--grid-import)',
        'stroke-width': '1',
        'stroke-linejoin': 'round',
      })
    );
    return g;
  }

  /**
   * Map of node keys to icon creation functions.
   */
  const iconCreators = {
    solar: createSolarIcon,
    battery: createBatteryIcon,
    home: createHomeIcon,
    grid: createGridIcon,
  };

  /**
   * Create a single node group with background, icon, label, and power value.
   * @param {string} key - Node identifier (solar, battery, home, grid).
   * @param {Object} config - Node configuration from NODES.
   * @returns {SVGElement} A group element for the node.
   */
  function createNode(key, config) {
    var half = NODE_SIZE / 2;
    var g = svgEl('g', {
      'data-node': key,
      transform: 'translate(' + config.cx + ',' + config.cy + ')',
      role: 'img',
      'aria-label': config.label + ' energy node',
    });

    // Title for accessibility
    var title = svgEl('title');
    title.textContent = config.label + ' energy node';
    g.appendChild(title);

    // Glow filter (subtle radial glow)
    // We use a circle with the glow color behind the node
    g.appendChild(
      svgEl('circle', {
        cx: '0',
        cy: '0',
        r: String(half + 8),
        fill: config.glowColor,
        'data-glow': key,
      })
    );

    // Background rounded square
    g.appendChild(
      svgEl('rect', {
        x: String(-half),
        y: String(-half),
        width: String(NODE_SIZE),
        height: String(NODE_SIZE),
        rx: '14',
        fill: 'var(--bg-elevated)',
        stroke: 'var(--border-subtle)',
        'stroke-width': '1',
      })
    );

    // Icon
    var icon = iconCreators[key]();
    icon.setAttribute('transform', 'translate(0,-4)');
    g.appendChild(icon);

    // Label text
    g.appendChild(
      svgEl('text', {
        x: '0',
        y: String(half + 18),
        'text-anchor': 'middle',
        fill: 'var(--text-secondary)',
        'font-family': 'var(--font-body)',
        'font-size': '13',
        'font-weight': '500',
        'data-label': key,
      })
    ).textContent = config.label;

    // Power value text
    g.appendChild(
      svgEl('text', {
        x: '0',
        y: String(half + 34),
        'text-anchor': 'middle',
        fill: 'var(--text-primary)',
        'font-family': 'var(--font-data)',
        'font-size': '20',
        'font-weight': '600',
        'data-power': key,
      })
    ).textContent = '-- W';

    // Battery SoC percentage (only for battery node)
    if (key === 'battery') {
      g.appendChild(
        svgEl('text', {
          x: '0',
          y: String(half + 50),
          'text-anchor': 'middle',
          fill: 'var(--text-secondary)',
          'font-family': 'var(--font-data)',
          'font-size': '14',
          'font-weight': '600',
          'data-soc': 'battery',
        })
      ).textContent = '--%';
    }

    return g;
  }

  /**
   * Create the connection lines between nodes.
   * @returns {SVGElement} A group containing all connection path elements.
   */
  function createConnections() {
    var g = svgEl('g', { 'data-connections': 'true' });

    CONNECTIONS.forEach(function (conn) {
      var from = NODES[conn.from];
      var to = NODES[conn.to];
      var half = NODE_SIZE / 2;

      // Calculate edge-to-edge connection points
      var dx = to.cx - from.cx;
      var dy = to.cy - from.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nx = dx / dist;
      var ny = dy / dist;

      // Start from edge of source node, end at edge of target node
      var x1 = from.cx + nx * (half + 4);
      var y1 = from.cy + ny * (half + 4);
      var x2 = to.cx - nx * (half + 4);
      var y2 = to.cy - ny * (half + 4);

      var line = svgEl('line', {
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1),
        stroke: 'var(--text-tertiary)',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-dasharray': '6 4',
        opacity: '0.3',
        'data-connection': conn.id,
        role: 'img',
        'aria-label': conn.label,
      });

      // Title for accessibility
      var title = svgEl('title');
      title.textContent = conn.label;
      line.appendChild(title);

      g.appendChild(line);
    });

    return g;
  }

  /**
   * Create the complete power flow SVG element.
   * @returns {SVGElement} The SVG element with all nodes and connections.
   */
  function createPowerFlowSVG() {
    var svg = svgEl('svg', {
      viewBox: '0 0 500 380',
      'aria-label':
        'Power flow diagram showing energy distribution between solar, battery, home, and grid',
      role: 'img',
      class: 'power-flow-svg',
    });

    // Accessible title and description
    var titleEl = svgEl('title');
    titleEl.textContent = 'Power Flow Diagram';
    svg.appendChild(titleEl);

    var desc = svgEl('desc');
    desc.textContent =
      'Diagram showing energy flow between Solar (top), Battery (left), ' +
      'Home (center), and Grid (right) nodes.';
    svg.appendChild(desc);

    // Draw connections first (behind nodes)
    svg.appendChild(createConnections());

    // Draw nodes
    var nodeKeys = Object.keys(NODES);
    for (var i = 0; i < nodeKeys.length; i++) {
      svg.appendChild(createNode(nodeKeys[i], NODES[nodeKeys[i]]));
    }

    return svg;
  }

  /**
   * Initialize the power flow diagram in the given container.
   * @param {HTMLElement} container - The DOM element to append the SVG to.
   */
  function init(container) {
    if (!container) {
      console.warn('PowerFlow.init: No container element provided.');
      return;
    }
    var svg = createPowerFlowSVG();
    container.appendChild(svg);
  }

  return { createPowerFlowSVG: createPowerFlowSVG, init: init };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PowerFlow;
}
