/**
 * API Client module for Energy Dashboard.
 *
 * Fetches data from P1 and Sungrow APIs with Bearer token authentication,
 * 30-second fetch timeout via AbortController, and last-known-value caching
 * on failure (network error, timeout, non-200 status).
 *
 * STORY-003: API Client with Authentication
 *
 * CHANGELOG:
 * - 2026-02-15: Add mock data path for all 7 functions (STORY-004)
 * - 2026-02-15: Initial implementation (STORY-003)
 */

// eslint-disable-next-line no-unused-vars
const ApiClient = (() => {
  /** Fetch timeout in milliseconds */
  var TIMEOUT_MS = 30000;

  /**
   * Module-level cache object stored in the IIFE closure.
   * Structure:
   *   p1Realtime:       <data>
   *   p1Series:         { [frame]: <data> }
   *   p1Capacity:       { [month]: <data> }
   *   sungrowRealtime:  <data>
   *   sungrowSeries:    { [frame]: <data> }
   */
  var cache = {
    p1Realtime: null,
    p1Series: {},
    p1Capacity: {},
    sungrowRealtime: null,
    sungrowSeries: {},
  };

  /**
   * Reset the cache. Exposed only for testing purposes via _resetCache.
   */
  function resetCache() {
    cache = {
      p1Realtime: null,
      p1Series: {},
      p1Capacity: {},
      sungrowRealtime: null,
      sungrowSeries: {},
    };
  }

  /**
   * Perform a fetch request with a 30-second timeout via AbortController.
   *
   * @param {string} url - The URL to fetch.
   * @param {Object} [options] - Optional fetch options (headers, etc.).
   * @returns {Promise<Response>} The fetch response.
   */
  function fetchWithTimeout(url, options) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_MS);

    var fetchOptions = Object.assign({}, options || {}, { signal: controller.signal });

    return fetch(url, fetchOptions).then(
      function (response) {
        clearTimeout(timeoutId);
        return response;
      },
      function (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    );
  }

  /**
   * Perform an authenticated fetch: adds Authorization: Bearer header,
   * enforces 30s timeout, and parses JSON on success.
   *
   * @param {string} url - The full URL to fetch.
   * @param {string} token - The Bearer token.
   * @returns {Promise<Object>} Parsed JSON response data.
   * @throws {Error} On network error, timeout, or non-200 status.
   */
  function authenticatedFetch(url, token) {
    return fetchWithTimeout(url, {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  }

  /**
   * Perform an unauthenticated fetch (no auth headers): enforces 30s timeout
   * and parses JSON on success.
   *
   * @param {string} url - The full URL to fetch.
   * @returns {Promise<Object>} Parsed JSON response data.
   * @throws {Error} On network error, timeout, or non-200 status.
   */
  function unauthenticatedFetch(url) {
    return fetchWithTimeout(url, {}).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  }

  // =========================================================================
  // P1 API functions
  // =========================================================================

  /**
   * Fetch P1 realtime data.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @returns {Promise<Object|null>} Parsed JSON or cached value or null.
   */
  function fetchP1Realtime(config) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockP1Realtime());
    }
    var url = config.p1_base + '/v1/realtime?device_id=' + config.p1_device_id;

    return authenticatedFetch(url, config.p1_token).then(
      function (data) {
        cache.p1Realtime = data;
        return data;
      },
      function () {
        return cache.p1Realtime !== null ? cache.p1Realtime : null;
      }
    );
  }

  /**
   * Fetch P1 series data.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @param {string} frame - Time frame (e.g. 'day', 'week', 'month').
   * @returns {Promise<Object|null>} Parsed JSON or cached value or null.
   */
  function fetchP1Series(config, frame) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockSungrowSeriesDay());
    }
    var url = config.p1_base + '/v1/series?device_id=' + config.p1_device_id + '&frame=' + frame;

    return authenticatedFetch(url, config.p1_token).then(
      function (data) {
        cache.p1Series[frame] = data;
        return data;
      },
      function () {
        return cache.p1Series[frame] !== undefined ? cache.p1Series[frame] : null;
      }
    );
  }

  /**
   * Fetch P1 capacity data for a given month.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @param {string} month - Month in YYYY-MM format.
   * @returns {Promise<Object|null>} Parsed JSON or cached value or null.
   */
  function fetchP1Capacity(config, month) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockP1Capacity());
    }
    var url = config.p1_base + '/v1/capacity/month/' + month + '?device_id=' + config.p1_device_id;

    return authenticatedFetch(url, config.p1_token).then(
      function (data) {
        cache.p1Capacity[month] = data;
        return data;
      },
      function () {
        return cache.p1Capacity[month] !== undefined ? cache.p1Capacity[month] : null;
      }
    );
  }

  // =========================================================================
  // Sungrow API functions
  // =========================================================================

  /**
   * Fetch Sungrow realtime data.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @returns {Promise<Object|null>} Parsed JSON or cached value or null.
   */
  function fetchSungrowRealtime(config) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockSungrowRealtime());
    }
    var url = config.sungrow_base + '/v1/realtime?device_id=' + config.sungrow_device_id;

    return authenticatedFetch(url, config.sungrow_token).then(
      function (data) {
        cache.sungrowRealtime = data;
        return data;
      },
      function () {
        return cache.sungrowRealtime !== null ? cache.sungrowRealtime : null;
      }
    );
  }

  /**
   * Fetch Sungrow series data.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @param {string} frame - Time frame (e.g. 'day', 'week', 'month').
   * @returns {Promise<Object|null>} Parsed JSON or cached value or null.
   */
  function fetchSungrowSeries(config, frame) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockSungrowSeriesDay());
    }
    var url =
      config.sungrow_base + '/v1/series?device_id=' + config.sungrow_device_id + '&frame=' + frame;

    return authenticatedFetch(url, config.sungrow_token).then(
      function (data) {
        cache.sungrowSeries[frame] = data;
        return data;
      },
      function () {
        return cache.sungrowSeries[frame] !== undefined ? cache.sungrowSeries[frame] : null;
      }
    );
  }

  // =========================================================================
  // Health check functions (no auth, no caching)
  // =========================================================================

  /**
   * Check P1 API health.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @returns {Promise<Object|null>} Parsed JSON or null on failure.
   */
  function checkP1Health(config) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockHealthResponse());
    }
    var url = config.p1_base + '/health';

    return unauthenticatedFetch(url).then(
      function (data) {
        return data;
      },
      function () {
        return null;
      }
    );
  }

  /**
   * Check Sungrow API health.
   *
   * @param {Object} config - Config object from Config.getConfig().
   * @returns {Promise<Object|null>} Parsed JSON or null on failure.
   */
  function checkSungrowHealth(config) {
    if (config.mock) {
      return Promise.resolve(MockData.getMockHealthResponse());
    }
    var url = config.sungrow_base + '/health';

    return unauthenticatedFetch(url).then(
      function (data) {
        return data;
      },
      function () {
        return null;
      }
    );
  }

  // Public API
  return {
    fetchP1Realtime: fetchP1Realtime,
    fetchP1Series: fetchP1Series,
    fetchP1Capacity: fetchP1Capacity,
    fetchSungrowRealtime: fetchSungrowRealtime,
    fetchSungrowSeries: fetchSungrowSeries,
    checkP1Health: checkP1Health,
    checkSungrowHealth: checkSungrowHealth,
    _resetCache: resetCache,
  };
})();

// Node.js/Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
