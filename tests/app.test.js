/**
 * Tests for App module — WebView bridge functions (src/app.js).
 *
 * STORY-014: Flutter WebView Integration
 * STORY-016: Status Bar Component
 *
 * CHANGELOG:
 * - 2026-07-30: RW-M05 hardening rider — delete the entire "handleMessage
 *   (STORY-014)" describe (postMessage token bridge deleted outright, AC1);
 *   remove Config.updateTokens from the test double; add AC1 (listener/
 *   function deletion) and AC4 (graceful degradation on a rejected base URL)
 *   coverage (RW-M05)
 * - 2026-02-15: Add tests for getStatusIndicator and formatLastUpdate (STORY-016)
 * - 2026-02-15: Initial test suite for handleMessage and dispatchToFlutter (STORY-014)
 */

// ---------------------------------------------------------------------------
// Setup: mock all globals that app.js references at require-time
// ---------------------------------------------------------------------------

// The DOMContentLoaded listener in app.js fires App.init() during require().
// We need all referenced globals to exist before that happens.
// Config.parseConfig returning { valid: false } prevents init() from calling
// further into ApiClient, PowerFlow, KpiStrip, EnergyBalance, etc.

beforeAll(() => {
  global.Config = {
    parseConfig: jest.fn(() => ({ valid: false, errors: [] })),
    getConfig: jest.fn(() => null),
    // No updateTokens (RW-M05 AC1): Config.updateTokens is deleted outright,
    // and app.js no longer references it.
  };
  global.PowerFlow = {
    init: jest.fn(),
    computeFlows: jest.fn(),
    updateAllFlows: jest.fn(),
    updateNodeValues: jest.fn(),
  };
  global.ApiClient = {
    fetchP1Realtime: jest.fn(() => Promise.resolve(null)),
    fetchSungrowRealtime: jest.fn(() => Promise.resolve(null)),
    fetchP1Capacity: jest.fn(() => Promise.resolve(null)),
    fetchSungrowSeries: jest.fn(() => Promise.resolve(null)),
    isStale: jest.fn(() => false),
    isOffline: jest.fn(() => false),
    getLastSuccessTime: jest.fn(() => 0),
  };
  global.KpiStrip = {
    updateAll: jest.fn(),
  };
  global.EnergyBalance = {
    update: jest.fn(),
  };
});

const App = require('../src/app.js');

afterAll(() => {
  delete global.Config;
  delete global.PowerFlow;
  delete global.ApiClient;
  delete global.KpiStrip;
  delete global.EnergyBalance;
});

// REMOVED (RW-M05 AC1): the "handleMessage (STORY-014)" describe (and its
// makeMessageEvent helper) asserted origin validation, schema validation,
// and token delivery via App.handleMessage()/Config.updateTokens() for the
// postMessage WebView bridge. The bridge served a Flutter host that does not
// exist in the production path (ADR-009 amendment) — handleMessage and the
// window 'message' listener are deleted outright, not disabled. Testing
// deleted functionality is meaningless; replaced entirely by
// "AC1: postMessage token bridge deleted" below, which asserts the function
// and the listener registration are both gone.
//
// ===========================================================================
// RW-M05 AC1: postMessage token bridge deleted — the listener and all
// token-from-message handling are gone, not disabled or commented out.
// ===========================================================================
describe('AC1: postMessage token bridge deleted', () => {
  test('App.handleMessage is not part of the public API (function deleted)', () => {
    expect(App.handleMessage).toBeUndefined();
  });

  test('App.init() never registers a "message" event listener on window', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    addEventListenerSpy.mockClear();

    App.init();

    const messageListenerCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === 'message'
    );
    expect(messageListenerCalls).toHaveLength(0);

    addEventListenerSpy.mockRestore();
  });
});

// ===========================================================================
// dispatchToFlutter (STORY-014)
// ===========================================================================
describe('dispatchToFlutter (STORY-014)', () => {
  afterEach(() => {
    delete window.flutter_inappwebview;
  });

  test('calls callHandler when flutter bridge exists', () => {
    const mockCallHandler = jest.fn();
    window.flutter_inappwebview = { callHandler: mockCallHandler };

    App.dispatchToFlutter('dashboardReady', { version: '1.0' });

    expect(mockCallHandler).toHaveBeenCalledTimes(1);
  });

  test('passes eventName and data to callHandler', () => {
    const mockCallHandler = jest.fn();
    window.flutter_inappwebview = { callHandler: mockCallHandler };

    App.dispatchToFlutter('dashboardReady', { version: '1.0' });

    expect(mockCallHandler).toHaveBeenCalledWith('dashboardReady', { version: '1.0' });
  });

  test('does not throw when flutter bridge is missing', () => {
    delete window.flutter_inappwebview;

    expect(() => {
      App.dispatchToFlutter('dashboardReady', { version: '1.0' });
    }).not.toThrow();
  });

  test('does not throw when callHandler is not a function', () => {
    window.flutter_inappwebview = { callHandler: 'not-a-function' };

    expect(() => {
      App.dispatchToFlutter('dashboardReady', { version: '1.0' });
    }).not.toThrow();
  });

  test('does not throw when flutter_inappwebview is null', () => {
    window.flutter_inappwebview = null;

    expect(() => {
      App.dispatchToFlutter('dashboardReady', { version: '1.0' });
    }).not.toThrow();
  });
});

