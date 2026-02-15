/**
 * Tests for KPI Strip module (STORY-008).
 *
 * Validates power formatting, card subtext logic, solar value formatting,
 * and peak card formatting with DOM assertions.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-008)
 */

const KpiStrip = require('../src/kpi-strip.js');

describe('KpiStrip', () => {
  // ---- formatKpiPower ----

  describe('formatKpiPower', () => {
    test('returns watts for values below 1000', () => {
      var result = KpiStrip.formatKpiPower(450);
      expect(result).toEqual({ value: '450', unit: 'W' });
    });

    test('returns 0 W for zero', () => {
      var result = KpiStrip.formatKpiPower(0);
      expect(result).toEqual({ value: '0', unit: 'W' });
    });

    test('returns watts for 999', () => {
      var result = KpiStrip.formatKpiPower(999);
      expect(result).toEqual({ value: '999', unit: 'W' });
    });

    test('returns kW for 1000', () => {
      var result = KpiStrip.formatKpiPower(1000);
      expect(result).toEqual({ value: '1.0', unit: 'kW' });
    });

    test('returns kW for 3450', () => {
      var result = KpiStrip.formatKpiPower(3450);
      expect(result).toEqual({ value: '3.5', unit: 'kW' });
    });

    test('returns kW for 5100', () => {
      var result = KpiStrip.formatKpiPower(5100);
      expect(result).toEqual({ value: '5.1', unit: 'kW' });
    });

    test('uses absolute value for negative watts', () => {
      var result = KpiStrip.formatKpiPower(-1200);
      expect(result).toEqual({ value: '1.2', unit: 'kW' });
    });

    test('returns watts for small negative value', () => {
      var result = KpiStrip.formatKpiPower(-250);
      expect(result).toEqual({ value: '250', unit: 'W' });
    });
  });

  // ---- formatPeakTimestamp ----

  describe('formatPeakTimestamp', () => {
    test('formats ISO timestamp as "Mon DD, HH:MM"', () => {
      var result = KpiStrip.formatPeakTimestamp('2026-02-12T17:45:00');
      expect(result).toBe('Feb 12, 17:45');
    });

    test('returns empty string for null', () => {
      expect(KpiStrip.formatPeakTimestamp(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(KpiStrip.formatPeakTimestamp(undefined)).toBe('');
    });

    test('returns empty string for invalid date', () => {
      expect(KpiStrip.formatPeakTimestamp('not-a-date')).toBe('');
    });
  });

  // ---- Grid card: updateGridCard ----

  describe('updateGridCard', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML =
        '<div class="kpi-card kpi-card--grid">' +
        '  <div class="kpi-card__label">Grid</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> W</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('shows "importing" for positive power_w', () => {
      KpiStrip.updateGridCard({ power_w: 450 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('importing');
      expect(subtext.getAttribute('style')).toContain('--grid-import');
    });

    test('shows "exporting" for negative power_w', () => {
      KpiStrip.updateGridCard({ power_w: -750 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('exporting');
      expect(subtext.getAttribute('style')).toContain('--grid-export');
    });

    test('shows "idle" for zero power_w', () => {
      KpiStrip.updateGridCard({ power_w: 0 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('idle');
    });

    test('formats power value with correct unit', () => {
      KpiStrip.updateGridCard({ power_w: 3450 });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toContain('3.5');
      expect(valueEl.textContent).toContain('kW');
    });

    test('formats small power value in watts', () => {
      KpiStrip.updateGridCard({ power_w: 450 });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toContain('450');
      expect(valueEl.textContent).toContain('W');
    });
  });

  // ---- Battery card: updateBatteryCard ----

  describe('updateBatteryCard', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML =
        '<div class="kpi-card kpi-card--battery">' +
        '  <div class="kpi-card__label">Battery</div>' +
        '  <div class="kpi-card__value">--%</div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('shows SoC percentage as rounded integer', () => {
      KpiStrip.updateBatteryCard({ battery_soc_pct: 85.3, battery_power_w: 0 });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toBe('85%');
    });

    test('shows "charging X.X kW" for positive battery_power_w', () => {
      KpiStrip.updateBatteryCard({ battery_soc_pct: 60, battery_power_w: 1500 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('charging 1.5 kW');
    });

    test('shows "discharging X.X kW" for negative battery_power_w', () => {
      KpiStrip.updateBatteryCard({ battery_soc_pct: 80, battery_power_w: -1200 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('discharging 1.2 kW');
    });

    test('shows "idle" for zero battery_power_w', () => {
      KpiStrip.updateBatteryCard({ battery_soc_pct: 50, battery_power_w: 0 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('idle');
    });
  });

  // ---- Solar card: updateSolarCard ----

  describe('updateSolarCard', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML =
        '<div class="kpi-card kpi-card--solar">' +
        '  <div class="kpi-card__label">Solar Today</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> kWh</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('shows pv_daily_kwh with one decimal', () => {
      KpiStrip.updateSolarCard({ pv_daily_kwh: 12.3, pv_power_w: 3450 });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toContain('12.3');
      expect(valueEl.textContent).toContain('kWh');
    });

    test('shows "producing X.X kW" in subtext', () => {
      KpiStrip.updateSolarCard({ pv_daily_kwh: 12.3, pv_power_w: 3450 });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('producing 3.5 kW');
    });

    test('shows zero production correctly', () => {
      KpiStrip.updateSolarCard({ pv_daily_kwh: 0.0, pv_power_w: 0 });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toContain('0.0');
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('producing 0.0 kW');
    });
  });

  // ---- Peak card: updatePeakCard ----

  describe('updatePeakCard', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML =
        '<div class="kpi-card kpi-card--peak">' +
        '  <div class="kpi-card__label">Month Peak</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> kW</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('formats monthly_peak_w as kW with one decimal', () => {
      KpiStrip.updatePeakCard({
        monthly_peak_w: 5100,
        monthly_peak_ts: '2026-02-12T17:45:00',
      });
      var valueEl = container.querySelector('.kpi-card__value');
      expect(valueEl.textContent).toContain('5.1');
      expect(valueEl.textContent).toContain('kW');
    });

    test('shows formatted timestamp in subtext', () => {
      KpiStrip.updatePeakCard({
        monthly_peak_w: 5100,
        monthly_peak_ts: '2026-02-12T17:45:00',
      });
      var subtext = container.querySelector('.kpi-card__subtext');
      expect(subtext.textContent).toBe('Feb 12, 17:45');
    });
  });

  // ---- updateAll ----

  describe('updateAll', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML =
        '<div class="kpi-card kpi-card--grid">' +
        '  <div class="kpi-card__label">Grid</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> W</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>' +
        '<div class="kpi-card kpi-card--battery">' +
        '  <div class="kpi-card__label">Battery</div>' +
        '  <div class="kpi-card__value">--%</div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>' +
        '<div class="kpi-card kpi-card--solar">' +
        '  <div class="kpi-card__label">Solar Today</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> kWh</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>' +
        '<div class="kpi-card kpi-card--peak">' +
        '  <div class="kpi-card__label">Month Peak</div>' +
        '  <div class="kpi-card__value">--<span class="kpi-card__unit"> kW</span></div>' +
        '  <div class="kpi-card__subtext">Waiting for data</div>' +
        '</div>';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('updates all four cards when all data is provided', () => {
      var p1Data = { power_w: 450 };
      var sungrowData = {
        battery_soc_pct: 85,
        battery_power_w: -1200,
        pv_daily_kwh: 12.3,
        pv_power_w: 3450,
      };
      var capacityData = {
        monthly_peak_w: 5100,
        monthly_peak_ts: '2026-02-12T17:45:00',
      };
      KpiStrip.updateAll(p1Data, sungrowData, capacityData);

      // Grid card updated
      var gridSubtext = container.querySelector('.kpi-card--grid .kpi-card__subtext');
      expect(gridSubtext.textContent).toBe('importing');

      // Battery card updated
      var batteryValue = container.querySelector('.kpi-card--battery .kpi-card__value');
      expect(batteryValue.textContent).toBe('85%');

      // Solar card updated
      var solarValue = container.querySelector('.kpi-card--solar .kpi-card__value');
      expect(solarValue.textContent).toContain('12.3');

      // Peak card updated
      var peakValue = container.querySelector('.kpi-card--peak .kpi-card__value');
      expect(peakValue.textContent).toContain('5.1');
    });

    test('skips grid card when p1Data is null', () => {
      KpiStrip.updateAll(
        null,
        { battery_soc_pct: 85, battery_power_w: 0, pv_daily_kwh: 12.3, pv_power_w: 3450 },
        null
      );
      var gridSubtext = container.querySelector('.kpi-card--grid .kpi-card__subtext');
      expect(gridSubtext.textContent).toBe('Waiting for data');
    });

    test('skips battery and solar cards when sungrowData is null', () => {
      KpiStrip.updateAll({ power_w: 450 }, null, null);
      var batteryValue = container.querySelector('.kpi-card--battery .kpi-card__value');
      expect(batteryValue.textContent).toBe('--%');
    });

    test('skips peak card when capacityData is null', () => {
      KpiStrip.updateAll(
        { power_w: 450 },
        { battery_soc_pct: 85, battery_power_w: 0, pv_daily_kwh: 12.3, pv_power_w: 3450 },
        null
      );
      var peakSubtext = container.querySelector('.kpi-card--peak .kpi-card__subtext');
      expect(peakSubtext.textContent).toBe('Waiting for data');
    });

    test('does not throw when all data is null', () => {
      expect(() => {
        KpiStrip.updateAll(null, null, null);
      }).not.toThrow();
    });
  });
});
