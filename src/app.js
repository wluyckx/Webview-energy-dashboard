/**
 * Main application orchestration module for the Energy Dashboard.
 * Initializes the dashboard and coordinates component lifecycle.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial scaffolding with DOMContentLoaded listener (STORY-001)
 *
 * TODO:
 * - Wire up API polling (STORY-003)
 * - Initialize charts (STORY-009)
 */

// eslint-disable-next-line no-unused-vars
const App = (() => {
  /**
   * Initialize the dashboard.
   * Sets up all components and starts polling loops.
   */
  function init() {
    console.log('Dashboard initialized');

    // Initialize power flow diagram (STORY-005)
    var powerFlowContainer = document.getElementById('power-flow-container');
    if (powerFlowContainer && typeof PowerFlow !== 'undefined') {
      PowerFlow.init(powerFlowContainer);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
