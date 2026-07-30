/**
 * Configuration module for Energy Dashboard.
 *
 * Parses URL query parameters into the dashboard's runtime config: the P1 and
 * Sungrow base URLs, their device ids, and the mock-mode flag.
 *
 * The client never handles API credentials in any form (HC-002). Caddy injects
 * Bearer tokens server-side and the client makes same-origin requests carrying
 * only the session cookie, so there is no token to receive, validate, store or
 * scrub. Base URLs are therefore required to be SAME-ORIGIN with the page: the
 * session cookie travels with every API request, and a cross-origin base URL
 * would hand it to a third-party host.
 *
 * STORY-002: URL Parameter Configuration Module
 *
 * CHANGELOG:
 * - 2026-07-30: Hardening rider — delete the postMessage token bridge
 *   (updateTokens), the URL token fallback and all token scrubbing; replace
 *   https://-prefix base-URL validation with a parsed same-origin check
 *   (RW-M05)
 * - 2026-02-15: Initial implementation (STORY-002)
 */

// eslint-disable-next-line no-unused-vars
const Config = (() => {
  // Private state — the last successfully validated config, or null.
  let currentConfig = null;

  const REQUIRED_PARAMS = ['p1_base', 'sungrow_base', 'p1_device_id', 'sungrow_device_id'];
  const URL_PARAMS = ['p1_base', 'sungrow_base'];

  /**
   * Validate that a base URL resolves to the same origin as the page (HC-002).
   *
   * The URL is PARSED and its origin compared for exact equality. String
   * comparison is deliberately avoided: a scheme-prefix check accepts any
   * `https://` host, and an origin-prefix check (`startsWith(origin)`) accepts
   * `http://localhost.evil.com` when the page origin is `http://localhost`.
   * Both would send the session cookie to an attacker-controlled host.
   *
   * Parsing against `window.location.href` also collapses the awkward inputs:
   * a protocol-relative `//evil.example` resolves to a foreign origin, and a
   * `javascript:` URL parses to an opaque origin — neither can equal the page
   * origin, and the explicit scheme allowlist below keeps that true even in a
   * null-origin (file:/data:) context.
   *
   * @param {string} name - Parameter name, used in the error message.
   * @param {string} value - Candidate base URL.
   * @returns {string|null} Error message, or null when the URL is same-origin.
   */
  function validateUrl(name, value) {
    var pageOrigin = window.location.origin;
    var parsed;

    try {
      parsed = new URL(value, window.location.href);
    } catch (e) {
      return name + ' must be a valid URL on the same origin as the dashboard';
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return name + ' must be an http(s) URL on the same origin as the dashboard';
    }

    if (!pageOrigin || pageOrigin === 'null' || parsed.origin !== pageOrigin) {
      return name + ' must be same-origin with the dashboard host';
    }

    return null;
  }

  /**
   * Validate that a string value is non-empty.
   */
  function validateNonEmpty(name, value) {
    if (typeof value !== 'string' || value.trim() === '') {
      return name + ' must be a non-empty string';
    }
    return null;
  }

  /**
   * Parse URL parameters from a search string and return a config result.
   *
   * On any validation failure the stored config is cleared, so `getConfig()`
   * can never hand out a rejected base URL (HC-003: the caller renders a
   * defined error state instead of fetching).
   *
   * @param {string} searchString - The URL search string (e.g. "?p1_base=/api/p1")
   * @returns {{ valid: boolean, config?: object, errors?: string[] }}
   */
  function parseConfig(searchString) {
    var params = new URLSearchParams(searchString);
    var errors = [];

    // 1. Check for missing required parameters
    REQUIRED_PARAMS.forEach(function (name) {
      if (!params.has(name) || params.get(name).trim() === '') {
        errors.push('Missing required parameter: ' + name);
      }
    });

    // If required params are missing, return early
    if (errors.length > 0) {
      currentConfig = null;
      return { valid: false, errors: errors };
    }

    // 2. Validate base URLs are same-origin with the page (HC-002)
    URL_PARAMS.forEach(function (name) {
      var error = validateUrl(name, params.get(name));
      if (error) {
        errors.push(error);
      }
    });

    // 3. Validate device IDs are non-empty strings
    ['p1_device_id', 'sungrow_device_id'].forEach(function (name) {
      var error = validateNonEmpty(name, params.get(name));
      if (error) {
        errors.push(error);
      }
    });

    // 4. Validate mock parameter (must be "true", "false", or absent)
    var mockRaw = params.get('mock');
    if (mockRaw !== null && mockRaw !== 'true' && mockRaw !== 'false') {
      errors.push('mock must be "true" or "false", got: ' + mockRaw);
    }

    // If validation errors, return early
    if (errors.length > 0) {
      currentConfig = null;
      return { valid: false, errors: errors };
    }

    // 5. Build config object. Only these five fields exist — no credential of
    //    any kind is read from the URL (HC-002).
    var config = {
      p1_base: params.get('p1_base'),
      sungrow_base: params.get('sungrow_base'),
      p1_device_id: params.get('p1_device_id'),
      sungrow_device_id: params.get('sungrow_device_id'),
      mock: mockRaw === 'true',
    };

    // 6. Store in private state
    currentConfig = config;

    return { valid: true, config: config };
  }

  /**
   * Get the current configuration.
   *
   * @returns {object|null} The current config or null if not yet parsed
   *   (or if the last parse was rejected).
   */
  function getConfig() {
    return currentConfig;
  }

  // Public API
  return {
    parseConfig: parseConfig,
    getConfig: getConfig,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
