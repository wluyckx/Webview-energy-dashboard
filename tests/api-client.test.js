/**
 * Tests for ApiClient module (src/api-client.js).
 *
 * STORY-003: API Client with Authentication
 * TDD: Tests written FIRST, before implementation.
 *
 * CHANGELOG:
 * - 2026-02-15: Add staleness tracking tests (STORY-013)
 * - 2026-02-15: Add mock mode tests (STORY-004)
 * - 2026-02-15: Initial test suite (STORY-003)
 */

const ApiClient = require('../src/api-client.js');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const p1RealtimeFixture = require('./fixtures/p1-realtime.json');
const sungrowRealtimeFixture = require('./fixtures/sungrow-realtime.json');
const sungrowSeriesDayFixture = require('./fixtures/sungrow-series-day.json');
const p1CapacityFixture = require('./fixtures/p1-capacity.json');

// ---------------------------------------------------------------------------
// Helper: build a config object matching Config.getConfig() shape
// ---------------------------------------------------------------------------
function makeConfig(overrides = {}) {
  return Object.assign(
    {
      p1_base: 'https://api.p1.wimluyckx.dev',
      sungrow_base: 'https://api.sungrow.wimluyckx.dev',
      p1_device_id: 'device-p1-001',
      sungrow_device_id: 'device-sg-001',
      p1_token: 'bearer-token-p1',
      sungrow_token: 'bearer-token-sg',
      mock: false,
    },
    overrides
  );
}

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
let fetchMock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  // Reset the internal cache and staleness state between tests
  if (typeof ApiClient._resetCache === 'function') {
    ApiClient._resetCache();
  }
  if (typeof ApiClient._resetState === 'function') {
    ApiClient._resetState();
  }
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

// ---------------------------------------------------------------------------
// Helper: create a successful Response mock
// ---------------------------------------------------------------------------
function mockFetchSuccess(data) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

// ---------------------------------------------------------------------------
// Helper: create a non-200 Response mock
// ---------------------------------------------------------------------------
function mockFetchNon200(status) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: status,
    json: () => Promise.resolve({ error: 'server error' }),
  });
}

