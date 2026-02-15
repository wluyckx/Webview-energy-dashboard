/**
 * Configuration module for Energy Dashboard.
 *
 * Parses URL query parameters and receives tokens via WebView bridge postMessage.
 * Tokens in URL params are scrubbed immediately via history.replaceState (HC-002).
 *
 * STORY-002: URL Parameter Configuration Module
 *
 * CHANGELOG:
 * - 2026-02-15: Initial implementation (STORY-002)
 */

// eslint-disable-next-line no-unused-vars
const Config = (() => {
  // Private state — tokens stored in JS memory only (HC-002)
  let currentConfig = null;

  const REQUIRED_PARAMS = ['p1_base', 'sungrow_base', 'p1_device_id', 'sungrow_device_id'];
  const URL_PARAMS = ['p1_base', 'sungrow_base'];
  const TOKEN_PARAMS = ['p1_token', 'sungrow_token'];

  /**
   * Validate that a base URL starts with "https://".
   */
  function validateUrl(name, value) {
    if (!value.startsWith('https://')) {
      return name + ' must start with https://';
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
   * Scrub token parameters from the URL bar via history.replaceState.
   */
  function scrubTokensFromUrl(searchString) {
    var params = new URLSearchParams(searchString);
    var hadTokens = false;

    TOKEN_PARAMS.forEach(function (name) {
      if (params.has(name)) {
        params.delete(name);
        hadTokens = true;
      }
    });

    if (hadTokens) {
      var cleanSearch = params.toString();
      var newUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '');
      window.history.replaceState(null, '', newUrl);
    }

    return hadTokens;
  }

  /**
   * Parse URL parameters from a search string and return a config result.
   *
   * @param {string} searchString - The URL search string (e.g. "?p1_base=https://...")
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
      return { valid: false, errors: errors };
    }

    // 2. Validate base URLs start with https://
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

    // 4. Validate tokens if provided in URL (non-empty when present)
    TOKEN_PARAMS.forEach(function (name) {
      if (params.has(name)) {
        var error = validateNonEmpty(name, params.get(name));
        if (error) {
          errors.push(error);
        }
      }
    });

    // If validation errors, return early
    if (errors.length > 0) {
      return { valid: false, errors: errors };
    }

    // 5. Build config object
    var config = {
      p1_base: params.get('p1_base'),
      sungrow_base: params.get('sungrow_base'),
      p1_device_id: params.get('p1_device_id'),
      sungrow_device_id: params.get('sungrow_device_id'),
      mock: params.get('mock') === 'true',
    };

    // 6. Extract tokens from URL if present (dev fallback)
    TOKEN_PARAMS.forEach(function (name) {
      if (params.has(name)) {
        config[name] = params.get(name);
      }
    });

    // 7. Scrub tokens from URL bar (HC-002)
    scrubTokensFromUrl(searchString);

    // 8. Store in private state
    currentConfig = config;

    return { valid: true, config: config };
  }

  /**
   * Get the current configuration.
   *
   * @returns {object|null} The current config or null if not yet parsed.
   */
  function getConfig() {
    return currentConfig;
  }

  /**
   * Update tokens received via WebView bridge postMessage.
   *
   * @param {{ p1_token?: string, sungrow_token?: string }} tokens
   */
  function updateTokens(tokens) {
    if (!currentConfig) {
      return;
    }

    if (tokens.p1_token) {
      currentConfig.p1_token = tokens.p1_token;
    }
    if (tokens.sungrow_token) {
      currentConfig.sungrow_token = tokens.sungrow_token;
    }
  }

  // Public API
  return {
    parseConfig: parseConfig,
    getConfig: getConfig,
    updateTokens: updateTokens,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
