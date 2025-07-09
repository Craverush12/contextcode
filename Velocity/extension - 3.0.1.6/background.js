import {
  promptAnalysis,
  EnhancePromptV2,
  savePromptReview,
  saveFeedback,
  getRecommendation,
  getClarifyingQuestions,
  refinePrompt,
  insertRefinedPrompt,
} from "./api.js";
import { trackGAEvent } from "./analytics/ga4-measurement-protocol.js";

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = "unknown";

  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
  } else if (userAgent.indexOf("Edge") > -1) {
    browserName = "Edge";
  } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
    browserName = "Opera";
  }
  return browserName;
}

// --- GA4 Session Tracking Variables ---
let platformSessions = {};
let platformButtonClicks = {};
let apiCallCounts = {};

// --- GA4 Session Tracking Functions ---
function startPlatformSession(platform) {
  const now = Date.now();
  platformSessions[platform] = now;
  platformButtonClicks[platform] = 0;
  apiCallCounts = {};

  trackGAEvent("platform_session_start", {
    platform: platform,
    timestamp_millis: now,
  }).catch((error) => {
    /* console.error("GA4 Error tracking session start:", error) */
  });
}

function endPlatformSession(platform) {
  if (platformSessions[platform]) {
    const startTime = platformSessions[platform];
    const duration = Date.now() - startTime;
    const clicks = platformButtonClicks[platform] || 0;

    trackGAEvent("platform_session_end", {
      platform: platform,
      engagement_time_msec: duration.toString(),
      button_clicks: clicks,
    }).catch((error) => {
      /* console.error("GA4 Error tracking session end:", error) */
    });

    delete platformSessions[platform];
  }
}

function trackMixpanelEvent(eventName, properties = {}) {
  try {
    // Send message to popup to track the event
    chrome.runtime
      .sendMessage({
        action: "track_mixpanel_event",
        eventName: eventName,
        properties: {
          ...properties,
          source: "background",
          timestamp: new Date().toISOString(),
        },
      })
      .catch((error) => {
        console.warn("[Velocity Background] Error sending Mixpanel tracking message:", error);

        // If popup is not available, we'll store the event to track later
        chrome.storage.local.get(["pendingMixpanelEvents"], function (result) {
          const pendingEvents = result.pendingMixpanelEvents || [];
          pendingEvents.push({
            eventName,
            properties: {
              ...properties,
              source: "background",
              timestamp: new Date().toISOString(),
            },
          });
          chrome.storage.local.set({ pendingMixpanelEvents: pendingEvents });
        });
      });
  } catch (error) {
    console.error("[Velocity Background] Error in trackMixpanelEvent:", error);
    
    // Fallback: store event for later tracking
    chrome.storage.local.get(["pendingMixpanelEvents"], function (result) {
      const pendingEvents = result.pendingMixpanelEvents || [];
      pendingEvents.push({
        eventName,
        properties: {
          ...properties,
          source: "background",
          timestamp: new Date().toISOString(),
        },
      });
      chrome.storage.local.set({ pendingMixpanelEvents: pendingEvents });
    });
  }
}

// --- Core Extension Logic ---
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    trackGAEvent("extension_installed", {
      reason: details.reason,
      language: chrome.i18n.getUILanguage(),
    }).catch((error) => {
    });

    chrome.storage.local.set({
      enabled: true,
      FreeUser: true,
      freeUsage: 0,
      firstInstall: true,
      welcomeDismissed: true, // Set to true to disable welcome message
      firstTimeOpened: false, // Initialize to false so tutorial shows on first open
      tutorialShown: false, // Initialize to false so tutorial can be shown
    });

    // Track Free Trial Started event with Mixpanel
    trackMixpanelEvent("Free Trial Started", {
      installation_source: details.previousVersion ? "update" : "new_install",
      browser: getBrowserInfo(),
      language: chrome.i18n.getUILanguage(),
      timestamp: new Date().toISOString(),
    });

    
    // Open popup instead of registration page
    chrome.action.openPopup();
    // Open Velocity website in a new tab
    chrome.tabs.create({ url: "https://thinkvelocity.in/welcome-to-velocity/" });
  } else {
    chrome.storage.local.get("enabled", ({ enabled }) => {
      if (enabled === undefined) {
        chrome.storage.local.set({ enabled: true });
      }
    });
  }
  // Set a flag in localStorage to indicate the extension has been installed for lander to check
  chrome.storage.local.set({ extensionInstalled: true });
});

