// Example: Chrome extension service worker calling the job-agent-server
// /verify-code endpoint using a Bearer token stored in chrome.storage.
//
// Manifest V3 service workers run in a restricted context; use fetch()
// with an explicit Authorization header. The token is provisioned once
// (e.g. via an options page) and persisted in chrome.storage.local.
//
// Usage from another extension surface:
//   chrome.runtime.sendMessage(
//     { type: "VERIFY_CODE", email: "user@example.com" },
//     (response) => console.log(response),
//   );

const JOB_AGENT_BASE_URL = "https://job-agent.example.com";
const TOKEN_STORAGE_KEY = "jobAgentBearerToken";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Retrieve the stored Bearer token from chrome.storage.local.
 * @returns {Promise<string>}
 */
async function getBearerToken() {
  const items = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  const token = items[TOKEN_STORAGE_KEY];
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("No job-agent Bearer token configured");
  }
  return token;
}

/**
 * Call POST /verify-code on the job-agent-server.
 *
 * @param {string} email  Address the verification code was sent to.
 * @returns {Promise<object>} Parsed JSON response body.
 */
async function verifyCode(email) {
  if (typeof email !== "string" || email.length === 0) {
    throw new Error("email is required");
  }

  const token = await getBearerToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${JOB_AGENT_BASE_URL}/verify-code`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
      // Never send cookies alongside a Bearer token — avoids ambient auth.
      credentials: "omit",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.detail || payload.error || response.statusText;
      throw new Error(`verify-code failed (${response.status}): ${message}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

// Message bridge: other extension surfaces (popup, options, content script)
// dispatch VERIFY_CODE and receive the parsed response or an error string.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "VERIFY_CODE") {
    return false;
  }
  verifyCode(message.email)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true; // keep the message channel open for the async sendResponse
});

// Exported for unit tests / other modules in the extension bundle.
export { verifyCode, getBearerToken };