// ---------------------------------------------------------------------------
// Helper: create a network error mock
// ---------------------------------------------------------------------------
function mockFetchNetworkError() {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

// ===========================================================================
// 1. Successful fetch returns parsed JSON
// ===========================================================================
describe('successful fetch returns parsed JSON', () => {
  test('fetchP1Realtime returns parsed JSON from P1 /v1/realtime', async () => {
    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    const result = await ApiClient.fetchP1Realtime(config);
    expect(result).toEqual(p1RealtimeFixture);
  });

  test('fetchP1Series returns parsed JSON from P1 /v1/series', async () => {
    const seriesFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    const result = await ApiClient.fetchP1Series(config, 'day');
    expect(result).toEqual(seriesFixture);
  });

  test('fetchP1Capacity returns parsed JSON from P1 /v1/capacity/month', async () => {
    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    const result = await ApiClient.fetchP1Capacity(config, '2026-02');
    expect(result).toEqual(p1CapacityFixture);
  });

  test('fetchSungrowRealtime returns parsed JSON from Sungrow /v1/realtime', async () => {
    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    const result = await ApiClient.fetchSungrowRealtime(config);
    expect(result).toEqual(sungrowRealtimeFixture);
  });

  test('fetchSungrowSeries returns parsed JSON from Sungrow /v1/series', async () => {
    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    const result = await ApiClient.fetchSungrowSeries(config, 'day');
    expect(result).toEqual(sungrowSeriesDayFixture);
  });

  test('checkP1Health returns parsed JSON from P1 /health', async () => {
    const healthFixture = { status: 'ok' };
    mockFetchSuccess(healthFixture);
    const config = makeConfig();
    const result = await ApiClient.checkP1Health(config);
    expect(result).toEqual(healthFixture);
  });

  test('checkSungrowHealth returns parsed JSON from Sungrow /health', async () => {
    const healthFixture = { status: 'ok' };
    mockFetchSuccess(healthFixture);
    const config = makeConfig();
    const result = await ApiClient.checkSungrowHealth(config);
    expect(result).toEqual(healthFixture);
  });
});

// ===========================================================================
// 2. Authorization: Bearer header is set correctly
// ===========================================================================
describe('Authorization: Bearer header is set correctly', () => {
  test('fetchP1Realtime sends Bearer p1_token', async () => {
    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe('https://api.p1.wimluyckx.dev/v1/realtime?device_id=device-p1-001');
    expect(options.headers.Authorization).toBe('Bearer bearer-token-p1');
  });

  test('fetchP1Series sends Bearer p1_token', async () => {
    const seriesFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Series(config, 'day');

    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe('https://api.p1.wimluyckx.dev/v1/series?device_id=device-p1-001&frame=day');
    expect(options.headers.Authorization).toBe('Bearer bearer-token-p1');
  });

  test('fetchP1Capacity sends Bearer p1_token', async () => {
    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Capacity(config, '2026-02');

    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe(
      'https://api.p1.wimluyckx.dev/v1/capacity/month/2026-02?device_id=device-p1-001'
    );
    expect(options.headers.Authorization).toBe('Bearer bearer-token-p1');
  });

  test('fetchSungrowRealtime sends Bearer sungrow_token', async () => {
    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowRealtime(config);

    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe('https://api.sungrow.wimluyckx.dev/v1/realtime?device_id=device-sg-001');
    expect(options.headers.Authorization).toBe('Bearer bearer-token-sg');
  });

  test('fetchSungrowSeries sends Bearer sungrow_token', async () => {
    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowSeries(config, 'day');

    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe(
      'https://api.sungrow.wimluyckx.dev/v1/series?device_id=device-sg-001&frame=day'
    );
    expect(options.headers.Authorization).toBe('Bearer bearer-token-sg');
  });
});

// ===========================================================================
// 3. Network error returns cached last-known value
// ===========================================================================
describe('network error returns cached last-known value', () => {
  test('fetchP1Realtime returns cached value on network error', async () => {
    // First call succeeds — populates cache
    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    // Second call fails with network error
    mockFetchNetworkError();
    const result = await ApiClient.fetchP1Realtime(config);

    expect(result).toEqual(p1RealtimeFixture);
  });

  test('fetchSungrowRealtime returns cached value on network error', async () => {
    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowRealtime(config);

    mockFetchNetworkError();
    const result = await ApiClient.fetchSungrowRealtime(config);

    expect(result).toEqual(sungrowRealtimeFixture);
  });

  test('fetchSungrowSeries returns cached value on network error', async () => {
    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowSeries(config, 'day');

    mockFetchNetworkError();
    const result = await ApiClient.fetchSungrowSeries(config, 'day');

    expect(result).toEqual(sungrowSeriesDayFixture);
  });

  test('fetchP1Capacity returns cached value on network error', async () => {
    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Capacity(config, '2026-02');

    mockFetchNetworkError();
    const result = await ApiClient.fetchP1Capacity(config, '2026-02');

    expect(result).toEqual(p1CapacityFixture);
  });

  test('fetchP1Series returns cached value on network error', async () => {
    const seriesFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Series(config, 'day');

    mockFetchNetworkError();
    const result = await ApiClient.fetchP1Series(config, 'day');

    expect(result).toEqual(seriesFixture);
  });
});

// ===========================================================================
// 4. Timeout after 30s returns cached last-known value
// ===========================================================================
describe('timeout after 30s returns cached last-known value', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fetchP1Realtime returns cached value when fetch times out', async () => {
    // First call succeeds — populates cache
    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    // Second call: simulate a fetch that never resolves until abort
    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        };
        if (options && options.signal) {
          options.signal.addEventListener('abort', onAbort);
        }
      });
    });

    const resultPromise = ApiClient.fetchP1Realtime(config);

    // Advance timers by 30 seconds to trigger the AbortController timeout
    jest.advanceTimersByTime(30000);

    const result = await resultPromise;
    expect(result).toEqual(p1RealtimeFixture);
  });

  test('fetchSungrowRealtime returns cached value when fetch times out', async () => {
    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowRealtime(config);

    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        };
        if (options && options.signal) {
          options.signal.addEventListener('abort', onAbort);
        }
      });
    });

    const resultPromise = ApiClient.fetchSungrowRealtime(config);
    jest.advanceTimersByTime(30000);

    const result = await resultPromise;
    expect(result).toEqual(sungrowRealtimeFixture);
  });
});

