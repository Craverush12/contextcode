// ga4-measurement-protocol.js

const MEASUREMENT_ID = "G-5LB0VF3CPB"; // <-- REPLACE with your Measurement ID
const API_SECRET = "ZJwB2GOCSby21d_lhLEP9A"; // <-- REPLACE with your API Secret
const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
// Use this for debugging: https://www.google-analytics.com/debug/mp/collect

// --- Client ID Management ---
async function getOrCreateClientId() {
  // Use chrome.storage.session for non-persistent ID for privacy if needed,
  // or chrome.storage.local for persistent ID. Local is usually preferred
  // for analytics to identify returning users.
  const result = await chrome.storage.local.get('gaClientId');
  let clientId = result.gaClientId;
  if (!clientId) {
    // Generate a new ID if one doesn't exist
    clientId = self.crypto.randomUUID();
    await chrome.storage.local.set({ gaClientId: clientId });
  }
  return clientId;
}


let currentSessionId = null;
let sessionTimeoutId = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

async function getOrCreateSessionId() {
    if (!currentSessionId) {
        // Simple timestamp-based ID for this example. UUID could also be used.
        currentSessionId = Date.now().toString();
    }
    // Reset the timeout timer on activity
    if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
    }
    sessionTimeoutId = setTimeout(() => {
        currentSessionId = null; // Session ends after timeout
    }, SESSION_TIMEOUT_MS);

    return currentSessionId;
}

// --- Core Event Tracking Function ---
export async function trackGAEvent(eventName, eventParams = {}) {
  if (!MEASUREMENT_ID || !API_SECRET || MEASUREMENT_ID === "G-5LB0VF3CPB" || API_SECRET === "ZJwB2GOCSby21d_lhLEP9A") {
      // console.warn("GA4: Measurement ID or API Secret is not set. Skipping event tracking.");
      return;
  }

  const clientId = await getOrCreateClientId();
  if (!clientId) {
    console.error("GA4: Client ID not found or could not be created.");
    return;
  }

  const sessionId = await getOrCreateSessionId(); // Get current or new session ID
  const engagementTime = '100'; // Example: minimum engagement time

  try {

    const response = await fetch(
      `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          non_personalized_ads: false,
          events: [
            {
              name: eventName,
              params: {
                // Recommended parameters for session/engagement
                session_id: sessionId,
                engagement_time_msec: engagementTime,
                // Add a debug parameter (useful during development)
                // debug_mode: true, // Uncomment to send to DebugView
                ...eventParams, // Your custom event parameters
              },
            },
          ],
        }),
      }
    );

    if (!response.ok && response.status !== 204) { // 204 No Content is a common success status
        console.error(`GA4 Error: ${response.status} ${response.statusText}`, await response.text());
    } else {
    }

  } catch (error) {
    console.error(`GA4: Error sending event "${eventName}":`, error);
  }
}

