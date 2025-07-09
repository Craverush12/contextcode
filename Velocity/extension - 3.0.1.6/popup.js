let userId = "";
let token = "";
let selectedStyle = null; // Default value
let selectedPlatform = null; // Default value
let hasText = false; // Track if text exists
let currentLength;
let isShowingResponses = false;
const MIXPANEL_TOKEN = "48a67766d0bb1b3399a4f956da9c52da";

const BACKEND_URL = "https://thinkvelocity.in/backend-V1-D";
// const BACKEND_URL = "http://localhost:3005";

let mixpanelInitialized = false; // Flag to track Mixpanel initialization status

// Logging helper for extension API usage
async function logToBackend(logType, message, metadata) {
  try {
    let userId = 'unknown';
    try {
      const storage = await new Promise((resolve) => {
        chrome.storage.local.get(['userId'], resolve);
      });
      if (storage.userId) userId = storage.userId;
    } catch (e) {}
    await fetch(`${BACKEND_URL}/extension/logs/${logType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message,
        metadata: Object.assign({
          platform: 'popup.js',
          timestamp: new Date().toISOString(),
        }, metadata || {})
      })
    });
  } catch (e) {
    // Silent fail for logging errors
  }
}

function initMixpanel() {
  // console.log('[Velocity Popup] Initializing Mixpanel');
  try {
    if (typeof mixpanel !== "undefined" && !mixpanelInitialized) {
      // Clear any corrupted queues before initialization
      clearMixpanelQueues();
      
      // Initialize with better configuration
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: false, // Set to false to reduce console noise
        track_pageview: true,
        persistence: 'localStorage',
        track_links_timeout: 300,
        cookie_expiration: 365,
        secure_cookie: true,
        cross_subdomain_cookie: false,
        batch_requests: true,
        batch_size: 10, // Reduce batch size to prevent timeouts
        batch_flush_interval_ms: 3000, // Reduce flush interval
        batch_request_timeout_ms: 30000 // Increase timeout
      });

      mixpanelInitialized = true; 
      setMixpanelSuperProperties();
      identifyMixpanelUser();
      processPendingMixpanelEvents();
      trackEvent("Extension Opened", {
        referrer: document.referrer,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        url: window.location.href,
        entry_point: "popup"
      });

      // Track Session Started event
      popupTrackEvent("Session Started", {
        entry_point: "extension_icon",
        platform: getSelectedPlatform() || "none",
        style: getSelectedStyle() || "none",
        timestamp: new Date().toISOString()
      });

      // Store session start time
      window.sessionStartTime = Date.now();
      window.sessionActionCount = 0;
      
      // Set up periodic queue clearing to prevent mutex lock issues
      setupPeriodicQueueClearing();
    } else if (mixpanelInitialized) {
      // console.log("Mixpanel already initialized.");
    } else {
      // console.warn("Mixpanel object not available yet for initialization.");
    }
  } catch (error) {
    console.error("Error initializing Mixpanel:", error);
    // Try to clear queues and retry
    clearMixpanelQueues();
    setTimeout(initMixpanel, 1000);
  }
}

function clearMixpanelQueues() {
  try {
    const queueKeys = [
      '__mpq_48a67766d0bb1b3399a4f956da9c52da_ev',
      '__mpq_48a67766d0bb1b3399a4f956da9c52da_pp',
      '__mpq_48a67766d0bb1b3399a4f956da9c52da_gr'
    ];
    
    queueKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        // console.log(`[Velocity] Cleared Mixpanel queue: ${key}`);
      }
    });
    
    // Also clear any lock-related items
    const lockKeys = Object.keys(localStorage).filter(key => 
      key.includes('__mpq_') && (key.includes(':X') || key.includes(':Y') || key.includes(':Z'))
    );
    
    lockKeys.forEach(key => {
      localStorage.removeItem(key);
      // console.log(`[Velocity] Cleared Mixpanel lock: ${key}`);
    });
    
  } catch (error) {
    console.error("[Velocity] Error clearing Mixpanel queues:", error);
  }
}

function trackEvent(eventName, properties = {}) {
  // console.log('[Velocity Popup] Tracking event:', eventName, properties);
  if (typeof mixpanel !== "undefined" && mixpanelInitialized) {
    mixpanel.track(eventName, {
      ...properties,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  } else {
    // console.warn("Mixpanel not initialized. Queuing event:", eventName, properties);
    // If Mixpanel is not initialized, store the event to track later
    chrome.storage.local.get(["pendingMixpanelEvents"], function (result) {
      const pendingEvents = result.pendingMixpanelEvents || [];
      pendingEvents.push({
        eventName,
        properties: {
          ...properties,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });
      chrome.storage.local.set({ pendingMixpanelEvents: pendingEvents });
    });
  }
}

// Add a listener for messages from the background script to track events
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "track_mixpanel_event") {
    trackEvent(request.eventName, request.properties);
  }
});

function processPendingMixpanelEvents() {
  // console.log('[Velocity Popup] Processing pending Mixpanel events');
  chrome.storage.local.get(["pendingMixpanelEvents"], function (result) {
    const pendingEvents = result.pendingMixpanelEvents || [];
    if (pendingEvents.length > 0 && typeof mixpanel !== "undefined" && mixpanelInitialized) {
      // console.log(`[Velocity Popup] Found ${pendingEvents.length} pending events. Tracking now.`);
      pendingEvents.forEach(event => {
        mixpanel.track(event.eventName, event.properties);
      });
      chrome.storage.local.set({ pendingMixpanelEvents: [] }); // Clear pending events
    } else {
      // console.log('[Velocity Popup] No pending events or Mixpanel not ready.');
    }
  });
}

document.addEventListener('DOMContentLoaded', initMixpanel);
window.onload = function() {
  initMixpanel();
};

function setMixpanelSuperProperties() {
  // console.log('[Velocity Popup] Setting Mixpanel super properties');
  if (typeof mixpanel !== "undefined") {
    chrome.storage.local.get(["FreeUser"], (data) => {
      mixpanel.register({
        "app_version": chrome.runtime.getManifest().version,
        "is_free_user": !!data.FreeUser,
        "browser": getBrowserInfo(),
        "platform": getPlatformInfo()
      });
      // // console.log("Mixpanel super properties set");
    });
  }
}

function identifyMixpanelUser() {
  // console.log('[Velocity Popup] Identifying Mixpanel user');
  chrome.storage.local.get(["token", "userId", "userName", "userEmail", "FreeUser"], (data) => {
    if (data.userId) {
      if (typeof mixpanel !== "undefined") {
        // Set user identity
        mixpanel.identify(data.userId);

        // Set user properties
        mixpanel.people.set({
          "$name": data.userName,
          "$email": data.userEmail,
          "account_type": data.FreeUser ? "free" : "paid",
          "first_seen": new Date().toISOString()
        });

        // // console.log("Mixpanel: User identified", data.userId);
      }
    } else {
      // // console.log("Mixpanel: No user to identify");
    }
  });
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf("Chrome") > -1) return "Chrome";
  if (userAgent.indexOf("Firefox") > -1) return "Firefox";
  if (userAgent.indexOf("Safari") > -1) return "Safari";
  if (userAgent.indexOf("Edge") > -1) return "Edge";
  return "Unknown";
}

function getPlatformInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf("Windows") > -1) return "Windows";
  if (userAgent.indexOf("Mac") > -1) return "Mac";
  if (userAgent.indexOf("Linux") > -1) return "Linux";
  return "Unknown";
}





function trackEvent(eventName, properties = {}) {
  try {
    if (typeof mixpanel !== "undefined") {
      // Add timestamp if not provided
      if (!properties.timestamp) {
        properties.timestamp = new Date().toISOString();
      }

      // Add current platform if available and not provided
      if (!properties.platform && selectedPlatform) {
        properties.platform = selectedPlatform;
      }

      // Add current style if available and not provided
      if (!properties.style && selectedStyle) {
        properties.style = selectedStyle;
      }

      // Add user type if available
      chrome.storage.local.get(["FreeUser", "userId"], (data) => {
        const enhancedProperties = {
          ...properties,
          user_type: data.userId ? (data.FreeUser ? "free" : "paid") : "anonymous",
          user_id: data.userId || "anonymous"
        };

        // Track the event
        mixpanel.track(eventName, enhancedProperties);

        // Optional debug logging
        if (properties.debug || localStorage.getItem('mixpanel_debug') === 'true') {
          // // console.log(`Mixpanel Event: ${eventName}`, enhancedProperties);
        }
      });
    } else {
      // console.warn("Mixpanel not available for tracking event:", eventName);
    }
  } catch (error) {
    // // console.error("Error tracking event:", eventName, error);

    // Attempt to log the error to Mixpanel if available
    try {
      if (typeof mixpanel !== "undefined") {
        mixpanel.track("Tracking Error", {
          error_event: eventName,
          error_message: error.message,
          error_stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      // Silent fail if error tracking fails
    }
  }
}

function trackFeatureDiscovery(featureName, properties = {}) {
  // Check if this feature has been used before
  chrome.storage.local.get(["discoveredFeatures"], (data) => {
    const discoveredFeatures = data.discoveredFeatures || {};

    // If feature hasn't been used before, track it
    if (!discoveredFeatures[featureName]) {
      // Track the feature discovery
      trackEvent("Feature Discovery", {
        feature: featureName,
        is_first_use: true,
        platform: getSelectedPlatform() || "none",
        ...properties
      });

      // Mark feature as discovered
      discoveredFeatures[featureName] = Date.now();
      chrome.storage.local.set({ discoveredFeatures });
    }
  });
}

async function checkFeatureAccess(featureId) {
  // Mock feature access data
  const mockAccessData = {
    success: true,
    data: {
      canUse: true,
      reason: null,
      timeoutUntil: null
    }
  };

  // Log the call but don't actually make an API request
  // // console.log(`Mock checkFeatureAccess called for feature ${featureId}`);

  return mockAccessData;
}

async function recordFeatureUsage(featureId) {
  // Mock usage recording response
  const mockUsageData = {
    success: true,
    data: {
      usageId: "mock-" + Math.random().toString(36).substring(2, 15),
      feature: featureId,
      timestamp: new Date().toISOString()
    }
  };

  // Log the call but don't actually make an API request
  // // console.log(`Mock recordFeatureUsage called for feature ${featureId}`);

  return mockUsageData;
}

function showTokenError() {
  const editButton = document.getElementById("editButton");

  // Check if the edit button is visible before showing error
  if (!editButton || editButton.style.display === "none") {
    // Show login error instead if button is not visible
    showLoginError();
    return;
  }

  // Apply a red border and box shadow to the edit button
  editButton.style.border = "2px solid #FF0000";
  editButton.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)";

  // Add a subtle shake animation for better visibility
  editButton.classList.add("shake-animation");

  // Remove the styling after a delay
  setTimeout(() => {
    editButton.style.border = "1px solid #000000";
    editButton.style.boxShadow = "3px 3px 0px rgba(0, 0, 0, 0.8)";
    editButton.classList.remove("shake-animation");
  }, 3000);
}
function showLoginError() {
  // Get the login status indicator element
  const loginStatusIndicator = document.getElementById("loginStatusIndicator");

  if (loginStatusIndicator) {
    // Apply error styling to the login button
    loginStatusIndicator.style.border = "2px solid #FF0000";
    loginStatusIndicator.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)";

    // Make sure the login button is visible and has the right text
    loginStatusIndicator.className = "login-status-indicator logged-out blue shake-animation";
    loginStatusIndicator.style.display = "flex";
    loginStatusIndicator.querySelector(".status-text").textContent = "Login";

    // Remove the styling after a delay
    setTimeout(() => {
      loginStatusIndicator.style.border = "1px solid #000000";
      loginStatusIndicator.style.boxShadow = "3px 3px 0px rgba(0, 0, 0, 0.8)";
      loginStatusIndicator.classList.remove("shake-animation");
    }, 3000);
  }
}

function addUnselectCapability() {
  function handleRadioToggle(inputSelector, storageKey, onChange) {
    document.querySelectorAll(inputSelector).forEach((input) => {
      const existingHandler = input.onclick;
      input.onclick = async function (e) {
        if (this.checked && this.dataset.wasChecked === "true") {
          this.checked = false;
          this.dataset.wasChecked = "false";
          await chrome.storage.local.remove(storageKey);
          if (onChange) onChange(null);
        } else {
          document.querySelectorAll(inputSelector).forEach((radio) => {
            radio.dataset.wasChecked = "false";
          });
          this.dataset.wasChecked = "true";
          await chrome.storage.local.set({ [storageKey]: this.value || this.id });
          if (onChange) onChange(this.value || this.id);
        }
        if (existingHandler) existingHandler.call(this, e);
      };
    });
  }

  handleRadioToggle(
    '.button-group input[type="radio"]',
    "selectedStyle",
    (val) => { selectedStyle = val; setTimeout(updateCalculatedCredits, 0); }
  );
  handleRadioToggle(
    '.radio-group input[type="radio"]',
    "selectedPlatform",
    (val) => { selectedPlatform = val; setTimeout(updateCalculatedCredits, 0); }
  );
}

function handleParsedResponse(parsedResponse) {
  try {
    // // console.log("[Velocity Debug] handleParsedResponse called with:", parsedResponse ? JSON.stringify(parsedResponse).substring(0, 100) + "..." : "null");

    // Check for and log suggested LLM
    if (parsedResponse.suggested_llm) {
      // // console.log("[Velocity Debug] Found suggested LLM in response:", parsedResponse.suggested_llm);
    } else {
      // // console.log("[Velocity Debug] No suggested LLM found in parsed response");
    }

    // Extract prompts from the response structure
    let prompts = parsedResponse.enhanced_prompt;
    if (!prompts || (Array.isArray(prompts) && !prompts.length)) {
      throw new Error("No prompts received from server");
    }
    const firstPrompt = Array.isArray(prompts) ? prompts[0] : prompts;

    // Store the first response in local storage
    storeFirstResponseLocally(firstPrompt);

    // Replace loading header with "Your prompt is ready!" text
    const responsesHeader = document.querySelector(".responses-header");
    if (responsesHeader) {
      responsesHeader.innerHTML = "<h2>Your prompt is ready!</h2>";
    }

    // Use the renderResponse function from phase1.js
    renderResponse(firstPrompt);

    // Handle UI transitions - already done by showSkeletonLoader
    const mainContent = document.getElementById("mainContent");
    const responsesWrapper = document.getElementById("responsesWrapper");

    if (mainContent && responsesWrapper) {
      if (mainContent.classList.contains("hidden") && !responsesWrapper.classList.contains("hidden")) {
        // Already in response view, no need to transition
      } else {
        // If not already transitioned, do it now
        mainContent.classList.add("hidden");
        responsesWrapper.classList.remove("hidden");
        setTimeout(() => {
          responsesWrapper.classList.add("visible");
        }, 50);
      }

      // Save state after view transition
      if (window.velocityStateManager) {
        window.velocityStateManager.saveState();
      }
    }

    // Handle suggested LLM if available
    if (parsedResponse.suggested_llm) {
      handleSuggestedLLM(parsedResponse.suggested_llm);
    } else {
      // Restore default platform selector if no suggested LLM
      setupPlatformSelector();
    }

  } catch (error) {
    showError("Failed to process response: " + error.message);
    // Hide skeleton loader and go back to input view on error
    hideSkeletonLoader();
  }
}

function createResponseElement(promptObj) {

  const card = document.createElement("div");
  card.className = "response-card";

  const content = document.createElement("div");
  content.className = "response-content";

  // Handle different prompt object structures
  let promptText = "";
  if (typeof promptObj.prompt === 'string') {
    promptText = promptObj.prompt;
  } else if (typeof promptObj === 'string') {
    promptText = promptObj;
  } else if (promptObj && typeof promptObj === 'object') {
    promptText = JSON.stringify(promptObj);
  } else {
    promptText = "No response available";
  }

  content.textContent = promptText;

  // Create the action buttons container
  const actionsContainer = document.createElement("div");
  actionsContainer.className = "response-actions";

  // Add content and actions to card
  card.appendChild(content);
  card.appendChild(actionsContainer);

  return card;
}

function createResponseCard(promptObj) {
  const card = document.createElement("div");
  card.className = "response-card";

  const content = document.createElement("div");
  content.className = "response-content";
  content.textContent = promptObj.prompt;

  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.innerHTML = `
    <span>Copy</span>
  `;

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(promptObj.prompt);
      copyButton.classList.add("copied");
      copyButton.querySelector("span").textContent = "Copied!";

      setTimeout(() => {
        copyButton.classList.remove("copied");
        copyButton.querySelector("span").textContent = "Copy";
      }, 2000);
    } catch (err) {
    }
  });

  card.appendChild(content);
  card.appendChild(copyButton);
  return card;
}

const ResponseManager = {
  transitionDuration: 300, // Match CSS transition duration
  isTransitioning: false,

  async showResponses(parsedResponse) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const mainContent = document.getElementById("mainContent");
    const responsesWrapper = document.getElementById("responsesWrapper");
    const responsesGrid = responsesWrapper.querySelector(".responses-grid");

    try {
      // Clear existing responses
      responsesGrid.innerHTML = "";

      // Process responses
      const prompts = this.normalizeResponseData(parsedResponse);

      // Prepare responses but don't show yet
      const responseElements = prompts.map((promptObj, index) =>
        this.createResponseCard(promptObj, index)
      );

      // Add all responses to grid
      responseElements.forEach((element) => responsesGrid.appendChild(element));

      // Begin transition sequence
      await this.transitionToResponses(mainContent, responsesWrapper);
    } catch (error) {
      showError("Failed to process response");
    } finally {
      this.isTransitioning = false;
    }
  },

  normalizeResponseData(parsedResponse) {
    if (typeof parsedResponse === "string") {
      return [{ prompt: parsedResponse }];
    }
    if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    }
    if (parsedResponse.prompts) {
      return parsedResponse.prompts;
    }
    return [{ prompt: String(parsedResponse) }];
  },

  createResponseCard(promptObj, index) {
    const card = document.createElement("div");
    card.className = "response-card";
    card.style.animationDelay = `${index * 100}ms`;
    const content = document.createElement("div");
    content.className = "response-content";
    content.textContent = promptObj.prompt;
    const copyButton = this.createCopyButton(promptObj.prompt);
    card.appendChild(content);
    card.appendChild(copyButton);
    return card;
  },

  createCopyButton(text) {
    const button = document.createElement("button");
    button.className = "copy-button";
    button.innerHTML = `
      <span>Copy</span>
    `;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        // Track Copied Enhanced Prompt event
        popupTrackEvent("Copied Prompt", {
          type: "Enhanced",
          prompt_length: text.length,
          word_count: text.split(/\s+/).filter(Boolean).length,
          style: getSelectedStyle() || "none",
          platform: getSelectedPlatform() || "none",
          contains_url: /https?:\/\/[^\s]+/.test(text),
          contains_code: /```[\s\S]*```/.test(text)
        });

        this.showCopyFeedback(button);
      } catch (err) {
      }
    });

    return button;
  },

  showCopyFeedback(button) {
    button.classList.add("copied");
    button.querySelector("span").textContent = "Copied!";

    setTimeout(() => {
      button.classList.remove("copied");
      button.querySelector("span").textContent = "Copy";
    }, 2000);
  },

  transitionToResponses(mainContent, responsesWrapper) {
    return new Promise((resolve) => {
      // Let CSS handle the display property with the visible class
      // Don't set responsesWrapper.style.display = "block" directly

      // Force reflow
      void responsesWrapper.offsetHeight;

      // Hide main content
      mainContent.classList.add("hidden");

      // After a brief delay, show responses
      setTimeout(() => {
        responsesWrapper.classList.add("visible");

        // Resolve after transition completes
        setTimeout(resolve, this.transitionDuration);
      }, 50);
    });
  },

  async hideResponses() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const mainContent = document.getElementById("mainContent");
    const responsesWrapper = document.getElementById("responsesWrapper");

    try {
      // Remove visible class first
      responsesWrapper.classList.remove("visible");

      // Wait for transition
      await new Promise((resolve) =>
        setTimeout(resolve, this.transitionDuration)
      );

      // Show main content
      mainContent.classList.remove("hidden");

      // Don't set display: none directly, let CSS handle it
      // Don't set responsesWrapper.style.display = "none"
    } finally {
      this.isTransitioning = false;
    }
  },
};

// Listen for messages from background script and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle Mixpanel tracking requests
  if (message.action === "track_mixpanel_event") {
    trackEvent(message.eventName, message.properties);
    sendResponse({ success: true });
    return true;
  }

  // Process any pending events that couldn't be tracked earlier
  if (message.action === "process_pending_events") {
    processPendingMixpanelEvents();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

/**
 * Process any pending Mixpanel events stored in chrome.storage.local
 */
function processPendingMixpanelEvents() {
  try {
    // Read from chrome.storage.local instead of localStorage to match background script
    chrome.storage.local.get(['pendingMixpanelEvents'], function(result) {
      const pendingEvents = result.pendingMixpanelEvents || [];
      if (pendingEvents.length > 0) {
        // console.log(`[Velocity Popup] Processing ${pendingEvents.length} pending Mixpanel events`);
        for (const event of pendingEvents) {
          // console.log(`[Velocity Popup] Processing pending event: ${event.eventName}`);
          try {
            trackEvent(event.eventName, event.properties);
          } catch (error) {
            // console.error("[Velocity Popup] Error processing pending Mixpanel events:", error);
          }
        }
        // console.log(`[Velocity Popup] Cleared ${pendingEvents.length} processed events`);
      }
    });
  } catch (error) {
    console.error("[Velocity Popup] Error processing pending Mixpanel events:", error);
  }
}


document.addEventListener("DOMContentLoaded", () => {

  // Process any pending events when popup opens
  processPendingMixpanelEvents();


  const backButton = document.getElementById("backToInput");
  backButton?.addEventListener("click", () => {
    const mainContent = document.getElementById("mainContent");
    const responsesWrapper = document.getElementById("responsesWrapper");

    // Hide responses
    responsesWrapper.classList.remove("visible");
    setTimeout(() => {
      // Add hidden class after transition
      responsesWrapper.classList.add("hidden");

      // Show main content
      mainContent.classList.remove("hidden");

      // Force resize of popup after transition
      chrome.runtime.sendMessage({
        action: "adjustPopupSize",
        width: 450, // Fixed width of 450px
        height: document.body.scrollHeight
      });

      // Save state after view transition
      if (window.velocityStateManager) {
        window.velocityStateManager.saveState();
      }
    }, 300);

    // Track state if necessary
    if (typeof isShowingResponses !== 'undefined') {
      isShowingResponses = false;
    }
  });
});

function initializeRadioGroup() {
  const radioButtons = document.querySelectorAll(".radio-button");
  radioButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const img = this.querySelector("img");
      const imgSrc = img.src.split("/").pop();
      const platform = imgSrc.split(".")[0];

      const platformMap = {
        radiobutton1: "General",
        radiobutton2: "GPT4",
        radiobutton3: "Midjourney",
        radiobutton4: "Playground",
        radiobutton5: "DALLE",
      };

      radioButtons.forEach((btn) => btn.classList.remove("selected"));
      this.classList.add("selected");

      selectedPlatform = platformMap[platform] || "General";

       // Track Platform Selected event
       popupTrackEvent("Platform Selected", {
        platform: selectedPlatform,
        previous_platform: previousPlatform || "none",
        style: getSelectedStyle() || "none",
        is_first_selection: !previousPlatform
      });

      chrome.storage.local.set({ selectedPlatform });
      updateEnhanceParameters();
    });
  });
}

/**
 * STYLE BUTTONS - Initializes the style selection buttons
 * This function adds click event listeners to the style buttons (Descriptive, Creative, Professional, Concise)
 * and saves the selection to chrome.storage
 */
function initializeStyleButtons() {
  // STYLE BUTTONS - Get all style radio buttons
  const styleButtons = document.querySelectorAll(
    '.button-group input[type="radio"]'
  );

  // STYLE BUTTONS - Add click event listeners to each button
  styleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Store the selected style ID (descriptive, creative, professional, concise)
      selectedStyle = this.id;

      // Track Style Selected event
      popupTrackEvent("Style Selected", {
        style: selectedStyle,
        previous_style: previousStyle || "none",
        platform: getSelectedPlatform() || "none",
        is_first_selection: !previousStyle
      });

      // Save to chrome storage for persistence
      chrome.storage.local.set({ selectedStyle });

      // Save state using the state manager
      if (window.velocityStateManager) {
        window.velocityStateManager.saveState();
      }

      // Update parameters for the content script
      updateEnhanceParameters();
    });
  });
}

/**
 * Loads previously saved selections from chrome.storage
 * This includes both style buttons and platform selections
 */
function loadSavedSelections() {
  chrome.storage.local.get(["selectedStyle", "selectedPlatform"], (result) => {
    // STYLE BUTTONS - Restore previously selected style button
    if (result.selectedStyle) {
      // Find the label for the saved style (Descriptive, Creative, Professional, Concise)
      const styleLabel = document.querySelector(
        `label[for="${result.selectedStyle}"]`
      );
      if (styleLabel) {
        // Check the corresponding radio button
        const input = document.getElementById(result.selectedStyle);
        if (input) input.checked = true;
        // Add selected class to the label for styling
        styleLabel.classList.add("selected");
      }
    }

    // Restore platform selection (existing code)
    if (result.selectedPlatform) {
      const platformMap = {
        General: "radiobutton1",
        GPT4: "radiobutton2",
        Midjourney: "radiobutton3",
        Playground: "radiobutton4",
        DALLE: "radiobutton5",
      };

      const buttonId = platformMap[result.selectedPlatform];
      if (buttonId) {
        const radioButton = document
          .querySelector(`[src*="${buttonId}"]`)
          ?.closest(".radio-button");
        if (radioButton) {
          radioButton.classList.add("selected");
        }
      }
    }
  });
}

function updateEnhanceParameters() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "updateEnhanceParameters",
      platform: getSelectedPlatform(),
      style: selectedStyle,
      enabled: document.getElementById("toggleButton").checked,
    });
  });
}

// Add global initialization flag
window.isInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  // Prevent duplicate initialization
  if (window.isInitialized) return;
  window.isInitialized = true;

  // Reset the ChatGPT tab flag when popup is opened
  chrome.storage.local.remove(["chatGPTTabOpened"]);

  // Ensure the extension is enabled by default
  chrome.storage.local.get("enabled", (data) => {
    // If enabled is undefined (not set yet), set it to true
    if (data.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
    }
  });

  // Check if we're on the response view and update the info button
  chrome.storage.local.get(["isOnResponseView"], function(data) {
    if (data.isOnResponseView) {
      // If we're on the response view, update the info button
      if (typeof window.checkAndUpdateInfoButtonVisibility === 'function') {
        window.checkAndUpdateInfoButtonVisibility();
      } else if (typeof checkAndUpdateInfoButtonVisibility === 'function') {
        checkAndUpdateInfoButtonVisibility();
      }
    }
  });

  // Check authentication status first
  chrome.storage.local.get(["token", "userId", "FreeUser"], function(data) {
    const token = data.token;
    const userId = data.userId;
    const isFreeUser = data.FreeUser === true;

    const editButton = document.getElementById("editButton");
    if (editButton) {
      // Only hide for non-authenticated users
      if (!token && !userId && !isFreeUser) {
        editButton.style.display = "none";
      }
    }

    // Initialize authentication state - this will set up the token display
    initializeAuthState();

    // Add a small delay to ensure Mixpanel is loaded
    setTimeout(initMixpanel, 500);

    // Initialize enhance button toggle
    newToggleEnhanceButton();

    // Update header UI to display correct buttons
    setTimeout(updateHeaderUI, 100);

    // Only set up the observer for non-authenticated users
    if (!token && !userId && !isFreeUser) {
      // Set up a MutationObserver to continuously check and hide the token button if needed
      setupTokenButtonObserver();
    }
  });
});

function cleanupEventListeners() {
  const existingHandlers = [window.existingClickHandler];
  existingHandlers.forEach((handler) => {
    if (handler) {
      document.removeEventListener("click", handler);
    }
  });
}

async function updateActiveTab(isEnabled) {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) return;

    try {
      // Inject the content script first
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content-script.js"],
      });
      // Then send the toggle message
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "updateEnhanceParameters",
        platform: getSelectedPlatform(),
        style: selectedStyle,
        enabled: isEnabled,
      });

    } catch (error) {
      // Show error in popup UI
      //const errorMessage = document.getElementById('error-message') || createErrorElement();
      showError("Failed to communicate with the page. Please try again.");
      // errorMessage.textContent = 'Failed to communicate with the page. Please try again.';
      // errorMessage.style.display = 'block';
    }
  });
}

function addButtonToTextAreas() {
  const textAreas = document.querySelectorAll("textarea");
  textAreas.forEach((textArea) => {
    // Skip if button already exists
    if (textArea.nextElementSibling?.classList.contains("extension-button")) {
      return;
    }

    // Create wrapper if it doesn't exist
    let wrapper = textArea.closest(".textarea-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "textarea-wrapper";
      textArea.parentNode.insertBefore(wrapper, textArea);
      wrapper.appendChild(textArea);
    }

    // Create enhance button
    const button = document.createElement("button");
    button.textContent = "Enhance";
    button.className = "extension-button";

    // Check initial state
    chrome.storage.local.get(["enhanceButtonEnabled"], (result) => {
      if (result.enhanceButtonEnabled !== false) {
        button.classList.add("enabled");
      }
    });

    wrapper.appendChild(button);
  });
}

document.removeEventListener("click", window.existingClickHandler);

document.addEventListener("DOMContentLoaded", function () {
  // Skip if already initialized by another handler
  if (window.isInitialized) return;

  const sendButton = document.getElementById("sendButton");
  const promptInput = document.getElementById("promptInput");
  chrome.storage.local.get(["promptText"], (result) => {
    if (result.promptText) {
      promptInput.value = result.promptText;
      currentLength = promptInput.value.length;
      updateCharCount(promptInput);
    }
  });

  // Save text on input
  promptInput.addEventListener("input", function () {
    const trimmedPrompt = this.value.trim();

    // Reset any error styling when user starts typing
    if (trimmedPrompt) {
      this.style.border = "";
      this.style.boxShadow = "";
      this.style.animation = "";
    }

    // Save to chrome.storage for persistence between sessions
    chrome.storage.local.set({ promptText: this.value });

    // Save state using the state manager
    if (window.velocityStateManager) {
      window.velocityStateManager.saveState();
    }

    updateCharCount(this);
    updateCalculatedCredits();
  });

  const CHAR_LIMIT = 1100;
  //const categoriesContainer = document.getElementById('categories-container');
  const responseDiv = document.getElementById("response");
  //const advancedOptionsButton = document.getElementById('advancedOptionsButton');
  const imageUpload = document.getElementById("imageUpload");
  const imageUploadText = document.querySelector(".image-upload-text");

  const iconImage = document.getElementById("generateIcon");
  //const logoutButton = document.querySelector('button[onclick="logout()"]');

  // Placeholder image path
  const placeholderImagePath = "path/to/your/placeholder-image.png";

  const radioGroup = document.querySelector(".radio-group");

  //categoriesContainer.classList.add('hidden2');
  // Error container removed
  promptInput.parentElement.style.position = "relative";

  // Create character counter
  const charCounter = document.createElement("div");
  charCounter.className = "char-counter";
  charCounter.style.cssText = `
    position: absolute;
    bottom: -15px;
    right: 12px;
    color: #666;
    font-size: 12px;
    pointer-events: none;
    user-select: none;
    background: transparent;
  `;
  promptInput.parentNode.appendChild(charCounter);

  // Update character count and check limit
  function updateCharCount(input) {
    currentLength = input.value.length;
    charCounter.textContent = `${currentLength}/${CHAR_LIMIT}`;

    if (currentLength > CHAR_LIMIT) {
      // Apply consistent error styling
      input.style.border = "2px solid #FF0000";
      input.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)";
      charCounter.style.color = "#FF0000";
    } else {
      // Reset to normal styling
      input.style.border = "";
      input.style.boxShadow = "";
      charCounter.style.color = "#666";
    }
  }

  // Add input and paste event listeners
  promptInput.addEventListener("input", function () {
    updateCharCount(this);
    updateCalculatedCredits();
    // // console.log("heyyy");
    // const wasEmpty = !hasText;
    // hasText = this.value.length > 0;

    // if (wasEmpty !== hasText) {
    //     updateCalculatedCredits();
    // }
  });

  promptInput.addEventListener("paste", function (e) {
    const pastedText = e.clipboardData.getData("text");
    if (this.value.length + pastedText.length > CHAR_LIMIT) {
      e.preventDefault();
      showError("Pasted text would exceed character limit");
    }
  });

  // Initialize character count
  updateCharCount(promptInput);

  // Set up resize observer for dynamic content
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(adjustPopupSize);
  });

  // Observe body for size changes
  resizeObserver.observe(document.body);

  // Variables to control popup resizing
  let isResizing = false;
  let currentView = 'input'; // Either 'input' or 'response'
  let lastHeight = 0;
  const MAX_HEIGHT = 600; // Maximum height for popup

  // Function to adjust popup size based on content with debouncing and state tracking
  function adjustPopupSize() {
    // Prevent rapid consecutive resizing
    if (isResizing) return;
    isResizing = true;

    // Get current dimensions
    const body = document.body;
    const height = Math.min(body.scrollHeight, MAX_HEIGHT);

    // Determine if we're in response view
    const responsesWrapper = document.getElementById("responsesWrapper");
    const isResponseView = !responsesWrapper.classList.contains("hidden");

    // Update current view state
    const newView = isResponseView ? 'response' : 'input';

    // Only resize if there's a significant change or view switch
    const heightDifference = Math.abs(height - lastHeight);
    if (heightDifference > 50 || currentView !== newView) {
      // Update state
      lastHeight = height;
      currentView = newView;

      // Send message to resize popup if needed
      chrome.runtime.sendMessage({
        action: "adjustPopupSize",
        width: 450, // Fixed width of 450px
        height: height
      });
    }

    // Release resize lock after delay
    setTimeout(() => {
      isResizing = false;
    }, 200);
  }

  function getSelectedValues() {
    const selected = {};
    document.querySelectorAll(".category-card").forEach((card) => {
      const categoryName = card.querySelector(".category-title").textContent;
      const selectedItems = Array.from(
        card.querySelectorAll(".dropdown-card.selected")
      ).map((card) => card.textContent.trim());
      if (selectedItems.length > 0) {
        selected[categoryName] = selectedItems;
      }
    });
    return selected;
  }


  function adjustDropdownWidth(dropdownContent) {
    if (!dropdownContent) return;
    const buttons = dropdownContent.querySelectorAll("button");
    const maxWidth = Math.max(
      ...Array.from(buttons).map((button) => button.offsetWidth)
    );
    dropdownContent.style.width = `${maxWidth + 103}px`;
  }

  function adjustDropdownHeight(dropdownContent) {
    if (!dropdownContent) return;
    const cards = dropdownContent.querySelectorAll(".dropdown-card");
    if (cards.length > 0) {
      const cardHeight = cards[0].offsetHeight;
      dropdownContent.style.height = `${cardHeight + 20}px`;
    }
  }


});

document.addEventListener("DOMContentLoaded", function () {
  // Skip if already initialized by another handler
  if (window.isInitialized) return;

  // Delay the initialization slightly to ensure it doesn't interfere with other scripts
  setTimeout(addUnselectCapability, 100);
});

function newToggleEnhanceButton() {
  const toggleButton = document.getElementById("toggleButton");
  if (!toggleButton) {
    // // console.error("Toggle button element not found");
    return;
  }

  // Get stored state - default to enabled (true) if not set
  chrome.storage.local.get("enabled", ({ enabled }) => {
    // If enabled is undefined or null, default to true
    toggleButton.checked = enabled !== false;
  });

  toggleButton.addEventListener("change", async (event) => {
    // Always allow toggling regardless of login status
    const enabled = toggleButton.checked;
    chrome.storage.local.set({ enabled });

    // Track Extension Toggle event
    const userId = localStorage.getItem("userId");
    const isFreeUser = localStorage.getItem("FreeUser") === "true";

    popupTrackEvent("Extension Toggle", {
      enabled: enabled,
      platform: getSelectedPlatform() || "none",
      style: getSelectedStyle() || "none",
      user_type: userId ? (isFreeUser ? "free" : "paid") : "anonymous"
    });

    // Notify background script to update content.js injection
    chrome.runtime.sendMessage({ action: "toggleContentScript", enabled });

    // Inject or remove script from the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        if (enabled) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content-script.js"], // Inject script
          });
        } else {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              document.querySelector(".custom-injected-button")?.remove(); // Remove button
            },
          });
        }
      }
    });
  });
}

// dropdown
document.addEventListener("DOMContentLoaded", function () {
  // Skip if already initialized by another handler
  if (window.isInitialized) return;

  // initializeEnhanceToggle();
  newToggleEnhanceButton();
  initializeRadioGroup();
  initializeStyleButtons();
  //loadSavedSelections();
  const signupButton = document.getElementById("signupButton");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const editButton = document.getElementById("editButton");
  //const logoutButton = document.getElementById('logoutButton');
  const editDropdownMenu = document.getElementById("editDropdownMenu");
  const accountButton = document.getElementById("accountButton");
  const editDeleteButtons = document.getElementById("editDeleteButtons");


  // Track session actions
  window.addEventListener("click", function() {
    if (window.sessionActionCount !== undefined) {
      window.sessionActionCount++;
    }
  });

  // Track Session Ended event when popup is closed
  window.addEventListener("beforeunload", function() {
    if (window.sessionStartTime) {
      const sessionDuration = Date.now() - window.sessionStartTime;

      popupTrackEvent("Session Ended", {
        duration_ms: sessionDuration,
        actions_performed: window.sessionActionCount || 0,
        platform: getSelectedPlatform() || "none",
        style: getSelectedStyle() || "none"
      });
    }
  });

  // Add click handler for the credits button to track when users check their credit balance
  if (editButton) {
    editButton.addEventListener("click", function() {
      // Get user information for tracking
      chrome.storage.local.get(["userId", "FreeUser", "token"], function(data) {
        const userId = data.userId;
        const isFreeUser = data.FreeUser === true;
        const isLoggedIn = data.token && data.userId;

        // Get credit balance
        let creditBalance = "unknown";
        try {
          const userProfileStr = localStorage.getItem("userProfile");
          if (userProfileStr) {
            const userProfile = JSON.parse(userProfileStr);
            if (userProfile && userProfile.tokens !== undefined) {
              creditBalance = userProfile.tokens;
            }
          }
        } catch (e) {
          // // console.error("Error parsing user profile:", e);
        }

        // Track Credits Checked event
        popupTrackEvent("Credits Checked", {
          user_type: isLoggedIn ? (isFreeUser ? "free" : "paid") : "anonymous",
          user_id: userId || "anonymous",
          credit_balance: creditBalance,
          platform: getSelectedPlatform() || "none",
          style: getSelectedStyle() || "none"
        });
      });
    });
  }
  function navigateToLogin() {
    window.location.replace("login.html");
  }

  // Close dropdowns when pressing Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      dropdownMenu.style.display = "none";
      editDropdownMenu.style.display = "none"; // Hide Edit dropdown
      signupButton.style.display = "flex"; // Show Sign Up button again
      editDeleteButtons.style.display = "none"; // Hide Edit/Delete buttons
    }
  });
});

// Assuming the user ID is available, otherwise you can retrieve it from localStorage, cookies, etc.
let lastSavedPromptId = null;
let lastTokensUsed = 0; // To track tokens used in the last operation

// Function to fetch and update credit display
async function updateCreditDisplay() {
  try {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    const isFreeUser = localStorage.getItem("FreeUser") === "true";

    // Get the edit button reference
    const editButton = document.getElementById("editButton");
    if (!editButton) {
      return; // Button not found in DOM
    }

    // Remove any previous styling classes
    editButton.classList.remove("free-trial-counter");

    // Get free usage data from chrome.storage.local
    const freeUsageData = await new Promise(resolve => {
      chrome.storage.local.get(["freeUsage"], resolve);
    });
    const freeUsage = parseInt(freeUsageData.freeUsage || "0");
    const remainingUses = Math.max(0, 3 - freeUsage);

    // If not logged in and not a free user, force hide the button
    if (!userId && !token && !isFreeUser) {
      forceHideTokenButton();
      return;
    }

    if (isFreeUser && (!userId || !token)) {
      // Display remaining free trials for free users
      editButton.innerHTML = `
        <span><img class="coinicon" src="./assets/Tokens.png" alt="coin"></span>
        <span>${remainingUses}/3</span>
      `;
      editButton.style.display = "flex";
      editButton.title = `${remainingUses} free trials remaining`;

      // Add free trial counter styling
      editButton.classList.add("free-trial-counter");
      return;
    }

    if (!userId || !token) {
      // No valid authentication, force hide the button
      forceHideTokenButton();
      return;
    }

    // For logged-in users, just show the token icon without any count
    editButton.innerHTML = `
      <span><img class="coinicon" src="./assets/Tokens.png" alt="coin"></span>
    `;
    editButton.style.display = "flex";
  } catch (error) {
    // Hide the button on error
    forceHideTokenButton();
  }
}

// Feature usage tracking
let promptUsed = false;

// Event listener for basic prompt
document.getElementById("promptInput").addEventListener("change", function () {
  promptUsed = true; // Mark basic prompt as used
});

// Event listeners for advanced option buttons
const advancedOptionButtons = document.querySelectorAll(".dropdown-card");
advancedOptionButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const optionId = this.querySelector(".dropdown-card-select").innerText; // Use button text as unique identifier
    // // console.log(`Advanced option clicked: ${optionId}`); // Log button click
    // advancedOptionsUsed = true;

    // Toggle the selected option
    if (!advancedOptionsSelected.has(optionId)) {
      // Add option to the selected set
      advancedOptionsSelected.add(optionId);
      // Mark the option as selected visually
      this.classList.add("selected");
    } else {
      // Remove option from the selected set
      advancedOptionsSelected.delete(optionId);
      // Remove the selected state visually
      this.classList.remove("selected");
    }

    // Update the flag for advanced options usage based on the size of the set
    advancedOptionsUsed = advancedOptionsSelected.size > 0;

    // Log the state of advancedOptionsUsed and the selected set
    // // console.log(
    //   "Advanced options selected:",
    //   Array.from(advancedOptionsSelected)
    // );
    // // console.log("Advanced options used:", advancedOptionsUsed);

    // Debugging: Verify if the flag is correctly updated
    if (advancedOptionsUsed) {
    } else {
    }
  });
});

// Event listener for generate button
document
  .getElementById("sendButton")
  .addEventListener("click", async function () {
    try {
        const promptInput = document.getElementById("promptInput");
        const promptText = promptInput?.value?.trim() || "";

      // Track Generate Button Clicked event
      popupTrackEvent("Generate Button Clicked", {
        style: getSelectedStyle() || "none",
        platform: getSelectedPlatform() || "none",
        prompt_length: promptText.length,
        word_count: promptText.split(/\s+/).filter(Boolean).length,
        has_text: promptText.length > 0,
        contains_url: /https?:\/\/[^\s]+/.test(promptText),
        contains_code: /```[\s\S]*```/.test(promptText),
        has_bullet_points: /(\n\s*[\*\-]\s+)/.test(promptText),
        has_numbered_list: /(\n\s*\d+\.\s+)/.test(promptText)
      });


        // Get data from chrome.storage.local
        const storageData = await new Promise(resolve => {
            chrome.storage.local.get(["token", "userId", "freeUsage", "FreeUser"], resolve);
        });

        const token = storageData.token;
        const userId = storageData.userId;
        const isFreeUser = storageData.FreeUser === true;
        const freeUsage = parseInt(storageData.freeUsage || "0");

        // Check if user can use the extension (logged in OR has free uses remaining)
        if ((!userId || !token) && (!isFreeUser || freeUsage >= 3)) {
          if (freeUsage >= 3) {
            showFreeTrialEndedError();
          } else {
            showLoginError();
          }
          return;
        }

        if (!promptInput || !promptInput.value.trim()) {
          showError("Please enter a prompt first");
          return;
        } else {
          document.getElementById("promptInput").disabled = true;
        }

        // Remove any existing error styling
        promptInput.style.border = "";
        promptInput.style.boxShadow = "";
        promptInput.style.animation = "";

        // Proceed with request
        await sendRequest();
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        resetInterface();
    }
  });

async function verifyAndRecordFeatures() {
  try {
    // Get data from chrome.storage.local
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(["token", "userId", "freeUsage", "FreeUser"], resolve);
    });

    const token = storageData.token;
    const userId = storageData.userId;
    const isFreeUser = storageData.FreeUser === true;
    const freeUsage = parseInt(storageData.freeUsage || "0");

    // If user is not logged in, check free usage
    if (!userId || !token) {
      if (isFreeUser && freeUsage < 3) {
        // Allow free usage
        return true;
      } else {
        // Show login error with free trial ended message
        showFreeTrialEndedError();
        return false;
      }
    }

    // For logged in users, always allow (API will handle credit validation)
    return true;
  } catch (error) {
    showError(
      error.message || "Error verifying feature access. Please try again."
    );
    return false;
  }
}

function resetInterface() {
  // Enable input
  document.getElementById("promptInput").disabled = false;

  // Clear prompt input
  const promptInput = document.getElementById("promptInput");
  if (promptInput) {
    promptInput.value = "";
    chrome.storage.local.remove(["promptText"]);
  }

      // Update display
    updateCreditDisplay();
}

// Initial credit display update when page loads
updateCreditDisplay();

// Define logout function
function logout() {
  try {
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Redirect to login page
    window.location.href = "login.html";
  } catch (error) {
    alert("Logout failed. Please try again.");
  }
}
window.logout = logout;

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Skip if already initialized by another handler
  if (window.isInitialized) return;

  const copyButton = document.getElementById("copyButton");
  const textarea = document.getElementById("promptInput");

  copyButton.addEventListener("click", function () {
    const textToCopy = textarea.value;
    if (!textToCopy) {
      showError("Please enter text to copy");
      return;
    }
    // Enhanced tracking with more properties
    popupTrackEvent("Copied Prompt", {
      type: "Original",
      prompt_length: textToCopy.length,
      word_count: textToCopy.split(/\s+/).filter(Boolean).length,
      has_style: !!selectedStyle,
      style: selectedStyle || "none",
      platform: selectedPlatform || "none",
      contains_url: /https?:\/\/[^\s]+/.test(textToCopy),
      contains_code: /```[\s\S]*```/.test(textToCopy)
    });
    // Copy the text to clipboard
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Add the white animation class
        copyButton.classList.add("white");

        // Remove the class after 2 seconds
        setTimeout(() => {
          copyButton.classList.remove("white");
        }, 2000);
      })
      .catch(() => {
        // Fallback for older browsers
        fallbackCopyTextToClipboard(textarea);
      });
  });

  // Fallback function for older browsers
  function fallbackCopyTextToClipboard(textarea) {
    try {
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      document.execCommand("copy");
      window.getSelection().removeAllRanges();

      // Add the white animation class
      copyButton.classList.add("white");

      // Remove the class after 2 seconds
      setTimeout(() => {
        copyButton.classList.remove("white");
      }, 2000);
    } catch (err) {
      alert("Failed to copy text. Please try again.");
    }
  }
});

async function sendRequest() {
  let promptHistoryId = null;
  const startTime = Date.now();

  try {
    // Get the prompt input from the text box
    const promptInput = document.getElementById("promptInput");
    const prompt = promptInput.value.trim();
    const CHAR_LIMIT = 1100;

    // Input validation with enhanced error handling
    if (!prompt) {
      showError("Please enter a prompt text");
      return;
    }

    if (prompt.length > CHAR_LIMIT) {
      showError(
        `Input too long. Please keep your text under ${CHAR_LIMIT} characters.`
      );
      return;
    }

    // Show loading state
    document.getElementById("sendButton").disabled = true;
    document.getElementById("sendButton").innerHTML = "Generating...";

    // Switch to response view and show skeleton loader
    showSkeletonLoader();

    // Validate permissions and features
    const valid = await verifyAndRecordFeatures();
    if (!valid) {
      document.getElementById("sendButton").disabled = false;
      document.getElementById("sendButton").innerHTML = "Generate";
      // Hide skeleton loader and go back to input view
      hideSkeletonLoader();
      return;
    }

    // Get selected style and platform options
    const selectedStyle = getSelectedStyle() || "Descriptive";
    const selectedPlatform = getSelectedPlatform();

    // Log Enhance API call initiation
    logToBackend('info', 'Enhance API called from popup', { prompt, style: selectedStyle, platform: selectedPlatform });

    // Check if using free trial and increment usage count
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(["token", "userId", "freeUsage", "FreeUser"], resolve);
    });

    const token = storageData.token;
    const userId = storageData.userId;
    const isFreeUser = storageData.FreeUser === true;
    const freeUsage = parseInt(storageData.freeUsage || "0");

    if (isFreeUser && (!token || !userId)) {
      // Increment free usage count
      const newUsageCount = freeUsage + 1;

      // Update storage with new values
      await new Promise(resolve => {
        chrome.storage.local.set({
          "freeUsage": newUsageCount,
        }, resolve);
      });

      // Track Free Trial Usage event
      popupTrackEvent("Free Trial Usage", {
        usage_count: newUsageCount,
        remaining_uses: Math.max(0, 3 - newUsageCount),
        is_last_use: newUsageCount >= 3,
        style: selectedStyle || "none",
        platform: selectedPlatform || "none",
        prompt_length: prompt.length
      });

      // If this was the last free use, track Free Trial Completed event
      if (newUsageCount >= 3) {
        popupTrackEvent("Free Trial Completed", {
          total_uses: newUsageCount,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Make the API request
    const storage = await new Promise(resolve => {
      chrome.storage.local.get(["token"], resolve);
    });
    const userToken = storage.token || "free-trial";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf`
    };

    // // Get settings from chrome.storage.local
    // const settingsData = await new Promise(resolve => {
    //   chrome.storage.local.get(["settings"], resolve);
    // });
    // let settingsObj = settingsData.settings || {};

    // // Create a formatted string with all settings
    // let settingsString = "\n\n[SETTINGS]\n";
    // settingsString += `Template: ${settingsObj.template || "None"}\n`;
    // settingsString += `Language: ${settingsObj.language || "english"}\n`;
    // settingsString += `Complexity Level: ${settingsObj.complexityLevel || "expert"}\n`;
    // settingsString += `Output Format: ${settingsObj.outputFormat || "table"}\n`;
    // settingsString += `Word Count: ${settingsObj.wordCount || 50}\n`;

    // if (settingsObj.customInstructions) {
    //   settingsString += `Custom Instructions: ${settingsObj.customInstructions}\n`;
    // }

    // Get intent data from WebSocket response if available
    let intent = "";
    let intent_description = "";

    // Check for any WebSocket response data that might contain main_intent
    if (window.velocityWebSocketResponse && window.velocityWebSocketResponse.main_intent) {
      intent = window.velocityWebSocketResponse.main_intent.category || "";
      intent_description = window.velocityWebSocketResponse.main_intent.description || "";
    } else if (window.velocityIntentData) {
      intent = window.velocityIntentData.intent || "";
      intent_description = window.velocityIntentData.intent_description || "";
    }

    // Prepare request body
    const requestBody = {
      auth_token: userToken,
      context: "",
      prompt: prompt,
      chat_history: ["", "", ""],
      llm: "",
      domain: "",
      writing_style: selectedStyle || "",
      user_id: userId || "",
      suggest_llm: true,
      intent: intent,
      intent_description: intent_description
    };

    const response = await fetch(
      "https://thinkvelocity.in/python-backend-D/enhance",
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Log Enhance API success
    logToBackend('info', 'Enhance API success in popup', { response: data });

    // Store the enhance response for later use
    window.velocityEnhanceResponse = {
      fullResponse: data
    };

    // Call handleEnhanceResponse with the data
    handleEnhanceResponse(data);

    // Save the prompt review
    savePromptReviewToAPI(prompt, data.enhanced_prompt, selectedStyle, selectedPlatform);

    // Reset button state but keep the response view visible
    document.getElementById("sendButton").disabled = false;
    document.getElementById("sendButton").innerHTML = "Generate";

  } catch (error) {
    // Log Enhance API error
    logToBackend('error', 'Enhance API failed in popup', { error: error.message });
    showError('Failed to enhance prompt');
    // Only hide the skeleton loader and reset UI on error
    hideSkeletonLoader();
    document.getElementById("sendButton").disabled = false;
    document.getElementById("sendButton").innerHTML = "Generate";
  }
}

// Token Management
const velocityTokens = {
  async checkTokenBalance() {
    try {
      // Get the stored user profile data from localStorage
      const userProfileStr = localStorage.getItem("userProfile");
      if (!userProfileStr) {
        // // console.error("User profile data not found in localStorage");
        return { available: 0, total: 0 };
      }

      const userProfile = JSON.parse(userProfileStr);
      if (!userProfile || !userProfile.tokens) {
        // // console.error("Invalid user profile data or missing tokens", userProfile);
        return { available: 0, total: 0 };
      }


      return {
        available: userProfile.tokens,  // Use actual tokens from profile
        total: userProfile.tokens       // Use actual tokens from profile
      };
    } catch (error) {
      return { available: 0, total: 0 };
    }
  },

  createTokenAlert() {
    const alert = document.createElement("div");
    alert.className = "velocity-token-alert";
    alert.innerHTML = `
      <div class="velocity-token-header">
        <span class="velocity-token-title">Out of tokens</span>
      </div>
      <p class="velocity-token-message">
        You've used all your available tokens. Top up to continue generating responses.
      </p>
      <button onclick="velocityTokens.handleTopUp()" class="velocity-token-button">
        Top Up Tokens
      </button>
    `;
    return alert;
  },


};

async function saveResponseToHistory(
  promptText,
  originalPromptId
) {
  try {
    // Get auth data from chrome.storage.local
    const storage = await chrome.storage.local.get(["userId", "token"]);
    const userId = storage.userId;
    const token = storage.token;

    if (!userId || !token) {
      throw new Error("User authentication required");
    }

    // Get the selected style and AI type
    const selectedStyle = getSelectedStyle() || "Descriptive";
    const aiType = getSelectedPlatform() || "ChatGpt";

    // Get the original prompt from the input field
    const originalPrompt = document.querySelector("#prompt-input")?.value || "";

    // Get intent data from WebSocket response
    const wsIntentData = window.velocityWebSocketResponse?.main_intent || {};
    const intent = wsIntentData.category || "";
    const intentDescription = wsIntentData.description || "";

    // Get enhance response data if available
    const enhanceResponse = window.velocityEnhanceResponse?.fullResponse || {};
    const processingTime = enhanceResponse.processing_time_ms || null;
    const relevanceAnalysis = enhanceResponse.relevance_analysis || null;

    // console.log('[Velocity Save] ===== Data Types Check =====');
    // console.log('[Velocity Save] userId type:', typeof userId);
    // console.log('[Velocity Save] prompt type:', typeof originalPrompt);
    // console.log('[Velocity Save] enhanced_prompt type:', typeof promptText);
    // console.log('[Velocity Save] ai_type type:', typeof aiType);
    // console.log('[Velocity Save] style type:', typeof selectedStyle);
    // console.log('[Velocity Save] intent type:', typeof intent);
    // console.log('[Velocity Save] intent_description type:', typeof intentDescription);
    // console.log('[Velocity Save] processing_time_ms type:', typeof processingTime);
    // console.log('[Velocity Save] relevance_analysis type:', typeof relevanceAnalysis);

    const requestBody = {
      user_id: userId,
      prompt: originalPrompt,
      enhanced_prompt: promptText,
      ai_type: aiType.toLowerCase(), // Ensure lowercase
      style: selectedStyle,
      domain: "general",
      processing_time_ms: processingTime ? Number(processingTime) : null, // Ensure number
      intent: intent || "general", // Ensure default value
      intent_description: intentDescription || "", // Ensure string
      relevance_analysis: relevanceAnalysis || null
    };

    // console.log('[Velocity Save] ===== Save API Request =====');
    // console.log('[Velocity Save] Request Body:', JSON.stringify(requestBody, null, 2));
    // console.log('[Velocity Save] Request Headers:', {
    //   'Content-Type': 'application/json',
    //   'Authorization': `Bearer ${token}`
    // });

    const response = await fetch(
      `${BACKEND_URL}/prompt/save-prompt-review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      }
    );

    // console.log('[Velocity Save] Response Status:', response.status);
    // console.log('[Velocity Save] Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    // console.log('[Velocity Save] Response Data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      // console.error('[Velocity Save] HTTP Error:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   data: data
      // });
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${data.message || 'Unknown error'}`);
    }

    if (!data.success) {
      // console.error('[Velocity Save] API Error:', data.message || 'Unknown error');
      throw new Error(data.message || "Failed to save response");
    }

    return data;
  } catch (error) {
    // console.error('[Velocity Save] Error saving response to history:', {
    //   error: error.message,
    //   stack: error.stack,
    //   name: error.name
    // });
    return {
      success: false,
      message: error.message || "Failed to save response to history"
    };
  }
}

