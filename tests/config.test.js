/**
 * Tests for Config module (src/config.js).
 *
 * STORY-002: URL Parameter Configuration Module
 * TDD: Tests written FIRST, before implementation.
 *
 * CHANGELOG:
 * - 2026-07-30: RW-M05 hardening rider — delete postMessage/token-bridge and
 *   token-scrubbing test coverage (AC1, AC2); replace https://-prefix URL
 *   validation tests with same-origin validation tests (AC3); add graceful
 *   degradation tests for a rejected base URL (AC4). `validSearch()` defaults
 *   now use same-origin base URLs, since that is the only shape the target
 *   implementation accepts (RW-M05)
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
// Helper: build a valid search string with all required params.
//
// p1_base/sungrow_base default to SAME-ORIGIN paths (RW-M05 AC3): under the
// HC-002 rewrite, base URLs are same-origin proxied paths, not arbitrary
// third-party hosts. Using window.location.origin here (rather than a
// hardcoded host) keeps the whole suite origin-agnostic.
// ---------------------------------------------------------------------------
function sameOriginUrl(path) {
  return window.location.origin + path;
}

function validSearch(overrides = {}) {
  const defaults = {
    p1_base: sameOriginUrl('/api/p1'),
    sungrow_base: sameOriginUrl('/api/sungrow'),
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
        p1_base: sameOriginUrl('/api/p1'),
        sungrow_base: sameOriginUrl('/api/sungrow'),
        p1_device_id: 'device-p1-001',
        sungrow_device_id: 'device-sg-001',
        mock: false,
      })
    );
  });

  // REMOVED (RW-M05 AC2): "returns valid config with all params including
  // tokens" asserted that p1_token/sungrow_token supplied via URL params were
  // parsed and attached to config.p1_token/config.sungrow_token. The URL
  // token fallback is deleted outright — see "AC2: URL token fallback
  // deleted" below, which asserts the opposite (tokens are never attached).
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
// RW-M05 AC3: base-URL validation requires SAME-ORIGIN.
//
// REMOVED (RW-M05 AC3): the original "parseConfig - URL validation" describe
// asserted that a p1_base/sungrow_base starting with "http://" is rejected
// with a message mentioning "https://". That check is being REPLACED, not
// supplemented — a same-origin requirement subsumes the https-prefix check
// (production traffic is same-origin under Caddy, which is always https).
// Keeping the old assertion (which checked for wording containing
// "https://") would contradict the new error messaging. Replaced entirely by
// the tests below.
// ===========================================================================
describe('parseConfig - same-origin base URL validation (AC3)', () => {
  test('AC3(a): accepts p1_base/sungrow_base that are same-origin with the page', () => {
    const search = validSearch({
      p1_base: sameOriginUrl('/api/p1'),
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
  });

  test('AC3(b): rejects a cross-origin https:// p1_base even though the scheme is https', () => {
    const search = validSearch({
      p1_base: 'https://attacker.example.com/api',
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
  });

  test('AC3(c): rejects a protocol-relative "//evil.example" p1_base', () => {
    const search = validSearch({
      p1_base: '//evil.example/api',
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });

    let result;
    expect(() => {
      result = Config.parseConfig(search);
    }).not.toThrow();

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
  });

  test('AC3(d): rejects a "javascript:" p1_base', () => {
    const search = validSearch({
      p1_base: 'javascript:alert(1)',
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });

    let result;
    expect(() => {
      result = Config.parseConfig(search);
    }).not.toThrow();

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
  });

  test('AC3(e): rejects a host that merely PREFIXES the real origin (classic bypass), same scheme as the page', () => {
    const loc = new URL(window.location.origin);
    const bypassUrl =
      loc.protocol + '//' + loc.hostname + '.evil.com' + (loc.port ? ':' + loc.port : '') + '/api';
    // Sanity: the bypass host really is a different origin from the page.
    expect(bypassUrl).not.toBe(sameOriginUrl('/api'));

    const search = validSearch({
      p1_base: bypassUrl,
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
  });

  test('AC3(e-2): rejects an https:// prefix-bypass host (localhost.evil.com), which a naive startsWith(origin) check would accept', () => {
    const loc = new URL(window.location.origin);
    const bypassUrl =
      'https://' + loc.hostname + '.evil.com' + (loc.port ? ':' + loc.port : '') + '/api';

    const search = validSearch({
      p1_base: bypassUrl,
      sungrow_base: sameOriginUrl('/api/sungrow'),
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
  });

  test('AC3: sungrow_base is subject to the same same-origin requirement as p1_base', () => {
    const search = validSearch({
      p1_base: sameOriginUrl('/api/p1'),
      sungrow_base: 'https://attacker.example.com/api',
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /sungrow_base/i.test(e))).toBe(true);
  });
});

// REMOVED (RW-M05 AC2): "parseConfig - token validation" asserted that empty
// p1_token/sungrow_token URL params produce a validation error. Since the URL
// token fallback is deleted outright, there is no longer any token
// validation step to test — token params are simply ignored (see
// "AC2: URL token fallback deleted" below).

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

  test('rejects invalid mock value (e.g. mock=foo)', () => {
    const search = validSearch({ mock: 'foo' });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('mock')]));
  });
});

// REMOVED (RW-M05 AC1/AC2): "parseConfig - token scrubbing" asserted that
// history.replaceState was called to strip token params from the URL bar.
// Scrubbing logic is deleted outright — there is nothing to scrub because
// tokens are never read from the URL in the first place. See
// "AC1/AC2: postMessage token bridge and URL token fallback deleted" below,
// which asserts history.replaceState is NEVER called by parseConfig.

// REMOVED (RW-M05 AC1): "updateTokens - postMessage bridge" asserted that
// Config.updateTokens stores tokens delivered via the WebView bridge and that
// bridge tokens overwrite URL-provided tokens. Config.updateTokens is deleted
// outright — see "AC1: postMessage token bridge deleted" below, which
// asserts the function no longer exists.

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
        p1_base: sameOriginUrl('/api/p1'),
        sungrow_base: sameOriginUrl('/api/sungrow'),
        p1_device_id: 'device-p1-001',
        sungrow_device_id: 'device-sg-001',
        mock: false,
      })
    );
  });
});

// ===========================================================================
// RW-M05 AC1: postMessage token bridge deleted.
// RW-M05 AC2: URL token fallback and scrubbing deleted.
//
// "There is nothing to handle" (HC-002 rewrite): no code path may ever
// extract a token from a postMessage or a URL param, and no scrubbing logic
// should remain because there is nothing left to scrub.
// ===========================================================================
describe('AC1: postMessage token bridge deleted', () => {
  test('Config.updateTokens no longer exists on the module', () => {
    expect(Config.updateTokens).toBeUndefined();
  });
});

describe('AC2: URL token fallback deleted', () => {
  test('token params present in the URL are never attached to the parsed config', () => {
    const search = validSearch({
      p1_token: 'leaked-p1-token',
      sungrow_token: 'leaked-sg-token',
    });
    const result = Config.parseConfig(search);

    expect(result.valid).toBe(true);
    expect(result.config).not.toHaveProperty('p1_token');
    expect(result.config).not.toHaveProperty('sungrow_token');
  });

  test('does not call history.replaceState even when token params are present in the URL', () => {
    const search = validSearch({
      p1_token: 'leaked-p1-token',
      sungrow_token: 'leaked-sg-token',
    });

    Config.parseConfig(search);

    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  test('does not call history.replaceState when required params are also missing', () => {
    // Token present, but required params missing — there is no "scrub then
    // fail" path left, because there is no scrubbing at all any more.
    const search = '?p1_token=leaked-token&sungrow_token=leaked-token-2';

    const result = Config.parseConfig(search);

    expect(result.valid).toBe(false);
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// RW-M05 AC4: a rejected base URL degrades gracefully — never a crash,
// never a config object built from a rejected URL, never a silent fetch
// enabled against the rejected host.
// ===========================================================================
describe('AC4: rejected base URL degrades gracefully', () => {
  // Both base URLs are cross-origin https:// hosts here (not one cross-origin
  // + one same-origin default). That isolates the exact vulnerability: today's
  // https://-prefix-only check accepts ANY https:// URL regardless of host, so
  // using a same-origin default for the "other" param would let these tests
  // pass today for the wrong reason (the other param failing its own,
  // unrelated scheme check) rather than because p1_base itself was correctly
  // rejected.
  test('cross-origin p1_base is rejected without throwing and without exposing a config object', () => {
    const search = validSearch({
      p1_base: 'https://attacker.example.com/api',
      sungrow_base: 'https://attacker2.example.com/api',
    });

    let result;
    expect(() => {
      result = Config.parseConfig(search);
    }).not.toThrow();

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /p1_base/i.test(e))).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.config).toBeUndefined();
  });

  test('getConfig() never exposes a rejected cross-origin base URL as the current config', () => {
    let FreshConfig;
    jest.isolateModules(() => {
      FreshConfig = require('../src/config.js');
    });

    const search = validSearch({
      p1_base: 'https://attacker.example.com/api',
      sungrow_base: 'https://attacker2.example.com/api',
    });
    FreshConfig.parseConfig(search);

    expect(FreshConfig.getConfig()).toBeNull();
  });
});
