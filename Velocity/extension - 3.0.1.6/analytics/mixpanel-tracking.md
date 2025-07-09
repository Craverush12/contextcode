# Mixpanel Tracking in the Codebase

## 1. popup.js
- **Initialization:**
  - `initMixpanel()` initializes Mixpanel with a token and sets up super properties and user identification.
- **Tracking Function:**
  - `trackEvent(eventName, properties)` sends events to Mixpanel, or queues them if Mixpanel is not ready.
- **Tracked Events:**
  - `"Extension Opened"`: When the popup is opened.
  - `"Session Started"`: When a session starts.
  - `"Platform Selected"`: When a user selects a platform.
  - `"Style Selected"`: When a user selects a style.
  - `"Feature Discovery"`: When a feature is used for the first time.
  - `"Tracking Error"`: If there is an error tracking an event.
- **Other:**
  - Listens for `"track_mixpanel_event"` messages from background/content scripts and tracks them.
  - Processes and flushes any pending Mixpanel events.

---

## 2. background.js (and background - Copy.js)
- **Tracking Function:**
  - `trackMixpanelEvent(eventName, properties)` sends events to the popup for Mixpanel tracking, or queues them if the popup is unavailable.
- **Tracked Events:**
  - `"Free Trial Started"`: On extension install.
  - `"Free Trial Login Clicked"`: When login is triggered after free trial ends.
  - `"Button Injected"`: When a button is injected into a page.
  - `"button-Enhanced"`: When the enhance button is clicked.
  - `"Extension Toggle"`: When the extension is toggled on/off.
  - `"Prompt Analysis Requested"`: When prompt analysis is requested.
  - `"Prompt Analysis Success"`: When prompt analysis succeeds.
  - `"Prompt Analysis Error"`: When prompt analysis fails.
- **Other:**
  - Forwards `"trackMixpanelEvent"` messages from content scripts to the popup.

---

## 3. messageBoxStates.js
- **Tracked Events:**
  - `"Quality Feedback"`: When a user clicks a feedback button (like/dislike).
  - `"Profile Link Clicked"`: When a user clicks the profile link in the message box.
- **How:**
  - Uses `chrome.runtime.sendMessage` with `action: "trackMixpanelEvent"` to trigger tracking.

---

## 4. promptReview.js.disabled (Commented/Legacy)
- **Tracked Events (commented out):**
  - `"Prompt Refinement Success"`: On successful prompt refinement.
  - `"Prompt Refinement Error"`: On error during prompt refinement.

---

## Event Properties

Most events include properties such as:
- `platform`
- `style`
- `user_type` (free/paid/anonymous)
- `user_id`
- `user_name`
- `timestamp`
- `browser`
- `url`
- Additional context-specific properties (e.g., `prompt_length`, `error_message`, etc.)

**Note:**
- As of August 2024, all major UI button events in `phase1.js` (Generate, Insert Here, Send to LLM, Style, Settings, Profile, Tutorial, Dark mode, Copy, Back, Like, Dislike) now include both `user_id` and `user_name` in their event payloads, fetched from `chrome.storage.local` at the time of the event.
- This ensures robust user context for all tracked events, matching the analytics pattern in `popup.js`.

**Example event payload:**
```json
{
  "timestamp": "2024-08-01T12:34:56.789Z",
  "platform": "ChatGPT",
  "style": "descriptive",
  "entry_point": "phase1_generate_button",
  "user_id": "abc123",
  "user_name": "John Doe"
}
``` 