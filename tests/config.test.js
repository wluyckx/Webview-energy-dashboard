/**
 * Tests for Config module (src/config.js).
 *
 * STORY-002: URL Parameter Configuration Module
 * TDD: Tests written FIRST, before implementation.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial test suite (STORY-002)
 */

const Config = require('../src/config.js');

// Reset module state and mocks before each test
beforeEach(() => {
  // Mock history.replaceState
  delete window.history.replaceState;
  window.history.replaceState = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: build a valid search string with all required params
// ---------------------------------------------------------------------------
function validSearch(overrides = {}) {
  const defaults = {
    p1_base: 'https://api.p1.wimluyckx.dev',
    sungrow_base: 'https://api.sungrow.wimluyckx.dev',
    p1_device_id: 'device-p1-001',
    sungrow_device_id: 'device-sg-001',
  };
  const params = { ...defaults, ...overrides };
  return '?' + new URLSearchParams(params).toString();
}

// ===========================================================================
// Test: valid parameters return correct config object
// ===========================================================================
describe('parseConfig - valid parameters', () => {
  test('returns valid config with all required params', () => {
    const search = validSearch();
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config).toEqual(
      expect.objectContaining({
        p1_base: 'https://api.p1.wimluyckx.dev',
        sungrow_base: 'https://api.sungrow.wimluyckx.dev',
        p1_device_id: 'device-p1-001',
        sungrow_device_id: 'device-sg-001',
        mock: false,
      })
    );
  });

  test('returns valid config with all params including tokens', () => {
    const search = validSearch({
      p1_token: 'tok-p1-abc',
      sungrow_token: 'tok-sg-xyz',
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config.p1_token).toBe('tok-p1-abc');
    expect(result.config.sungrow_token).toBe('tok-sg-xyz');
  });
});

// ===========================================================================
// Test: missing required params returns error with list of missing param names
// ===========================================================================
describe('parseConfig - missing required params', () => {
  test('returns error listing all missing required params when none provided', () => {
    const result = Config.parseConfig('');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('p1_base'),
        expect.stringContaining('sungrow_base'),
        expect.stringContaining('p1_device_id'),
        expect.stringContaining('sungrow_device_id'),
      ])
    );
  });

  test('returns error listing only the missing param when one is omitted', () => {
    const search = validSearch();
    // Remove p1_base
    const params = new URLSearchParams(search);
    params.delete('p1_base');
    const result = Config.parseConfig('?' + params.toString());

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('p1_base')]));
    // Should NOT contain errors for params that ARE present
    expect(result.errors.join(' ')).not.toContain('sungrow_base');
  });
});

// ===========================================================================
// Test: invalid URL (http://) returns validation error
// ===========================================================================
describe('parseConfig - URL validation', () => {
  test('rejects p1_base that starts with http://', () => {
    const search = validSearch({ p1_base: 'http://insecure.example.com' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/p1_base.*https:\/\//i)])
    );
  });

  test('rejects sungrow_base that starts with http://', () => {
    const search = validSearch({ sungrow_base: 'http://insecure.example.com' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/sungrow_base.*https:\/\//i)])
    );
  });
});

// ===========================================================================
// Test: empty token returns validation error
// ===========================================================================
describe('parseConfig - token validation', () => {
  test('rejects empty p1_token', () => {
    const search = validSearch({ p1_token: '' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('p1_token')]));
  });

  test('rejects empty sungrow_token', () => {
    const search = validSearch({ sungrow_token: '' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('sungrow_token')])
    );
  });
});

// ===========================================================================
// Test: mock=true parses to boolean true, defaults to false when omitted
// ===========================================================================
describe('parseConfig - mock parameter', () => {
  test('mock=true parses to boolean true', () => {
    const search = validSearch({ mock: 'true' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config.mock).toBe(true);
  });

  test('mock defaults to false when omitted', () => {
    const search = validSearch();
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config.mock).toBe(false);
  });

  test('mock=false parses to boolean false', () => {
    const search = validSearch({ mock: 'false' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config.mock).toBe(false);
  });
});

// ===========================================================================
// Test: tokens from URL params are scrubbed via history.replaceState
// ===========================================================================
describe('parseConfig - token scrubbing', () => {
  test('scrubs tokens from URL via history.replaceState when tokens present', () => {
    const search = validSearch({
      p1_token: 'secret-p1',
      sungrow_token: 'secret-sg',
    });

    Config.parseConfig(search);

    expect(window.history.replaceState).toHaveBeenCalledTimes(1);

    // The replaced URL should NOT contain the token values
    const replacedUrl = window.history.replaceState.mock.calls[0][2];
    expect(replacedUrl).not.toContain('secret-p1');
    expect(replacedUrl).not.toContain('secret-sg');
    expect(replacedUrl).not.toContain('p1_token');
    expect(replacedUrl).not.toContain('sungrow_token');
  });

  test('does not call replaceState when no tokens in URL', () => {
    const search = validSearch();

    Config.parseConfig(search);

    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Test: tokens received via postMessage (updateTokens) are stored in config
// ===========================================================================
describe('updateTokens - postMessage bridge', () => {
  test('stores tokens provided via updateTokens', () => {
    // First parse a valid config without tokens
    const search = validSearch();
    Config.parseConfig(search);

    // Simulate receiving tokens via WebView bridge
    Config.updateTokens({ p1_token: 'bridge-p1-tok', sungrow_token: 'bridge-sg-tok' });

    const config = Config.getConfig();
    expect(config.p1_token).toBe('bridge-p1-tok');
    expect(config.sungrow_token).toBe('bridge-sg-tok');
  });

  test('overwrites URL-provided tokens with bridge tokens', () => {
    const search = validSearch({
      p1_token: 'url-p1-tok',
      sungrow_token: 'url-sg-tok',
    });
    Config.parseConfig(search);

    // Bridge delivers updated tokens
    Config.updateTokens({ p1_token: 'new-bridge-p1', sungrow_token: 'new-bridge-sg' });

    const config = Config.getConfig();
    expect(config.p1_token).toBe('new-bridge-p1');
    expect(config.sungrow_token).toBe('new-bridge-sg');
  });
});

// ===========================================================================
// Test: getConfig returns the current configuration
// ===========================================================================
describe('getConfig', () => {
  test('returns current config after successful parse', () => {
    const search = validSearch();
    Config.parseConfig(search);

    const config = Config.getConfig();
    expect(config).toEqual(
      expect.objectContaining({
        p1_base: 'https://api.p1.wimluyckx.dev',
        sungrow_base: 'https://api.sungrow.wimluyckx.dev',
        p1_device_id: 'device-p1-001',
        sungrow_device_id: 'device-sg-001',
        mock: false,
      })
    );
  });
});