async function savePromptToHistory(userId, promptText) {
  try {
    // Get auth token
    const token = localStorage.getItem("token");

    if (!userId || !token) {
      throw new Error("User authentication required");
    }

    // Get selected style and AI type
    const selectedStyle = getSelectedStyle() || "Descriptive";
    const aiType = getSelectedPlatform() || "ChatGpt";

    // No token calculation needed
    const tokensUsed = 0;


    // Call the API endpoint
    const response = await fetch(
      `${BACKEND_URL}/prompt/save-prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          prompt: promptText,
          ai_type: aiType,
          style: selectedStyle,
          tokens_used: tokensUsed
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to save prompt");
    }

    return data;
  } catch (error) {
    // Return a failed response object instead of throwing
    return {
      success: false,
      message: error.message || "Failed to save prompt to history"
    };
  }
}

async function updatePromptTokens(promptId, tokensUsed) {
  try {
    // Get auth token
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!userId || !token || !promptId) {
      throw new Error("Missing required information for updating prompt tokens");
    }

    // //// console.log("Updating prompt tokens:", {
    //   promptId,
    //   tokensUsed
    // });

    // This function might not be needed anymore since the tokens are already saved
    // during the initial prompt and response saving
    // However, leaving it as a proper implementation in case it's needed elsewhere

    // As there's no specific endpoint shown for updating tokens separately,
    // we'll return a success response
    return {
      success: true,
      data: {
        prompt_id: promptId,
        tokens_used: tokensUsed
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to update prompt tokens"
    };
  }
}

// Authentication and payment handling functions
const fetchTokenDetails = async () => {
  try {
    // Get user data from localStorage
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!userId || !token) {
      throw new Error("User ID or token not found");
    }

    // First, fetch token details
    const tokenResponse = await fetch(`${BACKEND_URL}/token/fetch-tokens/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to fetch token details");
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.success) {
      throw new Error(tokenData.message || "Failed to fetch token details");
    }

    return { tokenInfo: tokenData.tokens };
  } catch (error) {
    return null;
  }
};