// ===========================================================================
// getStatusIndicator (STORY-016)
// ===========================================================================
describe('getStatusIndicator (STORY-016)', () => {
  beforeEach(() => {
    global.ApiClient.isOffline.mockReset();
    global.ApiClient.isStale.mockReset();
    global.ApiClient.isOffline.mockReturnValue(false);
    global.ApiClient.isStale.mockReturnValue(false);
  });

  test('returns "live" when ApiClient is undefined', () => {
    const savedApiClient = global.ApiClient;
    delete global.ApiClient;

    const result = App.getStatusIndicator();

    expect(result).toEqual({ status: 'live', color: '#00B894', label: 'Live' });

    global.ApiClient = savedApiClient;
  });

  test('returns "offline" when ApiClient.isOffline() is true', () => {
    global.ApiClient.isOffline.mockReturnValue(true);

    const result = App.getStatusIndicator();

    expect(result).toEqual({ status: 'offline', color: '#E17055', label: 'Offline' });
  });

  test('returns "delayed" when at least one source is stale', () => {
    global.ApiClient.isStale.mockImplementation((source) => source === 'p1');

    const result = App.getStatusIndicator();

    expect(result).toEqual({ status: 'delayed', color: '#FDCB6E', label: 'Delayed' });
  });

  test('returns "live" when both sources are fresh', () => {
    global.ApiClient.isOffline.mockReturnValue(false);
    global.ApiClient.isStale.mockReturnValue(false);

    const result = App.getStatusIndicator();

    expect(result).toEqual({ status: 'live', color: '#00B894', label: 'Live' });
  });

  test('offline takes priority over delayed', () => {
    global.ApiClient.isOffline.mockReturnValue(true);
    global.ApiClient.isStale.mockReturnValue(true);

    const result = App.getStatusIndicator();

    expect(result).toEqual({ status: 'offline', color: '#E17055', label: 'Offline' });
  });
});

// ===========================================================================
// formatLastUpdate (STORY-016)
// ===========================================================================
describe('formatLastUpdate (STORY-016)', () => {
  test('returns empty string for 0', () => {
    expect(App.formatLastUpdate(0)).toBe('');
  });

  test('returns empty string for null', () => {
    expect(App.formatLastUpdate(null)).toBe('');
  });

  test('formats timestamp as HH:MM:SS', () => {
    // Create a known timestamp: 14:30:45
    const d = new Date();
    d.setHours(14, 30, 45, 0);
    const result = App.formatLastUpdate(d.getTime());

    expect(result).toBe('14:30:45');
  });

  test('pads single-digit hours/minutes/seconds with zero', () => {
    // Create a known timestamp: 03:05:09
    const d = new Date();
    d.setHours(3, 5, 9, 0);
    const result = App.formatLastUpdate(d.getTime());

    expect(result).toBe('03:05:09');
  });
});

// ===========================================================================
// updateStatusBar — offline banner toggle (STORY-013 AC2)
// ===========================================================================
describe('updateStatusBar offline banner (STORY-013)', () => {
  beforeEach(() => {
    // Set up minimal DOM for updateStatusBar
    document.body.innerHTML =
      '<div id="offline-banner" hidden></div>' +
      '<div class="status-bar__placeholder">' +
      '<span class="status-bar__dot"></span>' +
      '<span class="status-bar__label">Waiting for connection...</span>' +
      '</div>';
    global.ApiClient.isOffline.mockReset();
    global.ApiClient.isStale.mockReset();
    global.ApiClient.getLastSuccessTime.mockReset();
    global.ApiClient.isOffline.mockReturnValue(false);
    global.ApiClient.isStale.mockReturnValue(false);
    global.ApiClient.getLastSuccessTime.mockReturnValue(0);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows offline banner when status is offline', () => {
    global.ApiClient.isOffline.mockReturnValue(true);
    App.updateStatusBar();

    const banner = document.getElementById('offline-banner');
    expect(banner.hasAttribute('hidden')).toBe(false);
  });

  test('hides offline banner when status is live', () => {
    global.ApiClient.isOffline.mockReturnValue(false);
    // First make it visible
    document.getElementById('offline-banner').removeAttribute('hidden');
    App.updateStatusBar();

    const banner = document.getElementById('offline-banner');
    expect(banner.hasAttribute('hidden')).toBe(true);
  });

  test('hides offline banner when status is delayed', () => {
    global.ApiClient.isOffline.mockReturnValue(false);
    global.ApiClient.isStale.mockReturnValue(true);
    document.getElementById('offline-banner').removeAttribute('hidden');
    App.updateStatusBar();

    const banner = document.getElementById('offline-banner');
    expect(banner.hasAttribute('hidden')).toBe(true);
  });
});