// ===========================================================================
// 5. Non-200 status returns cached last-known value
// ===========================================================================
describe('non-200 status returns cached last-known value', () => {
  test('fetchP1Realtime returns cached value on 500 status', async () => {
    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    mockFetchNon200(500);
    const result = await ApiClient.fetchP1Realtime(config);

    expect(result).toEqual(p1RealtimeFixture);
  });

  test('fetchSungrowRealtime returns cached value on 503 status', async () => {
    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowRealtime(config);

    mockFetchNon200(503);
    const result = await ApiClient.fetchSungrowRealtime(config);

    expect(result).toEqual(sungrowRealtimeFixture);
  });

  test('fetchSungrowSeries returns cached value on 404 status', async () => {
    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowSeries(config, 'day');

    mockFetchNon200(404);
    const result = await ApiClient.fetchSungrowSeries(config, 'day');

    expect(result).toEqual(sungrowSeriesDayFixture);
  });

  test('fetchP1Capacity returns cached value on 500 status', async () => {
    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Capacity(config, '2026-02');

    mockFetchNon200(500);
    const result = await ApiClient.fetchP1Capacity(config, '2026-02');

    expect(result).toEqual(p1CapacityFixture);
  });

  test('fetchP1Series returns cached value on 500 status', async () => {
    const seriesFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Series(config, 'day');

    mockFetchNon200(500);
    const result = await ApiClient.fetchP1Series(config, 'day');

    expect(result).toEqual(seriesFixture);
  });
});

// ===========================================================================
// 6. First failure with no cache returns null
// ===========================================================================
describe('first failure with no cache returns null', () => {
  test('fetchP1Realtime returns null on first network error', async () => {
    mockFetchNetworkError();
    const config = makeConfig();
    const result = await ApiClient.fetchP1Realtime(config);
    expect(result).toBeNull();
  });

  test('fetchSungrowRealtime returns null on first network error', async () => {
    mockFetchNetworkError();
    const config = makeConfig();
    const result = await ApiClient.fetchSungrowRealtime(config);
    expect(result).toBeNull();
  });

  test('fetchSungrowSeries returns null on first non-200', async () => {
    mockFetchNon200(500);
    const config = makeConfig();
    const result = await ApiClient.fetchSungrowSeries(config, 'day');
    expect(result).toBeNull();
  });

  test('fetchP1Capacity returns null on first network error', async () => {
    mockFetchNetworkError();
    const config = makeConfig();
    const result = await ApiClient.fetchP1Capacity(config, '2026-02');
    expect(result).toBeNull();
  });

  test('fetchP1Series returns null on first non-200', async () => {
    mockFetchNon200(500);
    const config = makeConfig();
    const result = await ApiClient.fetchP1Series(config, 'day');
    expect(result).toBeNull();
  });
});