function handleInsertHereButtonClick() {
  const responseContent = document.querySelector(".response-content");
  if (!responseContent) {
    // console.error("[Velocity] No response content found");
    logToBackend('error', 'Insert Here button clicked but no response content found', {
      action: 'insert_here_click'
    });
    return;
  }

  const promptText = responseContent.textContent;
  
  // Log the click to backend
  logToBackend('info', 'Insert Here button clicked from popup', {
    action: 'insert_here_click',
    prompt_length: promptText?.length || 0
  });

  // Send message to the active tab to insert the prompt
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      // console.error("[Velocity] No active tab found");
      logToBackend('error', 'Insert Here button clicked but no active tab found', {
        action: 'insert_here_click'
      });
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      action: "insertHere",
      prompt: promptText
    }, function(response) {
      if (chrome.runtime.lastError) {
        // console.error("[Velocity] Error:", chrome.runtime.lastError.message);
        // Content script might not be loaded, inject it first
        logToBackend('warning', 'Insert Here needs content script injection', {
          error: chrome.runtime.lastError.message,
          tab_id: tabs[0].id
        });
        
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ["content-script.js"]
        }, function() {
          // Try again after injecting the script
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "insertHere",
            prompt: promptText
          }, function(retryResponse) {
            if (chrome.runtime.lastError) {
              logToBackend('error', 'Insert Here retry failed after script injection', {
                error: chrome.runtime.lastError.message,
                tab_id: tabs[0].id
              });
            } else if (retryResponse && retryResponse.success) {
              logToBackend('info', 'Insert Here retry succeeded after script injection', {
                tab_id: tabs[0].id
              });
              window.close();
            }
          });
        });
      } else if (response && response.success) {
        // console.log("[Velocity] Successfully inserted prompt");
        logToBackend('info', 'Insert Here succeeded', {
          tab_id: tabs[0].id
        });
        // Close the popup after successful insertion
        window.close();
      } else {
        // console.error("[Velocity] Failed to insert prompt");
        logToBackend('error', 'Insert Here failed', {
          tab_id: tabs[0].id,
          response: JSON.stringify(response)
        });
      }
    });
  });
}

