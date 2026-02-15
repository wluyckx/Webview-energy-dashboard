/**
 * Main application orchestration module for the Energy Dashboard.
 * Initializes the dashboard and coordinates component lifecycle.
 *
 * CHANGELOG:
 * - 2026-02-15: Add 60-second energy balance polling (STORY-010)
 * - 2026-02-15: Integrate KpiStrip with polling and capacity fetch (STORY-008)
 * - 2026-02-15: Add 5-second realtime polling with startPolling (STORY-007)
 * - 2026-02-15: Initial scaffolding with DOMContentLoaded listener (STORY-001)
 *
 * TODO:
 * - Initialize charts (STORY-009)
 */

// eslint-disable-next-line no-unused-vars
const App = (() => {
  /** Cached P1 capacity data, fetched once on init. */
  var capacityData = null;
  /**
   * Show a user-friendly config error panel in the dashboard.
   * @param {string[]} errors - List of config error messages.
   */
  function showConfigError(errors) {
    var dashboard = document.querySelector('.dashboard');
    if (!dashboard) {
      return;
    }

    var panel = document.createElement('section');
    panel.className = 'dashboard-section config-error';
    panel.setAttribute('role', 'alert');
    panel.innerHTML =
      '<h2 class="dashboard-section__title">Configuration Error</h2>' +
      '<p class="dashboard-section__placeholder">The dashboard could not start due to missing or invalid configuration:</p>' +
      '<ul class="config-error__list">' +
      errors
        .map(function (e) {
          return '<li>' + e + '</li>';
        })
        .join('') +
      '</ul>';

    // Insert at top of dashboard, hide other sections
    dashboard.insertBefore(panel, dashboard.firstChild);
  }

  /**
   * Fetch P1 and Sungrow realtime data in parallel, compute flows,
   * and update the power flow diagram. Handles null data gracefully:
   * if both APIs fail (return null), no update is performed.
   *
   * @returns {Promise<void>}
   */
  function pollRealtimeData() {
    var config = Config.getConfig();
    if (!config) {
      return Promise.resolve();
    }

    return Promise.all([
      ApiClient.fetchP1Realtime(config),
      ApiClient.fetchSungrowRealtime(config),
    ]).then(function (results) {
      var p1Data = results[0];
      var sungrowData = results[1];

      // If both APIs failed, don't update the diagram
      if (!p1Data || !sungrowData) {
        return;
      }

      var flows = PowerFlow.computeFlows(p1Data, sungrowData);
      PowerFlow.updateAllFlows(flows);
      PowerFlow.updateNodeValues(flows);

      // Update KPI strip cards (STORY-008)
      if (typeof KpiStrip !== 'undefined') {
        KpiStrip.updateAll(p1Data, sungrowData, capacityData);
      }
    });
  }

  /**
   * Start 5-second polling for realtime data.
   * Performs an immediate fetch, then sets up the interval.
   *
   * @returns {number} The interval ID (for testing/cleanup).
   */
  function startPolling() {
    // Immediate first poll
    pollRealtimeData();

    // Poll every 5 seconds
    return setInterval(pollRealtimeData, 5000);
  }

  /**
   * Fetch Sungrow series day data and update the energy balance section.
   *
   * @returns {Promise<void>}
   */
  function pollEnergyBalance() {
    var config = Config.getConfig();
    if (!config) {
      return Promise.resolve();
    }

    return ApiClient.fetchSungrowSeries(config, 'day').then(function (data) {
      if (data) {
        EnergyBalance.update(data);
      }
    });
  }

  /**
   * Start 60-second polling for energy balance data (STORY-010).
   * Performs an immediate fetch, then sets up the interval.
   *
   * @returns {number} The interval ID (for testing/cleanup).
   */
  function startEnergyBalancePolling() {
    // Immediate first poll
    pollEnergyBalance();

    // Poll every 60 seconds
    return setInterval(pollEnergyBalance, 60000);
  }

  /**
   * Initialize the dashboard.
   * Parses config, shows errors if invalid, otherwise starts components.
   */
  function init() {
    console.log('Dashboard initialized');

    // Parse config from URL parameters (STORY-002)
    if (typeof Config !== 'undefined') {
      var result = Config.parseConfig(window.location.search);
      if (!result.valid) {
        showConfigError(result.errors);
        return;
      }
    }

    // Initialize power flow diagram (STORY-005)
    var powerFlowContainer = document.getElementById('power-flow-container');
    if (powerFlowContainer && typeof PowerFlow !== 'undefined') {
      PowerFlow.init(powerFlowContainer);
    }

    // Fetch capacity data once for KPI peak card (STORY-008)
    if (
      typeof Config !== 'undefined' &&
      typeof ApiClient !== 'undefined' &&
      typeof KpiStrip !== 'undefined'
    ) {
      var now = new Date();
      var currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      ApiClient.fetchP1Capacity(Config.getConfig(), currentMonth).then(function (data) {
        if (data) {
          capacityData = data;
        }
      });
    }

    // Start realtime data polling (STORY-007)
    if (
      typeof Config !== 'undefined' &&
      typeof ApiClient !== 'undefined' &&
      typeof PowerFlow !== 'undefined'
    ) {
      startPolling();
    }

    // Start energy balance polling — 60s interval (STORY-010)
    if (
      typeof Config !== 'undefined' &&
      typeof ApiClient !== 'undefined' &&
      typeof EnergyBalance !== 'undefined'
    ) {
      startEnergyBalancePolling();
    }
  }

  return {
    init: init,
    showConfigError: showConfigError,
    startPolling: startPolling,
    startEnergyBalancePolling: startEnergyBalancePolling,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
