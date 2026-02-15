/**
 * Tests for App module — WebView bridge functions (src/app.js).
 *
 * STORY-014: Flutter WebView Integration
 * STORY-016: Status Bar Component
 *
 * CHANGELOG:
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
    updateTokens: jest.fn(),
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

// ---------------------------------------------------------------------------
// Helper: create a mock MessageEvent-like object
// ---------------------------------------------------------------------------
function makeMessageEvent(overrides = {}) {
  return Object.assign(
    {
      origin: window.location.origin,
      data: { type: 'token_refresh', p1_token: 'tok-p1', sungrow_token: 'tok-sg' },
    },
    overrides
  );
}

// ===========================================================================
// handleMessage (STORY-014)
// ===========================================================================
describe('handleMessage (STORY-014)', () => {
  beforeEach(() => {
    global.Config.updateTokens.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Origin validation
  // -----------------------------------------------------------------------
  test('ignores messages from different origin', () => {
    const event = makeMessageEvent({ origin: 'https://evil.example.com' });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('logs warning when origin does not match', () => {
    const event = makeMessageEvent({ origin: 'https://evil.example.com' });
    App.handleMessage(event);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Rejected postMessage'),
      'https://evil.example.com'
    );
  });

  test('accepts messages with null origin (Flutter WebView)', () => {
    const event = makeMessageEvent({
      origin: 'null',
      data: { type: 'token_refresh', p1_token: 'wv-p1' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).toHaveBeenCalledWith({ p1_token: 'wv-p1' });
  });

  // -----------------------------------------------------------------------
  // Schema validation
  // -----------------------------------------------------------------------
  test('ignores messages without data object', () => {
    const event = makeMessageEvent({ data: null });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('ignores messages where data is a string', () => {
    const event = makeMessageEvent({ data: 'not-an-object' });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('ignores messages without type field', () => {
    const event = makeMessageEvent({ data: { p1_token: 'tok' } });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('ignores messages with non-string type', () => {
    const event = makeMessageEvent({ data: { type: 123, p1_token: 'tok' } });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Token delivery: token_refresh
  // -----------------------------------------------------------------------
  test('token_refresh updates tokens via Config.updateTokens', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', p1_token: 'new-p1', sungrow_token: 'new-sg' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).toHaveBeenCalledTimes(1);
    expect(global.Config.updateTokens).toHaveBeenCalledWith({
      p1_token: 'new-p1',
      sungrow_token: 'new-sg',
    });
  });

  // -----------------------------------------------------------------------
  // Token delivery: bootstrap
  // -----------------------------------------------------------------------
  test('bootstrap updates tokens via Config.updateTokens', () => {
    const event = makeMessageEvent({
      data: { type: 'bootstrap', p1_token: 'init-p1', sungrow_token: 'init-sg' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).toHaveBeenCalledTimes(1);
    expect(global.Config.updateTokens).toHaveBeenCalledWith({
      p1_token: 'init-p1',
      sungrow_token: 'init-sg',
    });
  });

  // -----------------------------------------------------------------------
  // Token validation: empty / non-string
  // -----------------------------------------------------------------------
  test('ignores empty string tokens', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', p1_token: '', sungrow_token: '' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('ignores whitespace-only tokens', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', p1_token: '   ', sungrow_token: '  ' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  test('ignores non-string tokens', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', p1_token: 12345, sungrow_token: true },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Partial tokens
  // -----------------------------------------------------------------------
  test('handles message with only p1_token', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', p1_token: 'only-p1' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).toHaveBeenCalledTimes(1);
    expect(global.Config.updateTokens).toHaveBeenCalledWith({ p1_token: 'only-p1' });
  });

  test('handles message with only sungrow_token', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh', sungrow_token: 'only-sg' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).toHaveBeenCalledTimes(1);
    expect(global.Config.updateTokens).toHaveBeenCalledWith({ sungrow_token: 'only-sg' });
  });

  test('does not call updateTokens when no valid tokens present', () => {
    const event = makeMessageEvent({
      data: { type: 'token_refresh' },
    });
    App.handleMessage(event);

    expect(global.Config.updateTokens).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Unknown message type — no error, but no updateTokens
  // -----------------------------------------------------------------------
  test('ignores unknown message types without error', () => {
    const event = makeMessageEvent({
      data: { type: 'unknown_type', p1_token: 'tok' },
    });

    expect(() => App.handleMessage(event)).not.toThrow();
    expect(global.Config.updateTokens).not.toHaveBeenCalled();
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
