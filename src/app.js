/**
 * Main application orchestration module for the Energy Dashboard.
 * Initializes the dashboard and coordinates component lifecycle.
 *
 * CHANGELOG:
 * - 2026-02-15: Add status bar component with connectivity indicators (STORY-016)
 * - 2026-02-15: Add Flutter WebView bridge integration (STORY-014)
 * - 2026-02-15: Add 60-second energy balance polling (STORY-010)
 * - 2026-02-15: Integrate KpiStrip with polling and capacity fetch (STORY-008)
 * - 2026-02-15: Add 5-second realtime polling with startPolling (STORY-007)
 * - 2026-02-15: Initial scaffolding with DOMContentLoaded listener (STORY-001)
 *
 * - 2026-02-15: Add Chart.js timeline chart with 5-min polling (STORY-009)
 */

// eslint-disable-next-line no-unused-vars
const App = (() => {
  /** Cached P1 capacity data, fetched once on init. */
  var capacityData = null;
  /** Chart.js timeline chart instance (STORY-009). */
  var timelineChart = null;
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
   * Determine the current dashboard connectivity status based on
   * ApiClient staleness and offline state (STORY-016).
   *
   * @returns {{ status: string, color: string, label: string }}
   */
  function getStatusIndicator() {
    if (typeof ApiClient === 'undefined') {
      return { status: 'live', color: '#00B894', label: 'Live' };
    }

    if (ApiClient.isOffline()) {
      return { status: 'offline', color: '#E17055', label: 'Offline' };
    }

    var p1Stale = ApiClient.isStale('p1');
    var sungrowStale = ApiClient.isStale('sungrow');

    if (p1Stale || sungrowStale) {
      return { status: 'delayed', color: '#FDCB6E', label: 'Delayed' };
    }

    return { status: 'live', color: '#00B894', label: 'Live' };
  }

  /**
   * Format a timestamp as "HH:MM:SS" for the status bar display (STORY-016).
   *
   * @param {number} timestamp - Unix-epoch millisecond timestamp.
   * @returns {string} Formatted time string, or empty string if no timestamp.
   */
  function formatLastUpdate(timestamp) {
    if (!timestamp || timestamp === 0) {
      return '';
    }
    var d = new Date(timestamp);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  /**
   * Update the DOM status bar with current connectivity state and
   * last-update timestamp (STORY-016).
   */
  function updateStatusBar() {
    var dot = document.querySelector('.status-bar__dot');
    var label = document.querySelector('.status-bar__placeholder');
    if (!dot || !label) {
      return;
    }

    var indicator = getStatusIndicator();
    dot.style.backgroundColor = indicator.color;

    // Build label text: "Live    Last update: HH:MM:SS"
    var text = indicator.label;

    // Find the most recent success time
    if (typeof ApiClient !== 'undefined') {
      var p1Time = ApiClient.getLastSuccessTime('p1');
      var sgTime = ApiClient.getLastSuccessTime('sungrow');
      var lastTime = Math.max(p1Time, sgTime);
      var formatted = formatLastUpdate(lastTime);
      if (formatted) {
        text += '    Last update: ' + formatted;
      }
    }

    label.textContent = text;
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

      // Update status bar connectivity indicator (STORY-016)
      updateStatusBar();
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
   * Fetch Sungrow series day data and update the timeline chart.
   *
   * @returns {Promise<void>}
   */
  function pollTimelineChart() {
    var config = Config.getConfig();
    if (!config || !timelineChart) {
      return Promise.resolve();
    }

    return ApiClient.fetchSungrowSeries(config, 'day').then(function (data) {
      if (data) {
        Charts.updateTimelineChart(timelineChart, data);
      }
    });
  }

  /**
   * Start 5-minute polling for timeline chart data (STORY-009).
   * Performs an immediate fetch, then sets up the interval.
   *
   * @returns {number} The interval ID (for testing/cleanup).
   */
  function startTimelinePolling() {
    // Immediate first poll
    pollTimelineChart();

    // Poll every 5 minutes
    return setInterval(pollTimelineChart, 300000);
  }

  /**
   * Validate and handle incoming postMessage events from Flutter WebView.
   * Security: only accepts messages from same origin (AC5, STORY-014).
   *
   * @param {MessageEvent} event - The postMessage event.
   */
  function handleMessage(event) {
    // 1. Validate origin — same-origin only (Flutter WebView posts from same origin)
    if (event.origin !== window.location.origin) {
      console.warn('[App] Rejected postMessage from untrusted origin:', event.origin);
      return;
    }

    // 2. Validate data is an object with a string type field
    var data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
      console.warn('[App] Rejected postMessage with invalid schema:', data);
      return;
    }

    // 3. Handle known message types
    if (data.type === 'token_refresh' || data.type === 'bootstrap') {
      var tokens = {};
      if (typeof data.p1_token === 'string' && data.p1_token.trim() !== '') {
        tokens.p1_token = data.p1_token;
      }
      if (typeof data.sungrow_token === 'string' && data.sungrow_token.trim() !== '') {
        tokens.sungrow_token = data.sungrow_token;
      }
      if (Object.keys(tokens).length > 0 && typeof Config !== 'undefined') {
        Config.updateTokens(tokens);
      }
    }
  }

  /**
   * Dispatch an event to the Flutter app via the InAppWebView bridge.
   * No-op if the bridge is not available (graceful fallback).
   *
   * @param {string} eventName - The handler name registered in Flutter.
   * @param {*} data - The payload to send.
   */
  function dispatchToFlutter(eventName, data) {
    if (
      typeof window !== 'undefined' &&
      window.flutter_inappwebview &&
      typeof window.flutter_inappwebview.callHandler === 'function'
    ) {
      window.flutter_inappwebview.callHandler(eventName, data);
    }
  }

  /**
   * Initialize the dashboard.
   * Parses config, shows errors if invalid, otherwise starts components.
   */
  function init() {
    console.log('Dashboard initialized');

    // Listen for postMessage events from Flutter WebView (STORY-014)
    window.addEventListener('message', handleMessage);

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

    // Initialize timeline chart and start 5-min polling (STORY-009)
    if (typeof Charts !== 'undefined') {
      timelineChart = Charts.initTimelineChart('timeline-chart');
      if (timelineChart && typeof Config !== 'undefined' && typeof ApiClient !== 'undefined') {
        startTimelinePolling();
      }
    }

    // Initialize monthly overview chart — loaded once, no polling (STORY-011)
    if (
      typeof Charts !== 'undefined' &&
      typeof Config !== 'undefined' &&
      typeof ApiClient !== 'undefined'
    ) {
      var monthlyChart = Charts.initMonthlyChart('monthly-chart');
      if (monthlyChart) {
        ApiClient.fetchSungrowSeries(Config.getConfig(), 'month').then(function (data) {
          if (data) {
            Charts.updateMonthlyChart(monthlyChart, data);
          }
        });
      }
    }

    // Notify Flutter that the dashboard is ready (STORY-014)
    dispatchToFlutter('dashboardReady', { version: '1.0' });
  }

  return {
    init: init,
    showConfigError: showConfigError,
    startPolling: startPolling,
    startEnergyBalancePolling: startEnergyBalancePolling,
    handleMessage: handleMessage,
    dispatchToFlutter: dispatchToFlutter,
    getStatusIndicator: getStatusIndicator,
    formatLastUpdate: formatLastUpdate,
    updateStatusBar: updateStatusBar,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