// ===========================================================================
// 7. Health endpoints do NOT include auth header
// ===========================================================================
describe('health endpoints do NOT include auth header', () => {
  test('checkP1Health does not send Authorization header', async () => {
    mockFetchSuccess({ status: 'ok' });
    const config = makeConfig();
    await ApiClient.checkP1Health(config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe('https://api.p1.wimluyckx.dev/health');
    // No Authorization header should be present
    expect(options.headers).toBeUndefined();
  });

  test('checkSungrowHealth does not send Authorization header', async () => {
    mockFetchSuccess({ status: 'ok' });
    const config = makeConfig();
    await ApiClient.checkSungrowHealth(config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];
    expect(url).toBe('https://api.sungrow.wimluyckx.dev/health');
    expect(options.headers).toBeUndefined();
  });
});

// ===========================================================================
// Additional: URL construction correctness
// ===========================================================================
describe('URL construction', () => {
  test('fetchP1Series constructs correct URL with frame parameter', async () => {
    const seriesFixture = { device_id: 'p1-meter-01', frame: 'week', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Series(config, 'week');

    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe('https://api.p1.wimluyckx.dev/v1/series?device_id=device-p1-001&frame=week');
  });

  test('fetchP1Capacity constructs correct URL with month parameter', async () => {
    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Capacity(config, '2026-03');

    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe(
      'https://api.p1.wimluyckx.dev/v1/capacity/month/2026-03?device_id=device-p1-001'
    );
  });

  test('fetchSungrowSeries constructs correct URL with frame parameter', async () => {
    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowSeries(config, 'month');

    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe(
      'https://api.sungrow.wimluyckx.dev/v1/series?device_id=device-sg-001&frame=month'
    );
  });
});

// ===========================================================================
// Additional: Series/Capacity cache is keyed by extra param
// ===========================================================================
describe('cache is keyed by extra parameter for series/capacity', () => {
  test('fetchSungrowSeries caches separately per frame', async () => {
    const dayFixture = { device_id: 'inverter-01', frame: 'day', series: [{ bucket: 'day-data' }] };
    const weekFixture = {
      device_id: 'inverter-01',
      frame: 'week',
      series: [{ bucket: 'week-data' }],
    };
    const config = makeConfig();

    // Populate day cache
    mockFetchSuccess(dayFixture);
    await ApiClient.fetchSungrowSeries(config, 'day');

    // Populate week cache
    mockFetchSuccess(weekFixture);
    await ApiClient.fetchSungrowSeries(config, 'week');

    // Day fails => returns day cache, not week cache
    mockFetchNetworkError();
    const dayResult = await ApiClient.fetchSungrowSeries(config, 'day');
    expect(dayResult).toEqual(dayFixture);

    // Week fails => returns week cache, not day cache
    mockFetchNetworkError();
    const weekResult = await ApiClient.fetchSungrowSeries(config, 'week');
    expect(weekResult).toEqual(weekFixture);
  });

  test('fetchP1Series caches separately per frame', async () => {
    const dayFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    const monthFixture = { device_id: 'p1-meter-01', frame: 'month', series: [] };
    const config = makeConfig();

    mockFetchSuccess(dayFixture);
    await ApiClient.fetchP1Series(config, 'day');

    mockFetchSuccess(monthFixture);
    await ApiClient.fetchP1Series(config, 'month');

    mockFetchNetworkError();
    const dayResult = await ApiClient.fetchP1Series(config, 'day');
    expect(dayResult).toEqual(dayFixture);

    mockFetchNetworkError();
    const monthResult = await ApiClient.fetchP1Series(config, 'month');
    expect(monthResult).toEqual(monthFixture);
  });

  test('fetchP1Capacity caches separately per month', async () => {
    const febFixture = {
      device_id: 'p1-meter-01',
      month: '2026-02',
      peaks: [],
      monthly_peak_w: 5100,
    };
    const marFixture = {
      device_id: 'p1-meter-01',
      month: '2026-03',
      peaks: [],
      monthly_peak_w: 3200,
    };
    const config = makeConfig();

    mockFetchSuccess(febFixture);
    await ApiClient.fetchP1Capacity(config, '2026-02');

    mockFetchSuccess(marFixture);
    await ApiClient.fetchP1Capacity(config, '2026-03');

    mockFetchNetworkError();
    const febResult = await ApiClient.fetchP1Capacity(config, '2026-02');
    expect(febResult).toEqual(febFixture);

    mockFetchNetworkError();
    const marResult = await ApiClient.fetchP1Capacity(config, '2026-03');
    expect(marResult).toEqual(marFixture);
  });
});

// ===========================================================================
// Mock mode: config.mock = true returns mock data without calling fetch
// ===========================================================================
describe('mock mode (config.mock = true)', () => {
  // Make MockData available as a global so the ApiClient IIFE can reference it
  beforeAll(() => {
    global.MockData = require('../src/mock-data.js');
  });

  afterAll(() => {
    delete global.MockData;
  });

  test('fetchP1Realtime returns mock data without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.fetchP1Realtime(config);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toHaveProperty('device_id', 'p1-meter-01');
    expect(result).toHaveProperty('ts');
    expect(result).toHaveProperty('power_w');
    expect(result).toHaveProperty('import_power_w');
    expect(result).toHaveProperty('energy_import_kwh');
    expect(result).toHaveProperty('energy_export_kwh');
  });

  test('fetchSungrowRealtime returns mock data without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.fetchSungrowRealtime(config);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toHaveProperty('device_id', 'inverter-01');
    expect(result).toHaveProperty('ts');
    expect(result).toHaveProperty('pv_power_w');
    expect(result).toHaveProperty('battery_soc_pct');
    expect(result).toHaveProperty('load_power_w');
  });

  test('checkP1Health returns mock health without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.checkP1Health(config);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  test('checkSungrowHealth returns mock health without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.checkSungrowHealth(config);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  test('fetchP1Series returns mock series data without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.fetchP1Series(config, 'day');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toHaveProperty('device_id');
    expect(result).toHaveProperty('frame');
    expect(result).toHaveProperty('series');
    expect(Array.isArray(result.series)).toBe(true);
  });

  test('fetchSungrowSeries returns mock series data without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.fetchSungrowSeries(config, 'day');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toHaveProperty('device_id');
    expect(result).toHaveProperty('frame');
    expect(result).toHaveProperty('series');
  });

  test('fetchP1Capacity returns mock capacity data without calling fetch', async () => {
    const config = makeConfig({ mock: true });
    const result = await ApiClient.fetchP1Capacity(config, '2026-02');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toHaveProperty('device_id', 'p1-meter-01');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('peaks');
    expect(result).toHaveProperty('monthly_peak_w');
  });
});