// Add event listener for Like/Dislike buttons
document.addEventListener("DOMContentLoaded", function() {
  // Add event listeners for like and dislike buttons
  const likeButton = document.getElementById("likeButton");
  const dislikeButton = document.getElementById("dislikeButton");

  if (likeButton) {
    likeButton.addEventListener("click", function() {
      // console.log('[Velocity Popup] Like button clicked');
      handlePopupFeedbackClick('like');
    });
  }

  if (dislikeButton) {
    dislikeButton.addEventListener("click", function() {
      // console.log('[Velocity Popup] Dislike button clicked');
      handlePopupFeedbackClick('dislike');
    });
  }

  // Setup the new platform action buttons using promptInjectionManager.js
  if (typeof setupPromptInjectionButtons === 'function') {
    setupPromptInjectionButtons({
      insertButtonId: "insertButton",
      openInPlatformButtonId: "openInPlatformButton",
      trackEvent: typeof trackEvent === 'function' ? trackEvent : null,
      closePopupOnSuccess: true,
      debugMode: true
    });
  } else {
    // console.error("[Velocity] setupPromptInjectionButtons function not found - promptInjectionManager.js may not be loaded");
  }
});

/**
 * Handle feedback button clicks in the popup UI
 * @param {string} feedbackType - 'like' or 'dislike'
 */
