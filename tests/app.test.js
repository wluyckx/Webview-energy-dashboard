/**
 * Tests for App module — WebView bridge functions (src/app.js).
 *
 * STORY-014: Flutter WebView Integration
 *
 * CHANGELOG:
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