// ===========================================================================
// STORY-013: Staleness tracking
// ===========================================================================
describe('staleness tracking', () => {
  let originalDateNow;

  beforeEach(() => {
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('getLastSuccessTime returns 0 initially', () => {
    expect(ApiClient.getLastSuccessTime('p1')).toBe(0);
    expect(ApiClient.getLastSuccessTime('sungrow')).toBe(0);
  });

  test('getLastSuccessTime returns timestamp after successful P1 fetch', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    expect(ApiClient.getLastSuccessTime('p1')).toBe(now);
  });

  test('getLastSuccessTime returns timestamp after successful Sungrow fetch', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    mockFetchSuccess(sungrowRealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowRealtime(config);

    expect(ApiClient.getLastSuccessTime('sungrow')).toBe(now);
  });

  test('isStale returns false immediately after successful fetch', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    // Still at the same time — should not be stale
    expect(ApiClient.isStale('p1')).toBe(false);
  });

  test('isStale returns true after 30+ seconds with default threshold', async () => {
    const startTime = 1700000000000;
    Date.now = jest.fn(() => startTime);

    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    // Advance time by 31 seconds
    Date.now = jest.fn(() => startTime + 31000);

    expect(ApiClient.isStale('p1')).toBe(true);
  });

  test('isStale returns false within custom threshold', async () => {
    const startTime = 1700000000000;
    Date.now = jest.fn(() => startTime);

    mockFetchSuccess(p1RealtimeFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Realtime(config);

    // 15 seconds later, using 60s threshold
    Date.now = jest.fn(() => startTime + 15000);

    expect(ApiClient.isStale('p1', 60000)).toBe(false);
  });

  test('isStale returns true when lastSuccessTime is 0 (never fetched)', () => {
    // Never fetched — lastSuccessTime is 0, so elapsed is huge
    expect(ApiClient.isStale('p1')).toBe(true);
    expect(ApiClient.isStale('sungrow')).toBe(true);
  });

  test('consecutiveFailures increments on failure', async () => {
    const config = makeConfig();

    expect(ApiClient.getConsecutiveFailures('p1')).toBe(0);

    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(1);

    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(2);

    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(3);
  });

  test('consecutiveFailures resets on success', async () => {
    const config = makeConfig();

    // Accumulate failures
    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(2);

    // Success resets the count
    mockFetchSuccess(p1RealtimeFixture);
    await ApiClient.fetchP1Realtime(config);
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(0);
  });

  test('isOffline returns false initially', () => {
    expect(ApiClient.isOffline()).toBe(false);
  });

  test('isOffline returns true when both p1 and sungrow have 3+ failures', async () => {
    const config = makeConfig();

    // 3 P1 failures
    for (let i = 0; i < 3; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchP1Realtime(config);
    }

    // 3 Sungrow failures
    for (let i = 0; i < 3; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchSungrowRealtime(config);
    }

    expect(ApiClient.isOffline()).toBe(true);
  });

  test('isOffline returns false when only one source has 3+ failures', async () => {
    const config = makeConfig();

    // 3 P1 failures
    for (let i = 0; i < 3; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchP1Realtime(config);
    }

    // Only 2 Sungrow failures
    for (let i = 0; i < 2; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchSungrowRealtime(config);
    }

    expect(ApiClient.isOffline()).toBe(false);
  });

  test('successful fetch after failures clears failure count', async () => {
    const config = makeConfig();

    // 3 P1 failures
    for (let i = 0; i < 3; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchP1Realtime(config);
    }

    // 3 Sungrow failures
    for (let i = 0; i < 3; i++) {
      mockFetchNetworkError();
      await ApiClient.fetchSungrowRealtime(config);
    }

    expect(ApiClient.isOffline()).toBe(true);

    // P1 recovers
    mockFetchSuccess(p1RealtimeFixture);
    await ApiClient.fetchP1Realtime(config);

    expect(ApiClient.getConsecutiveFailures('p1')).toBe(0);
    expect(ApiClient.isOffline()).toBe(false);
  });

  test('P1 Series failure increments p1 consecutiveFailures', async () => {
    const config = makeConfig();

    mockFetchNetworkError();
    await ApiClient.fetchP1Series(config, 'day');
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(1);
  });

  test('P1 Capacity failure increments p1 consecutiveFailures', async () => {
    const config = makeConfig();

    mockFetchNetworkError();
    await ApiClient.fetchP1Capacity(config, '2026-02');
    expect(ApiClient.getConsecutiveFailures('p1')).toBe(1);
  });

  test('Sungrow Series failure increments sungrow consecutiveFailures', async () => {
    const config = makeConfig();

    mockFetchNetworkError();
    await ApiClient.fetchSungrowSeries(config, 'day');
    expect(ApiClient.getConsecutiveFailures('sungrow')).toBe(1);
  });

  test('P1 Series success updates p1 lastSuccessTime', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    const seriesFixture = { device_id: 'p1-meter-01', frame: 'day', series: [] };
    mockFetchSuccess(seriesFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Series(config, 'day');

    expect(ApiClient.getLastSuccessTime('p1')).toBe(now);
  });

  test('P1 Capacity success updates p1 lastSuccessTime', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    mockFetchSuccess(p1CapacityFixture);
    const config = makeConfig();
    await ApiClient.fetchP1Capacity(config, '2026-02');

    expect(ApiClient.getLastSuccessTime('p1')).toBe(now);
  });

  test('Sungrow Series success updates sungrow lastSuccessTime', async () => {
    const now = 1700000000000;
    Date.now = jest.fn(() => now);

    mockFetchSuccess(sungrowSeriesDayFixture);
    const config = makeConfig();
    await ApiClient.fetchSungrowSeries(config, 'day');

    expect(ApiClient.getLastSuccessTime('sungrow')).toBe(now);
  });

  test('_resetState resets all staleness tracking state', async () => {
    const config = makeConfig();

    // Accumulate some state
    mockFetchNetworkError();
    await ApiClient.fetchP1Realtime(config);
    mockFetchNetworkError();
    await ApiClient.fetchSungrowRealtime(config);

    expect(ApiClient.getConsecutiveFailures('p1')).toBe(1);
    expect(ApiClient.getConsecutiveFailures('sungrow')).toBe(1);

    ApiClient._resetState();

    expect(ApiClient.getConsecutiveFailures('p1')).toBe(0);
    expect(ApiClient.getConsecutiveFailures('sungrow')).toBe(0);
    expect(ApiClient.getLastSuccessTime('p1')).toBe(0);
    expect(ApiClient.getLastSuccessTime('sungrow')).toBe(0);
  });
});