function handlePopupFeedbackClick(feedbackType) {
  // console.log(`[Velocity Popup] Processing ${feedbackType} feedback`);

  // Get the button elements for visual feedback
  const likeButton = document.getElementById("likeButton");
  const dislikeButton = document.getElementById("dislikeButton");

  if (!likeButton || !dislikeButton) {
    // console.error('[Velocity Popup] Like or dislike button not found');
    return;
  }

  // Visual feedback - change button appearance
  const isLike = feedbackType === 'like';
  const clickedButton = isLike ? likeButton : dislikeButton;
  const otherButton = isLike ? dislikeButton : likeButton;

  // Reset both buttons first
  likeButton.classList.remove('selected');
  dislikeButton.classList.remove('selected');

  // Add selected state to clicked button
  clickedButton.classList.add('selected');

  // Change button appearance to show feedback was received
  if (isLike) {
    clickedButton.style.backgroundColor = '#22C55E';
    clickedButton.style.opacity = '0.8';
  } else {
    clickedButton.style.backgroundColor = '#EF4444';
    clickedButton.style.opacity = '0.8';
  }

  // Reset the other button
  otherButton.style.backgroundColor = '';
  otherButton.style.opacity = '';

  // Track feedback with Mixpanel
  try {
    popupTrackEvent("Quality Feedback", {
      feedback_type: feedbackType,
      quality_state: 'good',
      source: 'popup_ui',
      url: 'extension_popup'
    });

    // console.log(`[Velocity Popup] ${feedbackType} feedback tracked successfully`);
  } catch (error) {
    // console.error('[Velocity Popup] Error tracking feedback:', error);
  }

  // Save feedback to the new API
  saveFeedbackToAPIFromPopup(feedbackType);
}