// ===========================================================================
// pollRealtimeData — status bar updated on API failure (STORY-013)
// ===========================================================================
describe('pollRealtimeData updates status bar on failure', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="offline-banner" hidden></div>' +
      '<div class="status-bar__placeholder">' +
      '<span class="status-bar__dot"></span>' +
      '<span class="status-bar__label">Waiting for connection...</span>' +
      '</div>';
    global.Config.getConfig.mockReturnValue({
      p1_base: 'https://api.p1.wimluyckx.dev',
      sungrow_base: 'https://api.sungrow.wimluyckx.dev',
      p1_device_id: 'dev-1',
      sungrow_device_id: 'dev-2',
      p1_token: 'tok-p1',
      sungrow_token: 'tok-sg',
      mock: false,
    });
    global.ApiClient.isOffline.mockReset();
    global.ApiClient.isStale.mockReset();
    global.ApiClient.getLastSuccessTime.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    global.Config.getConfig.mockReturnValue(null);
    global.ApiClient.fetchP1Realtime.mockReset();
    global.ApiClient.fetchSungrowRealtime.mockReset();
    global.ApiClient.fetchP1Realtime.mockReturnValue(Promise.resolve(null));
    global.ApiClient.fetchSungrowRealtime.mockReturnValue(Promise.resolve(null));
  });

  test('shows offline banner when both APIs return null', async () => {
    global.ApiClient.fetchP1Realtime.mockReturnValue(Promise.resolve(null));
    global.ApiClient.fetchSungrowRealtime.mockReturnValue(Promise.resolve(null));
    global.ApiClient.isOffline.mockReturnValue(true);
    global.ApiClient.isStale.mockReturnValue(false);
    global.ApiClient.getLastSuccessTime.mockReturnValue(0);

    App.startPolling();
    // Flush Promise.all + .then microtasks
    await new Promise((r) => setTimeout(r, 0));

    const banner = document.getElementById('offline-banner');
    expect(banner.hasAttribute('hidden')).toBe(false);
  });

  test('updates status bar label when one API returns null', async () => {
    global.ApiClient.fetchP1Realtime.mockReturnValue(Promise.resolve(null));
    global.ApiClient.fetchSungrowRealtime.mockReturnValue(Promise.resolve({ power_w: 100 }));
    global.ApiClient.isOffline.mockReturnValue(false);
    global.ApiClient.isStale.mockReturnValue(true);
    global.ApiClient.getLastSuccessTime.mockReturnValue(0);

    App.startPolling();
    // Flush Promise.all + .then microtasks
    await new Promise((r) => setTimeout(r, 0));

    const label = document.querySelector('.status-bar__label');
    expect(label.textContent).toContain('Delayed');
  });
});

// ===========================================================================
// RW-M05 AC4: a rejected base URL degrades gracefully — a defined error
// state, never a blank screen, and never a silent fetch to the rejected
// host. App.init() already returns early on `!result.valid` (HC-003); these
// tests lock that path in for the specific "same-origin rejection" reason
// introduced by AC3, so a future edit to init()'s bridge-removal cannot
// silently break it.
// ===========================================================================
describe('AC4: App degrades gracefully when Config rejects a base URL', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="dashboard"></div>';
    global.ApiClient.fetchP1Realtime.mockClear();
    global.ApiClient.fetchSungrowRealtime.mockClear();
    global.ApiClient.fetchP1Capacity.mockClear();
    global.ApiClient.fetchSungrowSeries.mockClear();
    global.Config.parseConfig.mockReturnValue({
      valid: false,
      errors: ['p1_base must be same-origin with the dashboard host'],
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    global.Config.parseConfig.mockReturnValue({ valid: false, errors: [] });
  });

  test('renders a defined config-error panel instead of a blank screen', () => {
    App.init();

    const panel = document.querySelector('.config-error');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('alert');
    expect(panel.textContent).toContain('same-origin');
  });

  test('never calls any ApiClient fetch function when the base URL is rejected', () => {
    App.init();

    expect(global.ApiClient.fetchP1Realtime).not.toHaveBeenCalled();
    expect(global.ApiClient.fetchSungrowRealtime).not.toHaveBeenCalled();
    expect(global.ApiClient.fetchP1Capacity).not.toHaveBeenCalled();
    expect(global.ApiClient.fetchSungrowSeries).not.toHaveBeenCalled();
  });
});
