/**
 * Charts module for the Energy Dashboard.
 *
 * Renders a Chart.js area/line timeline chart showing today's hourly power
 * data: solar production, battery charge/discharge, grid import/export,
 * and home consumption. Data sourced from Sungrow /v1/series?frame=day.
 *
 * Also renders a monthly overview grouped bar chart showing daily production
 * and consumption in kWh. Data sourced from Sungrow /v1/series?frame=month.
 *
 * STORY-009: Power Timeline Chart
 * STORY-011: Monthly Overview Bar Chart
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-009)
 * - 2026-02-15: Add monthly overview bar chart (STORY-011)
 */

// eslint-disable-next-line no-unused-vars
var Charts = (function () {
  // ---------------------------------------------------------------------------
  // Color constants matching CSS custom properties
  // ---------------------------------------------------------------------------
  var COLORS = {
    solar: '#F6B93B',
    batteryCharge: '#6c5ce7',
    batteryDischarge: '#a29bfe',
    gridImport: '#e17055',
    gridExport: '#00b894',
    home: '#DFE6E9',
    textTertiary: '#4a5568',
    textSecondary: '#8899aa',
    borderSubtle: '#1e2a3a',
    bgSurface: '#111820',
  };

  // ---------------------------------------------------------------------------
  // Pure data transformation
  // ---------------------------------------------------------------------------

  /**
   * Transform Sungrow series day data into Chart.js dataset format.
   *
   * Converts hourly buckets into time-string labels and four datasets
   * (Solar, Battery, Grid, Home) with values in kW.
   *
   * @param {Object} seriesData - Sungrow series day response with .series array.
   * @returns {{ labels: string[], datasets: Object[] }} Chart.js-compatible data.
   */
  function transformSeriesToDatasets(seriesData) {
    var buckets = seriesData.series;
    var labels = [];
    var solarData = [];
    var batteryData = [];
    var gridData = [];
    var homeData = [];

    buckets.forEach(function (bucket) {
      // Extract HH:MM from bucket timestamp
      var date = new Date(bucket.bucket);
      var hours = String(date.getHours()).padStart(2, '0');
      var minutes = String(date.getMinutes()).padStart(2, '0');
      labels.push(hours + ':' + minutes);

      // Convert W to kW
      solarData.push(bucket.avg_pv_power_w / 1000);
      batteryData.push(bucket.avg_battery_power_w / 1000);
      gridData.push(bucket.avg_export_power_w / 1000);
      homeData.push(bucket.avg_load_power_w / 1000);
    });

    return {
      labels: labels,
      datasets: [
        {
          label: 'Solar',
          data: solarData,
          borderColor: COLORS.solar,
          backgroundColor: COLORS.solar,
          fill: 'origin',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Battery',
          data: batteryData,
          borderColor: COLORS.batteryCharge,
          backgroundColor: COLORS.batteryCharge,
          fill: 'origin',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Grid',
          data: gridData,
          borderColor: COLORS.gridExport,
          backgroundColor: COLORS.gridExport,
          fill: 'origin',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Home',
          data: homeData,
          borderColor: COLORS.home,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Chart.js gradient helpers
  // ---------------------------------------------------------------------------

  /**
   * Create a vertical gradient that fades from a solid color at the top
   * to transparent at the bottom.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context.
   * @param {HTMLCanvasElement} canvas - The canvas element (for height).
   * @param {string} color - Base color in hex format.
   * @param {number} opacity - Max opacity at the top (0-1).
   * @returns {CanvasGradient} The gradient object.
   */
  function createFillGradient(ctx, canvas, color, opacity) {
    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, hexToRgba(color, opacity));
    gradient.addColorStop(1, hexToRgba(color, 0));
    return gradient;
  }

  /**
   * Convert a hex color string to an rgba() string.
   *
   * @param {string} hex - Hex color (e.g. "#F6B93B").
   * @param {number} alpha - Alpha value (0-1).
   * @returns {string} rgba() color string.
   */
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // ---------------------------------------------------------------------------
  // Chart initialization
  // ---------------------------------------------------------------------------

  /**
   * Create and return a Chart.js instance configured for the power timeline.
   *
   * Applies dark-theme styling, gradient fills, tooltip configuration,
   * and smooth curve interpolation. Returns null if the canvas element
   * is not found or Chart.js is not loaded.
   *
   * @param {string} canvasId - The DOM id of the <canvas> element.
   * @returns {Chart|null} The Chart.js instance or null.
   */
  function initTimelineChart(canvasId) {
    // Guard: Chart.js must be loaded
    if (typeof Chart === 'undefined') {
      console.warn('Charts: Chart.js is not loaded. Cannot initialize timeline chart.');
      return null;
    }

    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn('Charts: Canvas element "' + canvasId + '" not found.');
      return null;
    }

    var ctx = canvas.getContext('2d');

    // Build gradient fills
    var solarGradient = createFillGradient(ctx, canvas, COLORS.solar, 0.3);
    var batteryGradient = createFillGradient(ctx, canvas, COLORS.batteryCharge, 0.2);
    var gridGradient = createFillGradient(ctx, canvas, COLORS.gridExport, 0.2);

    var chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Solar',
            data: [],
            borderColor: COLORS.solar,
            backgroundColor: solarGradient,
            fill: 'origin',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Battery',
            data: [],
            borderColor: COLORS.batteryCharge,
            backgroundColor: batteryGradient,
            fill: 'origin',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Grid',
            data: [],
            borderColor: COLORS.gridExport,
            backgroundColor: gridGradient,
            fill: 'origin',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Home',
            data: [],
            borderColor: COLORS.home,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: COLORS.textSecondary,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: COLORS.bgSurface,
            titleColor: COLORS.textSecondary,
            bodyColor: '#e8ecf1',
            borderColor: COLORS.borderSubtle,
            borderWidth: 1,
            padding: 12,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                var value = context.parsed.y;
                return label + ': ' + value.toFixed(2) + ' kW';
              },
            },
          },
        },
        scales: {
          x: {
            type: 'category',
            ticks: {
              color: COLORS.textTertiary,
              font: {
                size: 11,
              },
              maxRotation: 0,
            },
            grid: {
              color: COLORS.borderSubtle,
              borderDash: [4, 4],
              drawBorder: false,
            },
            border: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: COLORS.textTertiary,
              font: {
                size: 11,
              },
              callback: function (value) {
                return value + ' kW';
              },
            },
            title: {
              display: true,
              text: 'Power (kW)',
              color: COLORS.textSecondary,
              font: {
                size: 12,
              },
            },
            grid: {
              color: function (context) {
                // Emphasize the zero line
                if (context.tick.value === 0) {
                  return COLORS.textTertiary;
                }
                return COLORS.borderSubtle;
              },
              borderDash: function (context) {
                if (context.tick.value === 0) {
                  return [];
                }
                return [4, 4];
              },
              drawBorder: false,
            },
            border: {
              display: false,
            },
          },
        },
      },
    });

    return chart;
  }

  // ---------------------------------------------------------------------------
  // Chart update
  // ---------------------------------------------------------------------------

  /**
   * Update an existing Chart.js instance with new series data.
   *
   * Calls transformSeriesToDatasets to convert the raw data, then applies
   * the labels and data arrays to each dataset (preserving gradient fills
   * and styling set during init) and triggers chart.update().
   *
   * @param {Chart} chart - The Chart.js instance from initTimelineChart.
   * @param {Object} seriesData - Sungrow series day response with .series array.
   */
  function updateTimelineChart(chart, seriesData) {
    if (!chart || !seriesData || !seriesData.series) {
      return;
    }

    var transformed = transformSeriesToDatasets(seriesData);

    chart.data.labels = transformed.labels;

    // Update data for each dataset (keep existing styling/gradients)
    chart.data.datasets.forEach(function (dataset, index) {
      if (transformed.datasets[index]) {
        dataset.data = transformed.datasets[index].data;
      }
    });

    chart.update();
  }

  // ---------------------------------------------------------------------------
  // Monthly overview bar chart (STORY-011)
  // ---------------------------------------------------------------------------

  /**
   * Transform Sungrow monthly series data into Chart.js bar dataset format.
   *
   * Each bucket represents a 24-hour daily average. To convert average power
   * (W) to daily energy (kWh): avg_power_w * 24 / 1000.
   *
   * @param {Object} seriesData - Sungrow series month response with .series array.
   * @returns {{ labels: number[], datasets: Object[] }} Chart.js-compatible bar data.
   */
  function transformMonthlyToBarData(seriesData) {
    var buckets = seriesData.series;
    var labels = [];
    var productionData = [];
    var consumptionData = [];

    buckets.forEach(function (bucket) {
      labels.push(new Date(bucket.bucket).getDate());
      productionData.push((bucket.avg_pv_power_w * 24) / 1000);
      consumptionData.push((bucket.avg_load_power_w * 24) / 1000);
    });

    return {
      labels: labels,
      datasets: [
        {
          label: 'Production',
          data: productionData,
          backgroundColor: COLORS.solar,
          borderRadius: 4,
        },
        {
          label: 'Consumption',
          data: consumptionData,
          backgroundColor: COLORS.home,
          borderRadius: 4,
        },
      ],
    };
  }

  /**
   * Create and return a Chart.js bar chart instance for the monthly overview.
   *
   * Displays grouped bars for daily production and consumption in kWh.
   * Dark theme styling matches the timeline chart (STORY-009).
   * Returns null if the canvas element is not found or Chart.js is not loaded.
   *
   * @param {string} canvasId - The DOM id of the <canvas> element.
   * @returns {Chart|null} The Chart.js instance or null.
   */
  function initMonthlyChart(canvasId) {
    // Guard: Chart.js must be loaded
    if (typeof Chart === 'undefined') {
      console.warn('Charts: Chart.js is not loaded. Cannot initialize monthly chart.');
      return null;
    }

    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn('Charts: Canvas element "' + canvasId + '" not found.');
      return null;
    }

    var ctx = canvas.getContext('2d');

    var chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Production',
            data: [],
            backgroundColor: COLORS.solar,
            borderRadius: 4,
          },
          {
            label: 'Consumption',
            data: [],
            backgroundColor: COLORS.home,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: COLORS.textSecondary,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: COLORS.bgSurface,
            titleColor: COLORS.textSecondary,
            bodyColor: '#e8ecf1',
            borderColor: COLORS.borderSubtle,
            borderWidth: 1,
            padding: 12,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                var value = context.parsed.y;
                return label + ': ' + value.toFixed(2) + ' kWh';
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: COLORS.textTertiary,
              font: {
                size: 11,
              },
              maxRotation: 0,
            },
            title: {
              display: true,
              text: 'Day of Month',
              color: COLORS.textSecondary,
              font: {
                size: 12,
              },
            },
            grid: {
              color: COLORS.borderSubtle,
              borderDash: [4, 4],
              drawBorder: false,
            },
            border: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: COLORS.textTertiary,
              font: {
                size: 11,
              },
              callback: function (value) {
                return value + ' kWh';
              },
            },
            title: {
              display: true,
              text: 'Energy (kWh)',
              color: COLORS.textSecondary,
              font: {
                size: 12,
              },
            },
            grid: {
              color: COLORS.borderSubtle,
              borderDash: [4, 4],
              drawBorder: false,
            },
            border: {
              display: false,
            },
          },
        },
      },
    });

    return chart;
  }

  /**
   * Update an existing monthly bar chart with new series data.
   *
   * Calls transformMonthlyToBarData to convert the raw data, then applies
   * the labels and data arrays to each dataset (preserving styling set
   * during init) and triggers chart.update().
   *
   * @param {Chart} chart - The Chart.js instance from initMonthlyChart.
   * @param {Object} seriesData - Sungrow series month response with .series array.
   */
  function updateMonthlyChart(chart, seriesData) {
    if (!chart || !seriesData || !seriesData.series) {
      return;
    }

    var transformed = transformMonthlyToBarData(seriesData);

    chart.data.labels = transformed.labels;

    chart.data.datasets.forEach(function (dataset, index) {
      if (transformed.datasets[index]) {
        dataset.data = transformed.datasets[index].data;
      }
    });

    chart.update();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    COLORS: COLORS,
    transformSeriesToDatasets: transformSeriesToDatasets,
    initTimelineChart: initTimelineChart,
    updateTimelineChart: updateTimelineChart,
    transformMonthlyToBarData: transformMonthlyToBarData,
    initMonthlyChart: initMonthlyChart,
    updateMonthlyChart: updateMonthlyChart,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Charts;
}