/**
 * Save feedback to the new API from popup
 * @param {string} feedbackType - 'like' or 'dislike'
 */
function saveFeedbackToAPIFromPopup(feedbackType) {
  // console.log(`[Velocity Popup] Saving ${feedbackType} feedback to API`);

  // Get the prompt_review_id from storage (should be set when prompt is enhanced)
  chrome.storage.local.get(['currentPromptReviewId'], (result) => {
    const promptReviewId = result.currentPromptReviewId;

    if (!promptReviewId) {
      // console.warn('[Velocity Popup] No prompt_review_id found in storage, cannot save feedback');
      return;
    }

    // console.log(`[Velocity Popup] Found prompt_review_id: ${promptReviewId}, saving feedback`);

    // Convert feedbackType to boolean (like = true, dislike = false)
    const feedback = feedbackType === 'like';

    // Send message to background script to save feedback
    chrome.runtime.sendMessage({
      action: 'saveFeedback',
      promptReviewId: promptReviewId,
      feedback: feedback
    }, (response) => {
      if (chrome.runtime.lastError) {
        // console.error('[Velocity Popup] Error sending feedback message:', chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        // console.log('[Velocity Popup] Feedback saved successfully:', response.data);
      } else {
        // console.error('[Velocity Popup] Failed to save feedback:', response?.error || 'Unknown error');
      }
    });
  });
}

/**
 * Save prompt review to the new dual API
 * @param {string} originalPrompt - The original prompt
 * @param {string} enhancedPrompt - The enhanced prompt
 * @param {string} style - The selected style
 * @param {string} platform - The selected platform
 */
async function savePromptReviewToAPI(prompt, enhancedPrompt, style, platform) {
  // console.log('[Velocity Popup] savePromptReviewToAPI called with:', {
  //   prompt: prompt?.substring(0, 50) + '...',
  //   enhancedPrompt: enhancedPrompt?.substring(0, 50) + '...',
  //   style,
  //   platform
  // });

  try {
    // Get user data from chrome storage
    const storage = await chrome.storage.local.get(["userId", "token"]);
    const userId = storage.userId;
    const token = storage.token;

    if (!token) {
      // console.error('[Velocity Popup] No authentication token found');
      return;
    }

    // Extract data from enhance response
    let intent = "";
    let intent_description = "";
    let processing_time_ms = null;
    let relevance_analysis = null;

    if (window.velocityEnhanceResponse?.fullResponse) {
      const enhanceData = window.velocityEnhanceResponse.fullResponse;
      // console.log('[Velocity Popup] Found enhance response data:', enhanceData);

      intent = enhanceData.intent || "";
      intent_description = enhanceData.intent_description || "";
      processing_time_ms = enhanceData.processing_time_ms || null;
      relevance_analysis = enhanceData.relevance_analysis || null;
    }

    // console.log('[Velocity Popup] Using data for savePromptReview:', {
    //   intent,
    //   intent_description,
    //   processing_time_ms,
    //   relevance_analysis
    // });

    // Create request body
    const requestBody = {
      user_id: userId,
      prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      ai_type: "chatgpt", // Default to chatgpt
      style: style,
      domain: platform || "general",
      processing_time_ms: processing_time_ms,
      intent: intent,
      intent_description: intent_description,
      relevance_analysis: relevance_analysis
    };

    // console.log('[Velocity Popup] savePromptReview - Request body:', {
    //   ...requestBody,
    //   prompt: requestBody.prompt?.substring(0, 50) + '...',
    //   enhanced_prompt: requestBody.enhanced_prompt?.substring(0, 50) + '...',
    //   relevance_analysis: requestBody.relevance_analysis ? 'present' : 'null'
    // });

    const response = await fetch(`${BACKEND_URL}/prompt/save-prompt-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    // console.log('[Velocity Popup] savePromptReview - Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('[Velocity Popup] savePromptReview - HTTP error response:', errorText);
      throw new Error(`Failed to save prompt review: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    // console.log('[Velocity Popup] savePromptReview - Response data:', result);
    // console.log('[Velocity Popup] savePromptReview - Saved successfully with ID:', result.promptData?.prompt_review_id || 'unknown');
    return result;
  } catch (error) {
    // console.error('[Velocity Popup] Error in savePromptReview:', {
    //   error: error.message,
    //   stack: error.stack,
    // });

  }
}

// Function to initialize authentication state on startup
async function initializeAuthState() {
    try {
        // Use chrome.storage.local instead of localStorage
        const storageData = await new Promise(resolve => {
            chrome.storage.local.get(["token", "userId", "freeUsage", "FreeUser"], resolve);
        });

        const token = storageData.token;
        const userId = storageData.userId;
        const freeUsage = parseInt(storageData.freeUsage || "0");
        const isFreeUser = storageData.FreeUser === true;
        const remainingUses = Math.max(0, 3 - freeUsage);

        // Store token and userId in localStorage for other functions
        if (token && userId) {
            localStorage.setItem("token", token);
            localStorage.setItem("userId", userId);
            chrome.storage.local.set({ "FreeUser": false });
            localStorage.removeItem("FreeUser");
        } else {
            // Clear any stale values in localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("userId");

            // Set FreeUser status in localStorage to match chrome.storage.local
            if (isFreeUser) {
                localStorage.setItem("FreeUser", "true");
            } else {
                localStorage.removeItem("FreeUser");
            }
        }

        if (token && userId) {
            // User is logged in
            isLoggedIn = true;
            // Make sure edit button is updated immediately
            const editButton = document.getElementById("editButton");
            if (editButton) {
                updateCreditDisplay();
            } else {
                // Wait for DOM to be fully loaded
                setTimeout(updateCreditDisplay, 200);
            }

            chrome.storage.local.set({ "FreeUser": false });

            // Fetch credit rates and user profile data
      
            updateHeaderUI();

            return true;
        } else if (isFreeUser && remainingUses > 0) {
            // Free trial user with remaining uses
            isLoggedIn = false;

            // Ensure FreeUser status is set in both storage locations
            chrome.storage.local.set({ "FreeUser": true });
            localStorage.setItem("FreeUser", "true");

            // Update the edit button to show remaining trials
            const editButton = document.getElementById("editButton");
            if (editButton) {
                // Remove any previous styling classes
                editButton.classList.remove("free-trial-counter");

                // Update content and add free trial counter styling
                editButton.innerHTML = `
                    <span><img class="coinicon" src="./assets/Tokens.png" alt="coin"></span>
                    <span>${remainingUses}/3</span>
                `;
                editButton.style.display = "flex";
                editButton.title = `${remainingUses} free trials remaining`;
                editButton.classList.add("free-trial-counter");
            }

            // Update the UI after setting the free user state
            updateHeaderUI();
            return false;
        } else {
            // User is not logged in or free trial is used up
            isLoggedIn = false;

            // Make sure edit button is hidden immediately
            forceHideTokenButton();

            // Update the UI after setting the free user state
            updateHeaderUI();
            return false;
        }
    } catch (error) {
        // console.error("Error in initializeAuthState:", error);

        // Force hide the token button in case of error
        forceHideTokenButton();

        return false;
    }
}

// Function to get the selected style
function getSelectedStyle() {
  const selectedRadio = document.querySelector('.button-group input[type="radio"]:checked');
  return selectedRadio ? selectedRadio.id : null;
}

// Function to get the selected platform
function getSelectedPlatform() {
  // First try to get from the selected radio button
  const radioButtons = document.querySelectorAll('.radio-group input[type="radio"]:checked');
  if (radioButtons.length > 0) {
    const selectedValue = radioButtons[0].value;
    // // console.log("[Velocity Debug] Selected platform from radio button:", selectedValue);
    return selectedValue;
  }

  // If no radio button is selected, try to get from selectedPlatform variable
  if (selectedPlatform) {
    // // console.log("[Velocity Debug] Selected platform from variable:", selectedPlatform);
    return selectedPlatform;
  }

  // // console.log("[Velocity Debug] No platform selected, defaulting to ChatGpt");
  return "ChatGpt"; // Default value
}

// Function to update header UI
async function updateHeaderUI() {
  const signupButton = document.getElementById("signupButton");
  const editButton = document.getElementById("editButton");
  const loginStatusIndicator = document.getElementById("loginStatusIndicator");

  if (!signupButton || !loginStatusIndicator) {
    return; // Elements not found
  }

  // Remove any existing click event listeners from signupButton
  const newSignupButton = signupButton.cloneNode(true);
  signupButton.parentNode.replaceChild(newSignupButton, signupButton);

  try {
    // Get data from chrome.storage.local
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(["token", "userId", "userName", "freeUsage", "FreeUser"], resolve);
    });

    const token = storageData.token;
    const userId = storageData.userId;
    const userName = storageData.userName || "User";
    const isFreeUser = storageData.FreeUser === true;
    const freeUsage = parseInt(storageData.freeUsage || "0");
    const remainingUses = Math.max(0, 3 - freeUsage);

    // CASE 1: User is logged in (has token and userId)
    if (token && userId) {
      
      

      // Show profile button
      newSignupButton.style.display = "flex";
      newSignupButton.addEventListener("click", function() {
        chrome.tabs.create({ url: "https://thinkvelocity.in/profile" });
        // Enhanced Profile Button Clicked event with user properties
        popupTrackEvent("Profile Button Clicked", {
          user_type: "paid",
          user_id: userId,
          user_name: userName,
          platform: getSelectedPlatform() || "none",
          style: getSelectedStyle() || "none"
        });
      // Mark extension as installed for this user
        markExtensionInstalled(userId, token);
      }, { once: true });

      // Make sure credit button is visible and updated for logged in users
      if (editButton) {
        updateCreditDisplay();
      }

      // Hide the login status indicator for logged in users
      loginStatusIndicator.style.display = "none";
    }
    // CASE 2: User is in free trial (has FreeUser flag and remaining uses)
    else if (isFreeUser && remainingUses > 0) {
      // Hide profile button
      newSignupButton.style.display = "none";

      // Show the trial counter on the edit button
      if (editButton) {
        // Remove any previous styling classes
        editButton.classList.remove("free-trial-counter");

        // Update content and add free trial counter styling
        editButton.innerHTML = `
          <span><img class="coinicon" src="./assets/Tokens.png" alt="coin"></span>
          <span>${remainingUses}/3</span>
        `;
        editButton.style.display = "flex";
        editButton.title = `${remainingUses} free trials remaining`;
        editButton.classList.add("free-trial-counter");
      }

      // Show the login status indicator with free trial class
      loginStatusIndicator.className = "login-status-indicator free-trial";
      loginStatusIndicator.style.display = "flex";
      loginStatusIndicator.querySelector(".status-text").textContent = "Login";

      // Add click event to open login page
      loginStatusIndicator.onclick = function() {
        chrome.tabs.create({ url: "https://thinkvelocity.in/login" });
        popupTrackEvent("Login Button Clicked", {
          source: "header",
          free_trial_status: "active",
          free_trial_uses: freeUsage,
          platform: getSelectedPlatform() || "none",
          style: getSelectedStyle() || "none"
        });
      };
    }
    // CASE 3: Free trial ended or user not logged in
    else {
      // Hide profile button
      newSignupButton.style.display = "none";

      // Hide the token button
      if (editButton) {
        editButton.style.display = "none";
      }

      // Show the login status indicator
      loginStatusIndicator.className = "login-status-indicator logged-out blue";
      loginStatusIndicator.style.display = "flex";
      loginStatusIndicator.querySelector(".status-text").textContent = "Login";

      // Add click event to open login page
      loginStatusIndicator.onclick = function() {
        chrome.tabs.create({ url: "https://thinkvelocity.in/login" });
        popupTrackEvent("Login Button Clicked", {
          source: "header",
          free_trial_status: freeUsage >= 3 ? "expired" : "not_started",
          free_trial_uses: freeUsage,
          platform: getSelectedPlatform() || "none",
          style: getSelectedStyle() || "none"
        });
      };
    }
  } catch (error) {
    // console.error("Error updating header UI:", error);

    // In case of error, default to showing login button
    if (newSignupButton) {
      newSignupButton.style.display = "none";
    }

    if (editButton) {
      editButton.style.display = "none";
    }

    if (loginStatusIndicator) {
      loginStatusIndicator.className = "login-status-indicator logged-out blue";
      loginStatusIndicator.style.display = "flex";
      loginStatusIndicator.querySelector(".status-text").textContent = "Login";

      // Add click event to open login page
      loginStatusIndicator.onclick = function() {
        chrome.tabs.create({ url: "https://thinkvelocity.in/login" });
      };
    }
  }
}

