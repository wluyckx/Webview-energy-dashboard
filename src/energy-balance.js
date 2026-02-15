/**
 * Energy Balance module for the Energy Dashboard.
 *
 * Computes and renders today's energy balance from Sungrow series day data.
 * Sums hourly buckets to derive production, export, import, battery
 * charge/discharge, consumption, self-consumption rate, and self-sufficiency rate.
 *
 * STORY-010: Today's Energy Balance
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-010)
 */

// eslint-disable-next-line no-unused-vars
const EnergyBalance = (() => {
  /**
   * Pure function: compute today's energy balance from Sungrow series day data.
   *
   * Iterates over hourly buckets and sums power values, converting W to kWh
   * (each bucket represents one hour, so W / 1000 = kWh for that hour).
   *
   * @param {Object} seriesData - Sungrow series day response with .series array.
   * @returns {Object} Balance object with production, export, import,
   *   batteryCharge, batteryDischarge, consumption, selfConsumption, selfSufficiency.
   */
  function computeBalance(seriesData) {
    var totalProduction = 0;
    var totalExport = 0;
    var totalImport = 0;
    var totalBatteryCharge = 0;
    var totalBatteryDischarge = 0;
    var totalConsumption = 0;

    seriesData.series.forEach(function (bucket) {
      totalProduction += bucket.avg_pv_power_w / 1000;

      if (bucket.avg_export_power_w > 0) {
        totalExport += bucket.avg_export_power_w / 1000;
      } else {
        totalImport += Math.abs(bucket.avg_export_power_w) / 1000;
      }

      if (bucket.avg_battery_power_w > 0) {
        totalBatteryCharge += bucket.avg_battery_power_w / 1000;
      } else {
        totalBatteryDischarge += Math.abs(bucket.avg_battery_power_w) / 1000;
      }

      totalConsumption += bucket.avg_load_power_w / 1000;
    });

    var selfConsumption = totalProduction > 0 ? (1 - totalExport / totalProduction) * 100 : 0;
    var selfSufficiency = totalConsumption > 0 ? (1 - totalImport / totalConsumption) * 100 : 100;

    return {
      production: totalProduction,
      export: totalExport,
      import: totalImport,
      batteryCharge: totalBatteryCharge,
      batteryDischarge: totalBatteryDischarge,
      consumption: totalConsumption,
      selfConsumption: Math.max(0, Math.min(100, selfConsumption)),
      selfSufficiency: Math.max(0, Math.min(100, selfSufficiency)),
    };
  }

  /**
   * Build a single bar segment element.
   *
   * @param {number} widthPct - Width as a percentage of the bar.
   * @param {string} color - CSS color value for the segment background.
   * @param {string} label - Text label to display inside the segment.
   * @returns {HTMLElement} The segment div element.
   */
  function createBarSegment(widthPct, color, label) {
    var segment = document.createElement('div');
    segment.className = 'energy-balance__bar-segment';
    segment.style.width = widthPct.toFixed(1) + '%';
    segment.style.backgroundColor = color;

    // Only show label if segment is wide enough
    if (widthPct > 8) {
      segment.textContent = label;
    }

    return segment;
  }

  /**
   * Render the energy balance into the Section C DOM element.
   * Replaces the placeholder content with the balance display.
   *
   * @param {Object} balance - Balance object from computeBalance().
   */
  function renderBalance(balance) {
    var section = document.getElementById('section-c');
    if (!section) {
      return;
    }

    // Remove placeholder paragraph if present
    var placeholder = section.querySelector('.dashboard-section__placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Remove existing balance display to avoid duplicates
    var existing = section.querySelector('.energy-balance');
    if (existing) {
      existing.remove();
    }

    // Build the balance container
    var container = document.createElement('div');
    container.className = 'energy-balance';

    // --- Stacked bar ---
    var bar = document.createElement('div');
    bar.className = 'energy-balance__bar';

    // Calculate bar segment percentages based on consumption breakdown
    var total = balance.consumption;
    if (total > 0) {
      // Self-consumed solar = production - export
      var selfConsumedSolar = Math.max(0, balance.production - balance.export);
      var solarPct = (selfConsumedSolar / total) * 100;
      var batteryPct = (balance.batteryDischarge / total) * 100;
      var importPct = (balance.import / total) * 100;

      // Normalize to 100% if needed
      var sumPct = solarPct + batteryPct + importPct;
      if (sumPct > 0) {
        solarPct = (solarPct / sumPct) * 100;
        batteryPct = (batteryPct / sumPct) * 100;
        importPct = (importPct / sumPct) * 100;
      }

      if (solarPct > 0) {
        bar.appendChild(createBarSegment(solarPct, 'var(--solar)', 'Solar'));
      }
      if (batteryPct > 0) {
        bar.appendChild(createBarSegment(batteryPct, 'var(--battery-discharge)', 'Battery'));
      }
      if (importPct > 0) {
        bar.appendChild(createBarSegment(importPct, 'var(--grid-import)', 'Grid'));
      }
    }

    container.appendChild(bar);

    // --- Badges ---
    var badges = document.createElement('div');
    badges.className = 'energy-balance__badges';

    var selfConsumptionBadge = document.createElement('div');
    selfConsumptionBadge.className = 'energy-balance__badge';
    selfConsumptionBadge.innerHTML =
      '<span class="energy-balance__badge-label">Self-consumption</span>' +
      '<span class="energy-balance__badge-value">' +
      Math.round(balance.selfConsumption) +
      '%</span>';

    var selfSufficiencyBadge = document.createElement('div');
    selfSufficiencyBadge.className = 'energy-balance__badge';
    selfSufficiencyBadge.innerHTML =
      '<span class="energy-balance__badge-label">Self-sufficiency</span>' +
      '<span class="energy-balance__badge-value">' +
      Math.round(balance.selfSufficiency) +
      '%</span>';

    badges.appendChild(selfConsumptionBadge);
    badges.appendChild(selfSufficiencyBadge);
    container.appendChild(badges);

    // --- Summary line ---
    var summary = document.createElement('div');
    summary.className = 'energy-balance__summary';

    var solarSpan = document.createElement('span');
    solarSpan.textContent = 'Solar: ' + balance.production.toFixed(1) + ' kWh produced';

    var exportSpan = document.createElement('span');
    exportSpan.textContent = '\u2191 ' + balance.export.toFixed(1) + ' kWh exported';

    var importSpan = document.createElement('span');
    importSpan.textContent = '\u2193 ' + balance.import.toFixed(1) + ' kWh imported';

    summary.appendChild(solarSpan);
    summary.appendChild(exportSpan);
    summary.appendChild(importSpan);
    container.appendChild(summary);

    section.appendChild(container);
  }

  /**
   * Main entry point: compute the energy balance from series data
   * and render it into the DOM.
   *
   * @param {Object} seriesData - Sungrow series day response.
   */
  function update(seriesData) {
    if (!seriesData || !seriesData.series) {
      return;
    }
    var balance = computeBalance(seriesData);
    renderBalance(balance);
  }

  // Public API
  return {
    computeBalance: computeBalance,
    renderBalance: renderBalance,
    update: update,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnergyBalance;
}