chrome.runtime.setUninstallURL("https://thinkvelocity.in/reviews", () => {
  if (chrome.runtime.lastError) {
    // console.error("Error setting uninstall URL:", chrome.runtime.lastError);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle fetch suggestions request (to bypass CORS)
  if (message.action === "fetchSuggestions") {
    // console.log("[Velocity Background] Received fetchSuggestions request:", message.url);
    
    // Make the fetch request from the background script using Authorization header
    fetch(message.url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": message.token
      }
    })
    .then(response => {
      return response.json();  // Parse JSON directly
    })
    .then(data => {
      return {
        success: true,
        status: 200,
        statusText: 'OK',
        data: JSON.stringify(data)  // Convert back to string for messaging
      };
    })
    .catch(error => {
      console.error("[Velocity Background] API error:", error);
      return {
        success: false,
        status: 500,
        statusText: error.message,
        data: '{}'
      };
    })
    .then(sendResponse);
    
    return true; // Keep the message channel open for async response
  }
  
  // Handle logging to backend (to bypass CORS)
  if (message.action === "logToBackend") {
    const BACKEND_URL = "https://thinkvelocity.in/backend-V1-D";
    fetch(`${BACKEND_URL}/extension/logs/${message.logType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: message.userId,
        message: message.message,
        metadata: message.metadata
      })
    })
    .then(() => sendResponse({ success: true }))
    .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep the message channel open for async response
  }
  
  // Handle showing notifications to the user
  if (message.action === "showNotification") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon128.png",
      title: message.title || "Velocity",
      message: message.message || "Action required",
      priority: 1
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Handle platform prompt injection events
  if (message.action === 'promptInsertedInPlatform' || message.action === 'promptInsertionFailed') {
    const eventName = message.action === 'promptInsertedInPlatform' 
      ? 'Prompt Injection Success' 
      : 'Prompt Injection Failed';
    
    // Track the event for analytics
    trackMixpanelEvent(eventName, {
      platform: message.platformName,
      platform_key: message.platformKey,
      prompt_length: message.promptLength,
      error: message.error || null,
      timestamp: new Date().toISOString()
    });
    
    // If this was a successful injection, clear the pending flag
    if (message.action === 'promptInsertedInPlatform') {
      chrome.storage.local.remove(['pendingPlatformInsertion']);
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "EnhancePromptV2") {
    // Get WebSocket data from storage
    chrome.storage.local.get(['velocityWebSocketResponse'], async (result) => {
      const wsIntentData = result.velocityWebSocketResponse?.main_intent || message.wsIntentData?.main_intent;
      
      try {
        const response = await EnhancePromptV2(
          message.prompt,
          message.style,
          message.platform,
          message.intent,
          message.intent_description,
          { main_intent: wsIntentData }
        );

        if (response.success && response.data?.enhanced_prompt) {
          // Save the prompt review here using savePromptReview
          const userId = (await chrome.storage.local.get("userId")).userId;
          if (userId) {
            await savePromptReview(
              userId,
              message.prompt,
              response.data.enhanced_prompt,
              message.platform,
              message.style,
              "general", // Assuming a default domain for now
              {
                processing_time_ms: response.data.metadata?.processing_time_ms || null,
                intent: wsIntentData?.category || message.intent,
                intent_description: wsIntentData?.description || message.intent_description,
                relevance_analysis: response.data.relevance_analysis,
              }
            );
          }
        }

        sendResponse(response);
      } catch (error) {
        console.error("[Velocity Background] ❌ Error in EnhancePromptV2:", {
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack?.split('\n')[0],
          timestamp: new Date().toISOString()
        });
        sendResponse({ success: false, error: error.message });
      }
    });

    return true; // Keep the message channel open for async response
  }

  // Handle opening login page when free trial has ended
  if (message.action === "openLoginPage") {
    // Track the event
    trackMixpanelEvent("Free Trial Login Clicked", {
      source: "toast_message",
      url: sender.tab?.url || "unknown",
    });

    // Open the login page
    chrome.tabs.create({ url: "https://thinkvelocity.in/login" });

    sendResponse({ success: true });
    return true;
  }

  // Handle Mixpanel tracking from content scripts
  if (message.action === "trackMixpanelEvent") {
    // Forward to popup for tracking
    chrome.runtime
      .sendMessage({
        action: "track_mixpanel_event",
        eventName: message.eventName,
        properties: {
          ...message.properties,
          source: "content_script",
          url: sender.tab?.url || "unknown",
          tab_id: sender.tab?.id || "unknown",
        },
      })
      .catch((error) => {
        chrome.storage.local.get(["pendingMixpanelEvents"], function (result) {
          const pendingEvents = result.pendingMixpanelEvents || [];
          pendingEvents.push({
            eventName: message.eventName,
            properties: {
              ...message.properties,
              source: "content_script",
              url: sender.tab?.url || "unknown",
              tab_id: sender.tab?.id || "unknown",
              timestamp: new Date().toISOString(),
            },
          });
          chrome.storage.local.set({ pendingMixpanelEvents: pendingEvents });
        });
      });

    sendResponse({ success: true });
    return true;
  }

  if (message.action === "button_injected") {
    // Track in both GA4 and Mixpanel
    trackGAEvent("button_injected", {
      platform: message.platform,
    }).catch((error) => {
      /* console.error("GA4 Error tracking button injection:", error) */
    });

    // Also track in Mixpanel
    trackMixpanelEvent("Button Injected", {
      platform: message.platform,
      url: sender.tab?.url || "unknown",
      tab_id: sender.tab?.id || "unknown",
      browser: getBrowserInfo(),
    });
  }

  if (message.action === "button_clicked") {
    if (message.platform && platformSessions[message.platform]) {
      platformButtonClicks[message.platform] =
        (platformButtonClicks[message.platform] || 0) + 1;
    }

    // Track with GA4
    trackGAEvent("enhance_button_clicked", {
      platform: message.platform,
    }).catch((error) => {
      /* console.error("GA4 Error tracking button click:", error) */
    });

    // Track with Mixpanel - "button-Enhanced" event
    trackMixpanelEvent("button-Enhanced", {
      platform: message.platform,
      url: sender.tab?.url || "unknown",
      tab_id: sender.tab?.id || "unknown",
      browser: getBrowserInfo(),
    });
  }

  if (message.action === "toggle_state") {
    trackGAEvent("extension_toggle", {
      enabled: message.enabled,
      platform: message.platform,
    }).catch((error) => {
     
    });

    // Track with Mixpanel
    trackMixpanelEvent("Extension Toggle", {
      enabled: message.enabled,
      platform: message.platform,
      url: sender.tab?.url || "unknown",
      tab_id: sender.tab?.id || "unknown",
      browser: getBrowserInfo(),
    });
  }

  if (message.action === "promptAnalysis") {
    trackMixpanelEvent("Prompt Analysis Requested", {
      platform: message.platform,
      prompt_length: message.prompt?.length || 0,
      style: message.style,
      browser: getBrowserInfo(),
    });

    promptAnalysis(message)
      .then((data) => {
        if (data.success) {
          trackMixpanelEvent("Prompt Analysis Success", {
            platform: message.platform,
            prompt_length: message.prompt?.length || 0,
            has_metrics: !!data.data?.metrics,
            has_recommendations: !!data.data?.recommendations,
            has_framework_analysis: !!data.data?.framework_analysis,
            browser: getBrowserInfo(),
          });

          sendResponse({
            success: true,
            data: data.data,
            
            metrics: data.data.metrics || {},
            recommendations: data.data.recommendations || {},
            framework_analysis: data.data.framework_analysis || {},
          });
        } else {
         
          trackMixpanelEvent("Prompt Analysis Error", {
            platform: message.platform,
            error_message: data.error || "Unknown error",
            browser: getBrowserInfo(),
          });

          sendResponse({
            success: false,
            error: data.error || "Unknown error",
          });
        }
      })
      .catch((error) => {
       
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === "storeUserData") {
    trackGAEvent("user_data_stored", {}).catch((error) => {
    });
    trackMixpanelEvent("User Logged In", {
      user_id: message.userId,
      user_name: message.userName,
      user_email: message.userEmail,
      login_source: message.source || "extension",
      browser: getBrowserInfo(),
      is_free_trial_conversion: message.wasOnFreeTrial === true,
    });

    chrome.storage.local.set(
      {
        token: message.token,
        userName: message.userName,
        userId: message.userId,
        userEmail: message.userEmail,
        FreeUser: false, 
      },
      () => {
        chrome.tabs.query(
          {
            url: [
              "*://chat.openai.com/*",
              "*://chatgpt.com/*",
              "*://claude.ai/*",
              "*://thinkvelocity.in/*",
              "*://gemini.google.com/*",
              "*://grok.com/*",
              "*://bolt.new/*",
              "*://v0.dev/*",
              "*://gamma.app/*",
              "*://chat.mistral.ai/*",
              "*://mistral.ai/*",
              "*://lovable.dev/*",
              "*://replit.com/*",
            ],
          },
          (tabs) => {
            tabs.forEach((tab) => {
              chrome.scripting
                .executeScript({
                  target: { tabId: tab.id },
                  files: [
                    "suggestionBox.js",
                    "content-script.js",
                  ],
                })
                .catch((err) => {
                 
                });
            });
          }
        );
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.action === "ping") {
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "open_extension_popup") {
    trackGAEvent("extension_popup_opened", {
      trigger: message.trigger || "unknown",
    }).catch((error) => {
     
    });

    
    trackMixpanelEvent("Extension Popup Opened", {
      trigger: message.trigger || "unknown",
      url: sender.tab?.url || "unknown",
      browser: getBrowserInfo(),
    });

    chrome.action.openPopup();
  }

  if (message.action === "openLoginPage") {
    trackGAEvent("free_trial_login_clicked", {
      platform: sender?.tab?.url || "unknown",
    })
    trackMixpanelEvent("Login Page Opened", {
      source: "extension",
      url: sender?.tab?.url || "unknown",
      tab_id: sender?.tab?.id || "unknown",
      browser: getBrowserInfo(),
    });

    chrome.tabs.create({ url: "https://thinkvelocity.in/login" });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "savePromptReview") {
    savePromptReview(
      message.userId,
      message.prompt,
      message.enhancedPrompt,
      message.aiType,
      message.style,
      message.domain,
      {
        processing_time_ms: message.processing_time_ms,
        intent: message.intent,
        intent_description: message.intent_description,
        relevance_analysis: message.relevance_analysis,
        refined_prompt: message.refined_prompt,
        refined_que_ans: message.refined_que_ans,
      }
    )
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error('[Velocity Background] Save prompt review error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; 
  }

  if (message.action === "saveFeedback") {
    saveFeedback(message.promptReviewId, message.feedback)
      .then((result) => {
        
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error("[Velocity Background] saveFeedback error:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; 
  }

  if (message.action === "getRecommendation") {
    getRecommendation(message.prompt)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error("[Velocity Background] getRecommendation error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
  
  if (message.action === "getClarifyingQuestions") {
    getClarifyingQuestions(message.prompt)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error(
          "[Velocity Background] getClarifyingQuestions error:",
          error
        );
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }

  if (message.action === "refinePrompt") {
    refinePrompt(message.originalPrompt, message.qaArray)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error("[Velocity Background] refinePrompt error:", error);
        console.error(
          "[Velocity Background] refinePrompt error message:",
          error.message
        );
        console.error(
          "[Velocity Background] refinePrompt error stack:",
          error.stack
        );
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }

  if (message.action === "insertRefinedPrompt") {
    insertRefinedPrompt(message.promptReviewId, message.refinedPrompt)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error(
          "[Velocity Background] insertRefinedPrompt error:",
          error
        );
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (/^(https|http):\/\/chat\.openai\.com/.test(tab.url) ||
      /^https:\/\/chatgpt\.com/.test(tab.url) ||
      /^https:\/\/claude\.ai/.test(tab.url) ||
      /^https:\/\/thinkvelocity\.in/.test(tab.url) ||
      /^https:\/\/gemini\.google\.com/.test(tab.url) ||
      /^https:\/\/grok\.com/.test(tab.url) ||
      /^https:\/\/bolt\.new/.test(tab.url) ||
      /^https:\/\/v0\.dev/.test(tab.url) ||
      /^https:\/\/gamma\.app/.test(tab.url) ||
      /^https:\/\/mistral\.ai\/chat/.test(tab.url) ||
      /^https:\/\/chat\.mistral\.ai/.test(tab.url) ||
      /^https:\/\/lovable\.dev/.test(tab.url) ||
      /^https:\/\/replit\.com/.test(tab.url))
  ) {
    chrome.storage.local.get(
      [
        "enabled",
        "token",
        "userName",
        "userId",
        "userEmail",
        "FreeUser",
        "freeUsage",
      ],
      ({
        enabled,
        token,
        userName,
        userId,
        userEmail,
        FreeUser,
        freeUsage,
      }) => {
        

        if (enabled && token && userName && userId && userEmail) {
          
          chrome.scripting
            .executeScript({
              target: { tabId },
              files: [
                "suggestionBox.js",
                "content-script.js",
              ],
            })
            .then(() => {
              
              trackGAEvent("content_script_injected", {
                url: tab.url,
                trigger: "tab_updated",
              }).catch((error) => {
              
              });

              trackMixpanelEvent("Content Script Injected", {
                url: tab.url,
                tab_id: tabId,
                trigger: "tab_updated",
                browser: getBrowserInfo(),
              });
            })
            .catch((err) => {
             
              trackGAEvent("content_script_injection_failed", {
                url: tab.url,
                error: err.message,
              }).catch((e) => {
               
              });
            });
        }
      }
    );
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && "enabled" in changes) {
    const isEnabled = changes.enabled.newValue;
    trackGAEvent("extension_toggle_storage", { enabled: isEnabled }).catch(
      (e) => {
      }
    );
    chrome.tabs.query(
      {
        url: [
          "*://chat.openai.com/*",
          "*://chatgpt.com/*",
          "*://claude.ai/*",
          "*://thinkvelocity.in/*",
          "*://gemini.google.com/*",
          "*://grok.com/*",
          "*://bolt.new/*",
          "*://v0.dev/*",
          "*://gamma.app/*",
          "*://chat.mistral.ai/*",
          "*://mistral.ai/*",
          "*://lovable.dev/*",
          "*://replit.com/*",
        ],
      },
      (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "extensionStateChanged",
              enabled: isEnabled,
            })
            .catch((err) => {
             
            });
        });
      }
    );
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    apiAuthKey:
      "a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf",
  });
  const keysToRemove = [
    "tabOpenTimestamp",
    "generationStartTime",
    "generationCompleteTime",
    "installTimestamp",
    "loginTimestamp",
    "platformSelectionTimestamp",
    "generatedPrompt",
    "lastSelectedPlatform",
    "lastSelectedPlatformKey",
    "lastSelectedPlatformUrl",
    "platformSelectionTimestamp",
    "userExplicitAction",
  ];

  chrome.storage.local.get(null, function (items) {
    const keysToRemoveFiltered = keysToRemove.filter((key) => key in items);
    if (keysToRemoveFiltered.length > 0) {
      chrome.storage.local.remove(keysToRemoveFiltered);
    }
  });
});

// Add function to clear stale platform insertions
function cleanupStalePendingInsertions() {
  chrome.storage.local.get(['pendingPlatformInsertion'], (result) => {
    if (result.pendingPlatformInsertion) {
      const { timestamp } = result.pendingPlatformInsertion;
      const insertionTime = new Date(timestamp).getTime();
      const now = Date.now();
      
      // If the pending insertion is older than 5 minutes, clean it up
      if ((now - insertionTime) > 300000) { // 5 minutes
        chrome.storage.local.remove(['pendingPlatformInsertion']);
        console.log('[Velocity] Cleaned up stale pending insertion');
      }
    }
  });
}

// Run cleanup every 5 minutes
setInterval(cleanupStalePendingInsertions, 300000);