// Helper function to show notifications
function showNotification(message, duration = 3000) {
  const notification = document.createElement("div");
  notification.className = "notification success";
  notification.textContent = message;

  // Position the notification
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Add the animation to CSS if not already present
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto-remove after duration
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    notification.addEventListener("animationend", () => {
      notification.remove();
    });
  }, duration);
}

function showFreeTrialEndedError() {
  // Get the login status indicator element
  const loginStatusIndicator = document.getElementById("loginStatusIndicator");

  if (loginStatusIndicator) {
    // Apply a red border and box shadow to the login button
    loginStatusIndicator.style.border = "2px solid #FF0000";
    loginStatusIndicator.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)";

    // Make sure the login button is visible and has the right text
    loginStatusIndicator.className = "login-status-indicator logged-out blue";
    loginStatusIndicator.style.display = "flex";
    loginStatusIndicator.querySelector(".status-text").textContent = "Login";

    // Add a subtle shake animation for better visibility
    loginStatusIndicator.style.animation = "shake 0.5s";

    // Add the animation style if it doesn't exist
    if (!document.getElementById("error-styles")) {
      const style = document.createElement("style");
      style.id = "error-styles";
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove the styling after a delay
    setTimeout(() => {
      loginStatusIndicator.style.border = "1px solid #000000";
      loginStatusIndicator.style.boxShadow = "3px 3px 0px rgba(0, 0, 0, 0.8)";
      loginStatusIndicator.style.animation = "";
    }, 3000);
  }
}

function showError(message) {
  logToBackend('error', 'Failed to display enhanced prompt in popup', { reason: message });
  // Get the prompt input element
  const promptInput = document.getElementById("promptInput");

  if (promptInput) {
    // Apply a red border and box shadow to the input
    promptInput.style.border = "2px solid #FF0000";
    promptInput.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.5)";

    // Add a subtle shake animation for better visibility
    promptInput.style.animation = "shake 0.5s";

    // Add the animation style if it doesn't exist
    if (!document.getElementById("error-styles")) {
      const style = document.createElement("style");
      style.id = "error-styles";
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove the styling after a delay
    setTimeout(() => {
      promptInput.style.border = "";
      promptInput.style.boxShadow = "";
      promptInput.style.animation = "";
    }, 3000);
  }

  // Log the error to console for debugging
  //// console.log("Input error:", message);
}

// Function to store only the first response in local storage
function storeFirstResponseLocally(response) {
  try {
    // Only store if the response is not empty or "none"
    if (response && response !== "none") {
      //// console.log("[Velocity Debug] Storing response:", response.substring(0, 50) + "...");

      // Get current suggestedLLM value if exists in storage
      chrome.storage.local.get(["suggestedLLM"], function(result) {
        const suggestedLLM = result.suggestedLLM || null;

        // Store response along with suggestedLLM if available
        chrome.storage.local.set({
          "storedResponse": response,
          "suggestedLLM": suggestedLLM  // Preserve the suggested LLM value
        }, function() {
          if (chrome.runtime.lastError) {
            // console.error("Error storing response: ", chrome.runtime.lastError);
          } else {
            //// console.log("Successfully stored response for ChatGPT injection");
            if (suggestedLLM) {
              //// console.log(`[Velocity Debug] Preserved suggested LLM in storage: ${suggestedLLM}`);
            }
          }
        });
      });
    } else {
      console.warn("Empty or 'none' response not stored");
    }
  } catch (error) {
    // console.error("Failed to store response locally: ", error);
  }
}

// Function to open ChatGPT tab (only once)
function openChatGPTTab() {
  // Check if we already opened a ChatGPT tab in this session
  chrome.storage.local.get(["chatGPTTabOpened"], function(result) {
    if (!result.chatGPTTabOpened) {
      // Open the ChatGPT tab
      chrome.tabs.create({ url: "https://chatgpt.com/", active: true }, function() {
        // Mark that we've opened the tab to prevent reopening
        chrome.storage.local.set({ "chatGPTTabOpened": true });
        //// console.log("[Velocity] Opened ChatGPT tab - content script will auto-inject stored prompt");
      });
    }
  });
}

// Force hide the token button for non-authenticated users
function forceHideTokenButton() {
  // Get the edit button reference
  const editButton = document.getElementById("editButton");

  if (!editButton) {
    return; // Button not found in DOM
  }

  // Then check if we should show it or hide it
  chrome.storage.local.get(["token", "userId", "FreeUser", "freeUsage"], function(data) {
    const token = data.token;
    const userId = data.userId;
    const isFreeUser = data.FreeUser === true;
    const freeUsage = parseInt(data.freeUsage || "0");
    const remainingUses = Math.max(0, 3 - freeUsage);

    // Show for authenticated users or free users with remaining trials
    if ((token && userId) || (isFreeUser && remainingUses > 0)) {
      if (isFreeUser && remainingUses > 0 && (!token || !userId)) {
        // Update display for free users
        // Remove any previous styling classes
        editButton.classList.remove("free-trial-counter");

        // Update content and add free trial counter styling
        editButton.innerHTML = `
          <span><img class="coinicon" src="./assets/Tokens.png" alt="coin"></span>
          <span>${remainingUses}/3</span>
        `;
        editButton.style.display = "flex";
        editButton.title = `${remainingUses} free trials remaining`;
        editButton.classList.add("free-trial-counter");
      }
      // For authenticated users, updateCreditDisplay will handle it
    } else {
      // Hide the button for non-authenticated non-free users or if free trials are used up
      editButton.style.display = "none";
    }
  });
}

// Set up a MutationObserver to continuously monitor and hide the token button if needed
function setupTokenButtonObserver() {
  // Check authentication status first
  chrome.storage.local.get(["token", "userId", "FreeUser", "freeUsage"], function(data) {
    const token = data.token;
    const userId = data.userId;
    const isFreeUser = data.FreeUser === true;
    const freeUsage = parseInt(data.freeUsage || "0");
    const remainingUses = Math.max(0, 3 - freeUsage);

    // Only set up the observer if the user is not authenticated and not a free user with remaining trials
    if ((!token || !userId) && (!isFreeUser || remainingUses <= 0)) {
      const editButton = document.getElementById("editButton");
      if (!editButton) return;

      // Force hide the button first
      editButton.style.display = "none";

      // Create a MutationObserver to watch for style changes
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === 'style' && editButton.style.display !== 'none') {
            // If the button becomes visible but shouldn't be, hide it again
            chrome.storage.local.get(["token", "userId", "FreeUser", "freeUsage"], function(latestData) {
              const isAuthenticated = latestData.token && latestData.userId;
              const isStillFreeUser = latestData.FreeUser === true;
              const currentFreeUsage = parseInt(latestData.freeUsage || "0");
              const currentRemainingUses = Math.max(0, 3 - currentFreeUsage);

              if (!isAuthenticated && (!isStillFreeUser || currentRemainingUses <= 0)) {
                editButton.style.display = 'none';
              }
            });
          }
        });
      });

      // Configure and start the observer
      observer.observe(editButton, { attributes: true, attributeFilter: ['style'] });

      // For extra safety, check periodically and hide if needed
      const intervalId = setInterval(function() {
        // Re-check authentication status
        chrome.storage.local.get(["token", "userId", "FreeUser", "freeUsage"], function(latestData) {
          const isAuthenticated = latestData.token && latestData.userId;
          const isStillFreeUser = latestData.FreeUser === true;
          const currentFreeUsage = parseInt(latestData.freeUsage || "0");
          const currentRemainingUses = Math.max(0, 3 - currentFreeUsage);

          if (!isAuthenticated && (!isStillFreeUser || currentRemainingUses <= 0) && editButton.style.display !== 'none') {
            editButton.style.display = 'none';
          } else if ((isAuthenticated || (isStillFreeUser && currentRemainingUses > 0)) && intervalId) {
            // If user becomes authenticated or a free user with remaining trials, clear the interval
            clearInterval(intervalId);
            observer.disconnect();
          }
        });
      }, 500);
    }
  });
}

/**
 * Handle the suggested LLM by creating a link to the appropriate service
 * @param {string} suggestedLLM - The name of the suggested LLM provider
 */
