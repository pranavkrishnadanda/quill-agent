#!/usr/bin/env node
/**
 * Node.js client for the job-agent-server HTTP API.
 *
 * Requires Node.js >= 20 (uses the global `fetch` implementation).
 *
 * Usage:
 *   BASE_URL=http://localhost:8000 node examples/nodejs_client.js
 *
 * Exposes two functions:
 *   - healthCheck(baseUrl)              -> GET  /health
 *   - verifyCode(baseUrl, payload)      -> POST /verify-code
 */

'use strict';

/**
 * Perform a liveness health check against the server.
 *
 * @param {string} baseUrl - Base URL of the server, e.g. "http://localhost:8000".
 * @param {object} [options]
 * @param {number} [options.timeoutMs=5000] - Abort the request after this many ms.
 * @returns {Promise<object>} Parsed JSON response body.
 * @throws {Error} On non-2xx HTTP responses, network failures, or timeout.
 */
async function healthCheck(baseUrl, { timeoutMs = 5000 } = {}) {
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) {
    throw new TypeError('baseUrl must be a non-empty string');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Health check failed: HTTP ${response.status} ${response.statusText} — ${body}`,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Request a verification-code extraction from a recently-received email.
 *
 * @param {string} baseUrl - Base URL of the server.
 * @param {object} payload
 * @param {string} payload.email - Recipient inbox to poll (required).
 * @param {string} [payload.pattern] - Regex pattern to extract the code.
 * @param {number} [payload.timeout_seconds] - Server-side polling timeout.
 * @param {object} [options]
 * @param {number} [options.timeoutMs=60000] - Client-side abort timeout in ms.
 * @returns {Promise<object>} Parsed JSON response body containing the code.
 * @throws {Error} On invalid input, non-2xx responses, or timeout.
 */
async function verifyCode(baseUrl, payload, { timeoutMs = 60_000 } = {}) {
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) {
    throw new TypeError('baseUrl must be a non-empty string');
  }
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('payload must be an object');
  }
  if (typeof payload.email !== 'string' || payload.email.length === 0) {
    throw new TypeError('payload.email must be a non-empty string');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `verify-code failed: HTTP ${response.status} ${response.statusText} — ${text}`,
      );
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { healthCheck, verifyCode };

// CLI entrypoint: demonstrate both calls when invoked directly.
if (require.main === module) {
  (async () => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    try {
      console.log('--- healthCheck ---');
      console.log(await healthCheck(baseUrl));

      console.log('--- verifyCode (defaults) ---');
      console.log(
        await verifyCode(baseUrl, { email: 'candidate@example.com' }),
      );
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
  })();
}
