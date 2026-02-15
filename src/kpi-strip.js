/**
 * KPI Strip module for the Energy Dashboard.
 * Updates the four KPI cards (Grid, Battery, Solar Today, Month Peak)
 * with real-time data from the P1 and Sungrow APIs.
 *
 * STORY-008: KPI Strip Cards
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-008)
 */

// eslint-disable-next-line no-unused-vars
const KpiStrip = (() => {
  /**
   * Format a power value in watts for KPI display.
   * Returns an object with separate value and unit strings so the
   * caller can wrap the unit in a styled <span>.
   *
   * - < 1000W: { value: "XXX", unit: "W" }
   * - >= 1000W: { value: "X.X", unit: "kW" }
   *
   * @param {number} watts - Power value in watts (absolute).
   * @returns {{ value: string, unit: string }} Formatted value and unit.
   */
  function formatKpiPower(watts) {
    var absW = Math.abs(watts);
    if (absW >= 1000) {
      return { value: (absW / 1000).toFixed(1), unit: 'kW' };
    }
    return { value: String(Math.round(absW)), unit: 'W' };
  }

  /**
   * Format a timestamp string as "Mon DD, HH:MM".
   *
   * @param {string} tsString - ISO-ish timestamp, e.g. "2026-02-12T17:45:00".
   * @returns {string} Formatted string, e.g. "Feb 12, 17:45".
   */
  function formatPeakTimestamp(tsString) {
    if (!tsString) {
      return '';
    }
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    var d = new Date(tsString);
    if (isNaN(d.getTime())) {
      return '';
    }
    var mon = months[d.getMonth()];
    var day = d.getDate();
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    return mon + ' ' + day + ', ' + hours + ':' + minutes;
  }

  /**
   * Update the Grid KPI card with P1 realtime data.
   *
   * - Value: formatted power from p1Data.power_w
   * - Subtext: "importing" (coral) when power_w > 0,
   *            "exporting" (green) when power_w < 0
   *
   * @param {Object} p1Data - P1 realtime data with power_w.
   */
  function updateGridCard(p1Data) {
    var valueEl = document.querySelector('.kpi-card--grid .kpi-card__value');
    var subtextEl = document.querySelector('.kpi-card--grid .kpi-card__subtext');
    if (!valueEl || !subtextEl) {
      return;
    }

    var formatted = formatKpiPower(p1Data.power_w);
    valueEl.innerHTML =
      formatted.value + '<span class="kpi-card__unit"> ' + formatted.unit + '</span>';

    if (p1Data.power_w > 0) {
      subtextEl.textContent = 'importing';
      subtextEl.setAttribute('style', 'color: var(--grid-import)');
    } else if (p1Data.power_w < 0) {
      subtextEl.textContent = 'exporting';
      subtextEl.setAttribute('style', 'color: var(--grid-export)');
    } else {
      subtextEl.textContent = 'idle';
      subtextEl.removeAttribute('style');
    }
  }

  /**
   * Update the Battery KPI card with Sungrow realtime data.
   *
   * - Value: rounded SoC percentage
   * - Subtext: "charging X.X kW" when battery_power_w > 0,
   *            "discharging X.X kW" when < 0, "idle" when 0
   *
   * @param {Object} sungrowData - Sungrow realtime data with battery_soc_pct and battery_power_w.
   */
  function updateBatteryCard(sungrowData) {
    var valueEl = document.querySelector('.kpi-card--battery .kpi-card__value');
    var subtextEl = document.querySelector('.kpi-card--battery .kpi-card__subtext');
    if (!valueEl || !subtextEl) {
      return;
    }

    valueEl.textContent = Math.round(sungrowData.battery_soc_pct) + '%';

    var absPowerKw = (Math.abs(sungrowData.battery_power_w) / 1000).toFixed(1);
    if (sungrowData.battery_power_w > 0) {
      subtextEl.textContent = 'charging ' + absPowerKw + ' kW';
    } else if (sungrowData.battery_power_w < 0) {
      subtextEl.textContent = 'discharging ' + absPowerKw + ' kW';
    } else {
      subtextEl.textContent = 'idle';
    }
  }

  /**
   * Update the Solar Today KPI card with Sungrow realtime data.
   *
   * - Value: cumulative kWh from pv_daily_kwh (1 decimal)
   * - Subtext: "producing X.X kW" (current pv_power_w)
   *
   * @param {Object} sungrowData - Sungrow realtime data with pv_daily_kwh and pv_power_w.
   */
  function updateSolarCard(sungrowData) {
    var valueEl = document.querySelector('.kpi-card--solar .kpi-card__value');
    var subtextEl = document.querySelector('.kpi-card--solar .kpi-card__subtext');
    if (!valueEl || !subtextEl) {
      return;
    }

    valueEl.innerHTML =
      sungrowData.pv_daily_kwh.toFixed(1) + '<span class="kpi-card__unit"> kWh</span>';

    var currentKw = (sungrowData.pv_power_w / 1000).toFixed(1);
    subtextEl.textContent = 'producing ' + currentKw + ' kW';
  }

  /**
   * Update the Month Peak KPI card with P1 capacity data.
   *
   * - Value: monthly_peak_w formatted as kW (1 decimal)
   * - Subtext: timestamp of peak occurrence formatted as "Mon DD, HH:MM"
   *
   * @param {Object} capacityData - P1 capacity data with monthly_peak_w and monthly_peak_ts.
   */
  function updatePeakCard(capacityData) {
    var valueEl = document.querySelector('.kpi-card--peak .kpi-card__value');
    var subtextEl = document.querySelector('.kpi-card--peak .kpi-card__subtext');
    if (!valueEl || !subtextEl) {
      return;
    }

    var peakKw = (capacityData.monthly_peak_w / 1000).toFixed(1);
    valueEl.innerHTML = peakKw + '<span class="kpi-card__unit"> kW</span>';

    var formattedTs = formatPeakTimestamp(capacityData.monthly_peak_ts);
    subtextEl.textContent = formattedTs;
  }

  /**
   * Update all four KPI cards. Handles null data gracefully by
   * skipping update for any card whose data source is null.
   *
   * @param {Object|null} p1Data - P1 realtime data (for Grid card).
   * @param {Object|null} sungrowData - Sungrow realtime data (for Battery and Solar cards).
   * @param {Object|null} capacityData - P1 capacity data (for Peak card).
   */
  function updateAll(p1Data, sungrowData, capacityData) {
    if (p1Data) {
      updateGridCard(p1Data);
    }
    if (sungrowData) {
      updateBatteryCard(sungrowData);
      updateSolarCard(sungrowData);
    }
    if (capacityData) {
      updatePeakCard(capacityData);
    }
  }

  // Public API
  return {
    formatKpiPower: formatKpiPower,
    formatPeakTimestamp: formatPeakTimestamp,
    updateGridCard: updateGridCard,
    updateBatteryCard: updateBatteryCard,
    updateSolarCard: updateSolarCard,
    updatePeakCard: updatePeakCard,
    updateAll: updateAll,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KpiStrip;
}