function handleSuggestedLLM(suggestedLLM) {
  // Define the mapping of LLM providers to their URLs and icons
  const llmMap = {
    'openai': {
      url: 'https://chat.openai.com',
      displayName: 'ChatGPT',
      icon: './assets/Chatgpt-icon.png'
    },
    'anthropic': {
      url: 'https://claude.ai/new',
      displayName: 'Claude',
      icon: './assets/Claude-icon.png'
    },
    'google': {
      url: 'https://gemini.google.com',
      displayName: 'Gemini',
      icon: './assets/Gemini-icon.png'
    },
    'perplexity': {
      url: 'https://www.perplexity.ai',
      displayName: 'Perplexity',
      icon: './assets/Perplexity-icon.png'
    },
    'grok': {
      url: 'https://grok.com',
      displayName: 'Grok',
      icon: './assets/Grok-icon.png'
    },
    'gamma': {
      url: 'https://gamma.app/create/generate',
      displayName: 'Gamma',
      icon: './assets/Gamma-icon.png'
    },
    'vercel': {
      url: 'https://v0.dev',
      displayName: 'Vercel V0',
      icon: './assets/VercelV0-icon.png'
    },
    'bolt': {
      url: 'https://bolt.new',
      displayName: 'Bolt',
      icon: './assets/Bolt-icon.png'
    },
    'mistral': {
      url: 'https://chat.mistral.ai/chat',
      displayName: 'Mistral',
      icon: './assets/Mistral-icon.png'
    },
    'lovable': {
      url: 'https://lovable.dev',
      displayName: 'Lovable',
      icon: './assets/Lovable-icon.png'
    },
    'replit': {
      url: 'https://replit.com',
      displayName: 'Replit',
      icon: './assets/Replit-icon.png'
    },
    'suno': {
      url: 'https://suno.com',
      displayName: 'Suno',
      icon: './assets/Suno-icon.png'
    }
  };

  // Log the original suggested LLM for debugging
  // // console.log("[Velocity Debug] Original suggested LLM from API:", suggestedLLM);

  // Normalize the LLM name to match our keys
  let normalizedLLM = suggestedLLM.toLowerCase().trim();

  // Handle different cases from the API
  switch(normalizedLLM) {
    case 'chatgpt':
    case 'gpt4':
    case 'gpt-4':
    case 'gpt3':
    case 'gpt-3':
    case 'gpt-3.5':
    case 'gpt':
    case 'openai':
      normalizedLLM = 'openai';
      break;
    case 'claude':
    case 'claude-2':
    case 'claude-3':
    case 'anthropic':
      normalizedLLM = 'anthropic';
      break;
    case 'gemini':
    case 'bard':
    case 'palm':
    case 'google':
      normalizedLLM = 'google';
      break;
    case 'grok':
    case 'x.ai':
      normalizedLLM = 'grok';
      break;
    case 'gamma':
      normalizedLLM = 'gamma';
      break;
    case 'v0':
    case 'vercel v0':
    case 'vercel':
      normalizedLLM = 'vercel';
      break;
    case 'bolt':
      normalizedLLM = 'bolt';
      break;
    case 'perplexity':
      normalizedLLM = 'perplexity';
      break;
    case 'mistral':
    case 'mistral-ai':
    case 'mistral.ai':
      normalizedLLM = 'mistral';
      break;
    case 'lovable':
    case 'lovable.dev':
      normalizedLLM = 'lovable';
      break;
    case 'replit':
    case 'repl.it':
      normalizedLLM = 'replit';
      break;
    case 'suno':
    case 'suno.ai':
      normalizedLLM = 'suno';
      break;
    case 'dalle':
    case 'dall-e':
    case 'dall e':
      normalizedLLM = 'openai'; // DALL-E is OpenAI, so redirect to ChatGPT
      break;
    default:
      // If we don't recognize the LLM name, try to match it to one of our keys
      if (Object.keys(llmMap).includes(normalizedLLM)) {
        // The normalized name is already a valid key
      } else {
        // Try to find a partial match
        for (const key of Object.keys(llmMap)) {
          if (normalizedLLM.includes(key) || key.includes(normalizedLLM)) {
            normalizedLLM = key;
            // // console.log(`[Velocity Debug] Partial match found: ${suggestedLLM} -> ${key}`);
            break;
          }
        }
      }
      break;
  }

  // // console.log("[Velocity Debug] Normalized LLM:", normalizedLLM);
  // // console.log("[Velocity Debug] Available LLM keys:", Object.keys(llmMap));

  // Get the LLM info from our map, or default to ChatGPT
  const llmInfo = llmMap[normalizedLLM] || llmMap['openai'];

  // If we're defaulting to ChatGPT, log it
  if (normalizedLLM !== 'openai' && llmInfo === llmMap['openai']) {
    // // console.log(`[Velocity Debug] No match found for "${normalizedLLM}", defaulting to ChatGPT`);
  }

  // // console.log(`[Velocity Debug] Suggested LLM: ${suggestedLLM}, Normalized: ${normalizedLLM}, Final LLM: ${llmInfo.displayName}`);

  // Update the responses header to indicate we're done loading
  const responsesHeader = document.querySelector(".responses-header h2");
  if (responsesHeader) {
    responsesHeader.textContent = "Your prompt is ready!";
  }

  const responsesWrapper = document.getElementById("responsesWrapper");
  if (!responsesWrapper) {
    //// console.log("responsesWrapper not found in DOM");
    return;
  }

  const platformSelector = responsesWrapper.querySelector(".platform-selector");
  if (!platformSelector) {
    //// console.log("platformSelector not found in DOM");
    return;
  }

  // Recreate the platform name element first since it might have been replaced by skeleton
  if (!platformSelector.querySelector(".platform-name")) {
    // Clear any existing click handlers from the platform button before recreating
    if (typeof clearButtonClickHandlers === 'function') {
      clearButtonClickHandlers('openInPlatformButton', true);
    }

    // Remove any skeleton elements first
    while (platformSelector.firstChild) {
      platformSelector.removeChild(platformSelector.firstChild);
    }

    // Add the basic structure back
    platformSelector.innerHTML = `
      <span class="open-in-text">Open in</span>
      <div class="platform-name"></div>
      <button id="openInPlatformButton" class="send-button" aria-label="Send to LLM">
        <img src="./assets/send-arrow.png" alt="Open LLM selection" class="dropdown-arrow send-arrow-icon" data-darkmode-src="./assets/send-arrow-darkmode.png">
      </button>
    `;
  }

  const platformName = platformSelector.querySelector(".platform-name");
  if (!platformName) {
    //// console.log("platformName not found in DOM");
    return;
  }

  const openInPlatformButton = document.getElementById("openInPlatformButton");
  if (!openInPlatformButton) {
    //// console.log("openInPlatformButton not found in DOM");
    return;
  }

  // Enable the button which might have been disabled during loading
  openInPlatformButton.disabled = false;

  // Make sure responses wrapper is visible
  if (responsesWrapper.classList.contains("hidden")) {
    responsesWrapper.classList.remove("hidden");
    responsesWrapper.classList.add("visible");
  }

  // Update the platform UI to show the suggested LLM
  platformName.innerHTML = `
    <img src="${llmInfo.icon}" alt="${llmInfo.displayName}" class="platform-icon">
    <span>${llmInfo.displayName}</span>
    <img src="./assets/downarrow.png" alt="Open LLM selection" class="dropdown-arrow">
  `;

  // Set the platform URL and name in the button's dataset
  openInPlatformButton.dataset.platformUrl = llmInfo.url;
  openInPlatformButton.dataset.platformName = llmInfo.displayName;
  openInPlatformButton.dataset.platformKey = normalizedLLM;

  // Add a visual highlight to the platform selector to draw attention
  platformSelector.classList.add("highlight");

  // Re-initialize the click handlers for the platform selector
  if (typeof setupPlatformSelector === 'function') {
    setupPlatformSelector();
  } else if (typeof window.setupPlatformSelector === 'function') {
    window.setupPlatformSelector();
  }
}

// Make handleSuggestedLLM globally available for stateManager
window.handleSuggestedLLM = handleSuggestedLLM;

// Add these new functions for skeleton loader
function showSkeletonLoader() {
  // Switch to response view
  const mainContent = document.getElementById("mainContent");
  const responsesWrapper = document.getElementById("responsesWrapper");

  mainContent.classList.add("hidden");
  responsesWrapper.classList.remove("hidden");

  // Add visible class after a short delay for smooth animation
  setTimeout(() => {
    responsesWrapper.classList.add("visible");
  }, 50);

  // Replace header with just "Enhancing..." text instead of a skeleton
  const responsesHeader = responsesWrapper.querySelector(".responses-header");
  if (responsesHeader) {
    responsesHeader.innerHTML = `<h2>Enhancing...</h2>`;
  }

  // Replace responses grid with skeleton
  const responsesGrid = responsesWrapper.querySelector(".responses-grid");
  if (responsesGrid) {
    responsesGrid.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    `;
  }

  // Replace platform selector with skeleton
  const platformSelector = responsesWrapper.querySelector(".platform-selector");
  if (platformSelector) {
    platformSelector.innerHTML = `
      <span class="open-in-text">Open in</span>
      <div class="platform-skeleton">
        <div class="platform-skeleton-icon"></div>
        <div class="platform-skeleton-text"></div>
      </div>
      <button id="openInPlatformButton" class="send-button" aria-label="Send to LLM" disabled data-has-click-handler="false">
        <img src="./assets/send-arrow.png" alt="Open LLM selection" class="dropdown-arrow send-arrow-icon" data-darkmode-src="./assets/send-arrow-darkmode.png">
      </button>
    `;

    // Mark the button as not having a click handler
    const openInPlatformButton = document.getElementById("openInPlatformButton");
    if (openInPlatformButton) {
      openInPlatformButton._hasClickHandler = false;
    }
  }
}

function hideSkeletonLoader() {
  const mainContent = document.getElementById("mainContent");
  const responsesWrapper = document.getElementById("responsesWrapper");

  // Hide responses
  responsesWrapper.classList.remove("visible");
  setTimeout(() => {
    // Add hidden class after transition
    responsesWrapper.classList.add("hidden");

    // Show main content
    mainContent.classList.remove("hidden");
  }, 300);
}

/**
 * Mark extension as installed for the user
 * @param {string} userId - The user ID
 * @param {string} token - The authentication token
 */
async function markExtensionInstalled(userId, token) {
  try {
    // Check if we've already marked this user as installed to avoid duplicate calls
    const storageKey = `extensionInstalled_${userId}`;
    const installationData = await new Promise(resolve => {
      chrome.storage.local.get([storageKey], resolve);
    });

    if (installationData[storageKey]) {
      // Already marked as installed for this user
      return { success: true, message: "Already marked as installed" };
    }

    // Call the API to mark extension as installed
    const response = await fetch(`${BACKEND_URL}/ext-install`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        installed: true
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Mark as installed in local storage to prevent duplicate calls
      chrome.storage.local.set({ [storageKey]: true });
      
      // Track the installation event
      popupTrackEvent("Extension Installation Marked", {
        user_id: userId,
        user_type: "paid",
        success: true
      });

      // console.log("Extension marked as installed for user:", userId);
      return { success: true, data: data };
    } else {
      throw new Error(data.message || "Failed to mark extension as installed");
    }
  } catch (error) {
    console.error("Error marking extension as installed:", error);
    
    // Track the error
    popupTrackEvent("Extension Installation Mark Failed", {
      user_id: userId,
      error_message: error.message,
      user_type: "paid"
    });

    return { success: false, error: error.message };
  }
}

// Function to handle the enhance prompt response
function handleEnhanceResponse(response) {
  // console.log('[Velocity Popup] Handling enhance response:', {
  //   dataType: typeof response,
  //   hasEnhancedPrompt: response.enhanced_prompt ? 'yes' : 'no',
  //   enhancedPromptLength: response.enhanced_prompt?.length || 0,
  //   enhancedPromptSample: response.enhanced_prompt?.substring(0, 100) + '...',
  //   hasSuggestedLLM: response.suggested_llm ? 'yes' : 'no',
  //   suggestedLLM: response.suggested_llm,
  //   processing_time_ms: response.processing_time_ms,
  //   relevance_analysis: response.relevance_analysis
  // });

  // Store the full response for savePromptReview to use
  window.velocityEnhanceResponse = {
    fullResponse: response
  };
  // console.log('[Velocity Popup] Stored enhance response in window.velocityEnhanceResponse');

  // Get the response container
  const responseContainer = document.querySelector(".responses-wrapper");
  if (!responseContainer) {
    console.error('[Velocity Popup] Response container not found');
    return;
  }

  // Show the response container
  responseContainer.classList.remove("hidden");

  // Handle the enhanced prompt
  if (response.enhanced_prompt) {
    // Create response elements
    const responseElements = createResponseElement({
      prompt: response.enhanced_prompt,
      style: getSelectedStyle() || "Descriptive",
      platform: getSelectedPlatform() || "ChatGpt"
    });

    // Add response elements to the container
    const responsesGrid = responseContainer.querySelector(".responses-grid");
    if (responsesGrid) {
      responsesGrid.innerHTML = ''; // Clear existing content
      responsesGrid.appendChild(responseElements);
    }

    // Handle suggested LLM if available
    if (response.suggested_llm) {
      handleSuggestedLLM(response.suggested_llm);
    }

    // Track successful enhancement
    popupTrackEvent("Enhancement Success", {
      style: getSelectedStyle() || "none",
      platform: getSelectedPlatform() || "none",
      original_length: response.original_prompt?.length || 0,
      enhanced_length: response.enhanced_prompt.length,
      processing_time_ms: response.processing_time_ms,
      suggested_llm: response.suggested_llm
    });
  } else {
    console.error('[Velocity Popup] No enhanced prompt in response');
    showError("Failed to enhance prompt");
  }
}

// Helper to get user info from chrome.storage.local
function getPopupUserInfo(callback) {
  chrome.storage && chrome.storage.local.get(["userId", "userName"], (data) => {
    callback({
      user_id: data.userId || "anonymous",
      user_name: data.userName || "anonymous"
    });
  });
}

// Patch for all popup event tracking
function popupTrackEvent(eventName, properties = {}) {
  // Always prefix event name
  const prefixedEventName = eventName.startsWith("popup_event_") ? eventName : `popup_event_${eventName.replace(/\s+/g, '_').toLowerCase()}`;
  getPopupUserInfo((userInfo) => {
    const mergedProps = { ...properties, ...userInfo };
    trackEvent(prefixedEventName, mergedProps);
  });
}

// Log popup load
logToBackend('info', 'Popup loaded', { timestamp: new Date().toISOString() });

document.addEventListener('DOMContentLoaded', function() {
  logToBackend('info', 'Popup DOMContentLoaded', { timestamp: new Date().toISOString() });
  initMixpanel();
});
window.onload = function() {
  logToBackend('info', 'Popup window.onload', { timestamp: new Date().toISOString() });
  initMixpanel();
};

// Example: Enhance button click user action log
const enhanceBtn = document.getElementById('enhance-btn');
if (enhanceBtn) {
  enhanceBtn.addEventListener('click', function() {
    logToBackend('info', 'User clicked enhance in popup', {});
  });
}

// Example: log user info missing
function handleUserInfoMissing(context) {
  logToBackend('error', 'User info missing in popup', { context });
}

// Example: catch block logging
try {
} catch (error) {
  logToBackend('error', 'Exception in popup', { error: error.message, stack: error.stack });
}

