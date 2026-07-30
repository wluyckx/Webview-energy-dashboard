/**
 * P1 Power Card — HomeWizard-inspired grid consumption/export visualization.
 *
 * Renders a multi-view card with Live/Day/Month/Year tabs:
 * - Live: real-time area chart (power_w over last N readings)
 * - Day / Month / Year: gated. The P1 history endpoint's per-bucket response
 *   shape has never been captured from the live meter, so these views render a
 *   defined "not available yet" state instead of a chart, and issue no request.
 *   RW-C01 captures the contract and is what unlocks them.
 *
 * Purple (#c084fc) = grid import, Green (#34d399) = grid export.
 *
 * CHANGELOG:
 * - 2026-07-30: Gate Day/Month/Year behind an honest unavailable state until the P1 series contract is captured (RW-M04)
 * - 2026-07-30: Remove three dead design-token constants; prettier reflow (RW-M01)
 * - 2026-03-20: Initial creation — HomeWizard-inspired P1 card
 */

// eslint-disable-next-line no-unused-vars
var P1Card = (function () {
  // ─── Design tokens ────────────────────────────────────────────────
  var IMPORT_COLOR = '#c084fc'; // Purple — grid consumption
  var EXPORT_COLOR = '#34d399'; // Emerald — grid export (surplus)
  var BG_ELEVATED = '#1a2230';
  var TEXT_PRIMARY = '#e8ecf1';
  var TEXT_SECONDARY = '#8899aa';
  var TEXT_DIM = '#4a5568';
  var BORDER = '#1e2a3a';

  // ─── State ────────────────────────────────────────────────────────
  var currentView = 'live';
  var chart = null;
  var liveBuffer = []; // Rolling buffer for live view
  var LIVE_BUFFER_SIZE = 60; // 5 minutes at 5s polling
  var pollTimer = null;

  // Neutral (no reading) markup for the header's live indicator.
  var LIVE_VALUE_IDLE_HTML = '<span class="p1-card__live-dot"></span><span>--W</span>';

  // ─── Helpers ──────────────────────────────────────────────────────

  function formatWatts(w) {
    if (Math.abs(w) >= 1000) return (w / 1000).toFixed(1) + ' kW';
    return Math.round(w) + ' W';
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function timeLabel(date) {
    var h = String(date.getHours()).padStart(2, '0');
    var m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // ─── DOM Construction ─────────────────────────────────────────────

  function buildCard() {
    var section = document.getElementById('section-p1-card');
    if (!section) return;

    section.innerHTML = '';

    // Header row
    var header = document.createElement('div');
    header.className = 'p1-card__header';

    var titleArea = document.createElement('div');
    titleArea.className = 'p1-card__title-area';

    var valueImport = document.createElement('span');
    valueImport.id = 'p1-card-import';
    valueImport.className = 'p1-card__value p1-card__value--import';
    valueImport.textContent = '0.0';

    var valueExport = document.createElement('span');
    valueExport.id = 'p1-card-export';
    valueExport.className = 'p1-card__value p1-card__value--export';
    valueExport.textContent = '0.0';

    var unitSpan = document.createElement('span');
    unitSpan.className = 'p1-card__unit';
    unitSpan.textContent = ' kWh';

    titleArea.appendChild(valueImport);
    titleArea.appendChild(document.createTextNode(' '));
    titleArea.appendChild(valueExport);
    titleArea.appendChild(unitSpan);

    var subtitle = document.createElement('div');
    subtitle.className = 'p1-card__subtitle';
    subtitle.textContent = 'Total power';

    var iconArea = document.createElement('div');
    iconArea.className = 'p1-card__icon-area';
    iconArea.id = 'p1-card-live-value';
    iconArea.innerHTML = LIVE_VALUE_IDLE_HTML;

    header.appendChild(titleArea);
    header.appendChild(iconArea);
    section.appendChild(header);
    section.appendChild(subtitle);

    // Chart container
    var chartWrap = document.createElement('div');
    chartWrap.className = 'p1-card__chart-wrap';
    var canvas = document.createElement('canvas');
    canvas.id = 'p1-card-chart';
    chartWrap.appendChild(canvas);
    section.appendChild(chartWrap);

    // Tab bar
    var tabs = document.createElement('div');
    tabs.className = 'p1-card__tabs';
    ['Live', 'Day', 'Month', 'Year'].forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'p1-card__tab';
      btn.textContent = label;
      btn.dataset.view = label.toLowerCase();
      if (label.toLowerCase() === currentView) {
        btn.classList.add('p1-card__tab--active');
      }
      btn.addEventListener('click', function () {
        switchView(label.toLowerCase());
      });
      tabs.appendChild(btn);
    });
    section.appendChild(tabs);
  }

  // ─── Unavailable State (gated views) ──────────────────────────────

  function chartWrap() {
    var section = document.getElementById('section-p1-card');
    if (!section) return null;
    return section.querySelector('.p1-card__chart-wrap');
  }

  /**
   * Render the static "not available yet" state in place of the chart.
   * The canvas is REMOVED, not hidden — a hidden canvas stays in the
   * accessibility tree. Takes no data and therefore cannot fail.
   */
  function renderUnavailableState() {
    var wrap = chartWrap();
    if (!wrap) return;

    wrap.innerHTML = '';

    var box = document.createElement('div');
    box.className = 'p1-card__unavailable';
    box.setAttribute('role', 'status');

    var message = document.createElement('p');
    message.className = 'p1-card__unavailable-message';
    message.textContent = 'History is not available yet';

    var detail = document.createElement('p');
    detail.className = 'p1-card__unavailable-detail';
    detail.textContent =
      'The format of the P1 meter history data has not been captured yet, so there is ' +
      'nothing here that can be shown honestly. This view returns once it has been.';

    box.appendChild(message);
    box.appendChild(detail);
    wrap.appendChild(box);

    setHeaderUnavailable();
  }

  /** Undo the gate: drop the unavailable state and put the canvas back. */
  function restoreChartCanvas() {
    var wrap = chartWrap();
    if (!wrap) return;

    var unavailable = wrap.querySelector('.p1-card__unavailable');
    if (unavailable) wrap.removeChild(unavailable);

    if (!wrap.querySelector('canvas')) {
      var canvas = document.createElement('canvas');
      canvas.id = 'p1-card-chart';
      wrap.appendChild(canvas);
    }
  }

  // ─── Tab Switching ────────────────────────────────────────────────

  function switchView(view) {
    currentView = view;

    // Update tab active state
    var tabs = document.querySelectorAll('.p1-card__tab');
    tabs.forEach(function (tab) {
      tab.classList.toggle('p1-card__tab--active', tab.dataset.view === view);
    });

    // Destroy existing chart
    if (chart) {
      chart.destroy();
      chart = null;
    }

    // Day/Month/Year are GATED. The per-bucket response shape of the P1
    // history endpoint has never been captured from the live meter (risk R1),
    // so there is no contract to render against and nothing safe to poll
    // (HC-006). These views build no chart and make no request; they show a
    // defined unavailable state instead. Unlock condition: RW-C01 — once that
    // story captures the real contract, the chart path can be rebuilt on it.
    if (view !== 'live') {
      renderUnavailableState();
      return;
    }

    // Live: reset the rolling buffer, restore the canvas the gate removed,
    // rebuild the chart and resume normal behaviour.
    liveBuffer = [];
    restoreChartCanvas();
    initChartForView(view);
    fetchAndUpdate();
  }

  // ─── Chart Factory ────────────────────────────────────────────────

  function initChartForView(view) {
    if (typeof Chart === 'undefined') return;
    if (view !== 'live') return; // gated views have no chart at all

    var canvas = document.getElementById('p1-card-chart');
    if (!canvas) return;

    chart = createLiveChart(canvas.getContext('2d'), canvas);
  }

  function createLiveChart(ctx, canvas) {
    // Gradient fills
    var importGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    importGrad.addColorStop(0, hexToRgba(IMPORT_COLOR, 0.4));
    importGrad.addColorStop(1, hexToRgba(IMPORT_COLOR, 0.02));

    var exportGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    exportGrad.addColorStop(0, hexToRgba(EXPORT_COLOR, 0.02));
    exportGrad.addColorStop(1, hexToRgba(EXPORT_COLOR, 0.4));

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Import',
            data: [],
            borderColor: IMPORT_COLOR,
            backgroundColor: importGrad,
            borderWidth: 2,
            fill: 'origin',
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
          {
            label: 'Export',
            data: [],
            borderColor: EXPORT_COLOR,
            backgroundColor: exportGrad,
            borderWidth: 2,
            fill: 'origin',
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: liveChartOptions(),
    });
  }

  function liveChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: BG_ELEVATED,
          titleColor: TEXT_SECONDARY,
          bodyColor: TEXT_PRIMARY,
          borderColor: BORDER,
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function (ctx) {
              return ctx.dataset.label + ': ' + formatWatts(ctx.parsed.y);
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: TEXT_DIM, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 8 },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: TEXT_DIM,
            font: { size: 10 },
            callback: function (v) {
              return formatWatts(v);
            },
          },
          grid: { color: BORDER, drawBorder: false },
          border: { display: false },
        },
      },
    };
  }

  // ─── Data Fetching & Chart Updates ────────────────────────────────

  function fetchAndUpdate() {
    // Only Live has a captured contract to fetch against. The gated views make
    // no request at all — see the gate in switchView (RW-C01 / R1).
    if (currentView !== 'live') return;

    var config = Config.getConfig();
    if (!config) return;

    ApiClient.fetchP1Realtime(config).then(function (data) {
      if (!data) return;
      updateLiveView(data);
    });
  }

  function updateLiveView(data) {
    // Push to rolling buffer
    liveBuffer.push({
      time: new Date(),
      import_w: Math.max(0, data.power_w || 0),
      export_w: Math.max(0, -(data.power_w || 0)),
    });
    if (liveBuffer.length > LIVE_BUFFER_SIZE) {
      liveBuffer.shift();
    }

    // Update header
    updateHeader(data);

    // Update live value indicator
    var liveEl = document.getElementById('p1-card-live-value');
    if (liveEl) {
      var pw = data.power_w || 0;
      var sign = pw >= 0 ? '' : '-';
      liveEl.innerHTML =
        '<span class="p1-card__live-dot p1-card__live-dot--active"></span>' +
        '<span>' +
        sign +
        formatWatts(Math.abs(pw)) +
        '</span>';
    }

    // Update chart
    if (!chart) return;
    chart.data.labels = liveBuffer.map(function (p) {
      return timeLabel(p.time);
    });
    chart.data.datasets[0].data = liveBuffer.map(function (p) {
      return p.import_w;
    });
    chart.data.datasets[1].data = liveBuffer.map(function (p) {
      return -p.export_w;
    });
    chart.update('none');
  }

  function updateHeader(realtimeData) {
    if (!realtimeData || currentView !== 'live') return;

    var importEl = document.getElementById('p1-card-import');
    var exportEl = document.getElementById('p1-card-export');

    // Live view shows current grid power. The realtime payload carries no
    // start-of-day baseline, so no cumulative total is claimed here.
    var pw = realtimeData.power_w || 0;
    if (importEl) importEl.textContent = formatWatts(Math.abs(pw));
    if (exportEl) exportEl.textContent = '';
  }

  /**
   * Header honesty on gated views: an em dash, never a stale total, never NaN.
   * The live indicator is reset to its idle state too — while gated nothing is
   * polled, so the last reading must not keep posing as a current one.
   */
  function setHeaderUnavailable() {
    var importEl = document.getElementById('p1-card-import');
    var exportEl = document.getElementById('p1-card-export');
    if (importEl) importEl.textContent = '—';
    if (exportEl) exportEl.textContent = '—';

    var liveEl = document.getElementById('p1-card-live-value');
    if (liveEl) liveEl.innerHTML = LIVE_VALUE_IDLE_HTML;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────

  function init() {
    buildCard();
    initChartForView(currentView);

    // Initial fetch
    fetchAndUpdate();

    // Poll for live view every 5 seconds
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (currentView === 'live') {
        fetchAndUpdate();
      }
    }, 5000);
  }

  /**
   * Called from App.js during the realtime data update cycle.
   * Only updates if we're in live view.
   */
  function onRealtimeData(p1Data) {
    if (currentView === 'live' && p1Data) {
      updateLiveView(p1Data);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────
  return {
    init: init,
    onRealtimeData: onRealtimeData,
    switchView: switchView,
    fetchAndUpdate: fetchAndUpdate,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = P1Card;
}
