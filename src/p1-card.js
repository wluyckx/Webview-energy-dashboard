/**
 * P1 Power Card — HomeWizard-inspired grid consumption/export visualization.
 *
 * Renders a multi-view card with Live/Day/Month/Year tabs:
 * - Live: real-time area chart (power_w over last N readings)
 * - Day: hourly bar chart (import vs export kWh)
 * - Month: daily bar chart
 * - Year: monthly bar chart
 *
 * Purple (#c084fc) = grid import, Green (#34d399) = grid export.
 *
 * CHANGELOG:
 * - 2026-03-20: Initial creation — HomeWizard-inspired P1 card
 */

// eslint-disable-next-line no-unused-vars
var P1Card = (function () {
  // ─── Design tokens ────────────────────────────────────────────────
  var IMPORT_COLOR = '#c084fc';     // Purple — grid consumption
  var IMPORT_GLOW  = '#c084fc40';
  var EXPORT_COLOR = '#34d399';     // Emerald — grid export (surplus)
  var EXPORT_GLOW  = '#34d39940';
  var BG_CARD      = '#111820';
  var BG_ELEVATED  = '#1a2230';
  var TEXT_PRIMARY  = '#e8ecf1';
  var TEXT_SECONDARY = '#8899aa';
  var TEXT_DIM      = '#4a5568';
  var BORDER        = '#1e2a3a';

  // ─── State ────────────────────────────────────────────────────────
  var currentView = 'live';
  var chart = null;
  var liveBuffer = [];            // Rolling buffer for live view
  var LIVE_BUFFER_SIZE = 60;      // 5 minutes at 5s polling
  var pollTimer = null;

  // ─── Helpers ──────────────────────────────────────────────────────

  function formatKwh(kwh) {
    if (kwh >= 100) return kwh.toFixed(0);
    if (kwh >= 10) return kwh.toFixed(1);
    return kwh.toFixed(2);
  }

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
    iconArea.innerHTML = '<span class="p1-card__live-dot"></span><span>--W</span>';

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

    // Reset live buffer on view change
    if (view === 'live') {
      liveBuffer = [];
    }

    // Create new chart for this view
    initChartForView(view);

    // Fetch data immediately
    fetchAndUpdate();
  }

  // ─── Chart Factory ────────────────────────────────────────────────

  function initChartForView(view) {
    if (typeof Chart === 'undefined') return;

    var canvas = document.getElementById('p1-card-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    if (view === 'live') {
      chart = createLiveChart(ctx, canvas);
    } else {
      chart = createBarChart(ctx, view);
    }
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
            callback: function (v) { return formatWatts(v); },
          },
          grid: { color: BORDER, drawBorder: false },
          border: { display: false },
        },
      },
    };
  }

  function createBarChart(ctx, view) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Import',
            data: [],
            backgroundColor: IMPORT_COLOR,
            borderRadius: { topLeft: 3, topRight: 3 },
            borderSkipped: false,
          },
          {
            label: 'Export',
            data: [],
            backgroundColor: EXPORT_COLOR,
            borderRadius: { topLeft: 3, topRight: 3 },
            borderSkipped: false,
          },
        ],
      },
      options: barChartOptions(view),
    });
  }

  function barChartOptions(view) {
    var xTitle = view === 'day' ? '' : view === 'month' ? '' : '';
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
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
              return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + ' kWh';
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: TEXT_DIM, font: { size: 10 }, maxRotation: 0 },
          grid: { display: false },
          border: { display: false },
          title: xTitle ? { display: true, text: xTitle, color: TEXT_SECONDARY } : { display: false },
        },
        y: {
          ticks: {
            color: TEXT_DIM,
            font: { size: 10 },
            callback: function (v) { return v.toFixed(0); },
          },
          grid: { color: BORDER, drawBorder: false },
          border: { display: false },
        },
      },
    };
  }

  // ─── Data Processing ──────────────────────────────────────────────

  /**
   * Process P1 series data — compute per-bucket deltas from cumulative meters.
   * P1 series buckets have cumulative energy_import_kwh / energy_export_kwh.
   * We diff consecutive buckets to get hourly/daily/monthly consumption.
   */
  function computeDeltas(series) {
    var result = [];
    for (var i = 1; i < series.length; i++) {
      var prev = series[i - 1];
      var curr = series[i];
      var importDelta = (curr.energy_import_kwh - prev.energy_import_kwh) / 1000;
      var exportDelta = (curr.energy_export_kwh - prev.energy_export_kwh) / 1000;

      // Sanity: if the values are huge (cumulative Wh readings), normalize
      if (importDelta > 1000) {
        importDelta = curr.avg_power_w * 1 / 1000; // fallback to avg_power * 1h / 1000
      }
      if (exportDelta > 1000) {
        exportDelta = 0;
      }

      result.push({
        bucket: curr.bucket,
        import_kwh: Math.max(0, importDelta),
        export_kwh: Math.max(0, exportDelta),
        avg_power_w: curr.avg_power_w || 0,
        max_power_w: curr.max_power_w || 0,
      });
    }
    return result;
  }

  // ─── Data Fetching & Chart Updates ────────────────────────────────

  function fetchAndUpdate() {
    var config = Config.getConfig();
    if (!config) return;

    if (currentView === 'live') {
      ApiClient.fetchP1Realtime(config).then(function (data) {
        if (!data) return;
        updateLiveView(data);
      });
    } else {
      var frame = currentView; // day, month, year
      ApiClient.fetchP1Series(config, frame).then(function (data) {
        if (!data || !data.series) return;
        updateBarView(data, frame);
      });
    }
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
    updateHeader(null, data);

    // Update live value indicator
    var liveEl = document.getElementById('p1-card-live-value');
    if (liveEl) {
      var pw = data.power_w || 0;
      var sign = pw >= 0 ? '' : '-';
      liveEl.innerHTML = '<span class="p1-card__live-dot p1-card__live-dot--active"></span>' +
        '<span>' + sign + formatWatts(Math.abs(pw)) + '</span>';
    }

    // Update chart
    if (!chart) return;
    chart.data.labels = liveBuffer.map(function (p) { return timeLabel(p.time); });
    chart.data.datasets[0].data = liveBuffer.map(function (p) { return p.import_w; });
    chart.data.datasets[1].data = liveBuffer.map(function (p) { return -p.export_w; });
    chart.update('none');
  }

  function updateBarView(seriesData, frame) {
    var deltas = computeDeltas(seriesData.series);
    if (deltas.length === 0) return;

    var labels = [];
    var importData = [];
    var exportData = [];
    var totalImport = 0;
    var totalExport = 0;

    deltas.forEach(function (d) {
      var date = new Date(d.bucket);
      if (frame === 'day') {
        labels.push(timeLabel(date));
      } else if (frame === 'month') {
        labels.push(date.getDate());
      } else {
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        labels.push(months[date.getMonth()]);
      }
      importData.push(d.import_kwh);
      exportData.push(d.export_kwh);
      totalImport += d.import_kwh;
      totalExport += d.export_kwh;
    });

    // Update header totals
    updateHeader({ import_kwh: totalImport, export_kwh: totalExport }, null);

    // Update chart
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = importData;
    chart.data.datasets[1].data = exportData;
    chart.update();
  }

  function updateHeader(totals, realtimeData) {
    var importEl = document.getElementById('p1-card-import');
    var exportEl = document.getElementById('p1-card-export');

    if (totals) {
      if (importEl) importEl.textContent = formatKwh(totals.import_kwh);
      if (exportEl) exportEl.textContent = formatKwh(totals.export_kwh);
    }

    if (realtimeData && currentView === 'live') {
      // For live view, show today's cumulative from realtime data
      // (These are total meter readings — we'd need start-of-day baseline)
      // For now show current power in header
      var pw = realtimeData.power_w || 0;
      if (importEl) importEl.textContent = formatWatts(Math.abs(pw));
      if (exportEl) exportEl.textContent = '';
    }
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
