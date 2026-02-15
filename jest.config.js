/**
 * Jest configuration for Energy Dashboard.
 *
 * CHANGELOG:
 * - 2026-02-15: Initial configuration with jsdom environment (STORY-001)
 */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
};
