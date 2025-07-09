class PromptInjectionManager {
  constructor() {
    this.isInitialized = false;
    this.trackEvent = null;
    this.debugMode = false;
  }

  init(options = {}) {
    this.trackEvent = options.trackEvent || this._defaultTracker;
    this.debugMode = options.debugMode || false;
    this.isInitialized = true;

    // Set up listener for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'promptInsertedInPlatform') {
        this._logToBackend('info', 'Prompt successfully inserted in LLM platform', {
          platform_name: message.platformName,
          platform_key: message.platformKey,
          prompt_length: message.promptLength,
          tab_id: sender.tab?.id,
          success: true
        });
        
        this.trackEvent("LLM Prompt Inserted", {
          llm_provider: message.platformName,
          prompt_length: message.promptLength,
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (message.action === 'promptInsertionFailed') {
        this._logToBackend('error', 'Failed to insert prompt in LLM platform', {
          platform_name: message.platformName,
          platform_key: message.platformKey,
          prompt_length: message.promptLength,
          error_message: message.error,
          tab_id: sender.tab?.id,
          success: false
        });
        
        this.trackEvent("LLM Prompt Insertion Failed", {
          llm_provider: message.platformName,
          prompt_length: message.promptLength,
          error: message.error,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    });

    if (this.debugMode) {
      // console.log('[PromptInjectionManager] Initialized with options:', options);
    }
  }

  _defaultTracker(eventName, properties) {
    if (this.debugMode) {
      // console.log('[PromptInjectionManager] Track Event:', eventName, properties);
    }
  }

  _getPromptContent() {
    const responseContent = document.querySelector(".response-content");
    if (!responseContent) {
      console.error("[PromptInjectionManager] No response content found");
      // console.log("[PromptInjectionManager] Available elements:", document.querySelectorAll("*[class*='response']"));
      return null;
    }
    const content = responseContent.textContent;
    if (this.debugMode) {
      // console.log("[PromptInjectionManager] Found prompt content, length:", content.length);
    }
    return content;
  }

  async insertHere(options = {}) {
    if (!this.isInitialized) {
      throw new Error('PromptInjectionManager must be initialized before use');
    }

    const prompt = options.prompt || this._getPromptContent();
    if (!prompt) {
      const error = "No prompt content available for insertion";
      if (options.onError) options.onError(error);
      return false;
    }

    if (this.debugMode) {
      // console.log('[PromptInjectionManager] Insert Here - Prompt length:', prompt.length);
    }

    // Log insertion attempt to backend
    this._logToBackend('info', 'Insert Here clicked', {
      prompt_length: prompt?.length || 0,
      method: "direct_injection",
    });

    try {
      // Track the insertion attempt
      this.trackEvent("Insert Here Clicked", {
        prompt_length: prompt.length,
        method: "direct_injection",
        timestamp: new Date().toISOString()
      });

      // Get the active tab
      const tabs = await this._getActiveTab();
      if (!tabs || tabs.length === 0) {
        throw new Error("No active tab found");
      }

      const activeTab = tabs[0];

      // Send message to inject the prompt
      const response = await this._sendMessageToTab(activeTab.id, {
        action: "insertHere",
        prompt: prompt
      });

      if (response && response.success) {
        if (this.debugMode) {
          // console.log("[PromptInjectionManager] Successfully inserted prompt");
        }
        // Log successful insertion to backend
        this._logToBackend('info', 'Insert Here success', {
          prompt_length: prompt?.length || 0,
          tab_url: activeTab?.url || 'unknown'
        });
        if (options.onSuccess) options.onSuccess(response);
        return true;
      } else {
        throw new Error("Injection failed - no success response");
      }

    } catch (error) {
      console.error("[PromptInjectionManager] Insert Here failed:", error);

      // Log error to backend
      this._logToBackend('error', 'Insert Here failed', {
        error_message: error?.message || 'Unknown error',
        prompt_length: prompt?.length || 0
      });

      // Try to inject content script and retry
      if (error.message.includes("Could not establish connection")) {
        return await this._retryWithScriptInjection(options, prompt);
      }

      if (options.onError) options.onError(error.message);
      return false;
    }
  }

  async openInPlatform(options = {}) {
    if (!this.isInitialized) {
      throw new Error('PromptInjectionManager must be initialized before use');
    }

    const { platformUrl, platformName, platformKey } = options;

    if (!platformUrl) {
      const error = "Platform URL is required for openInPlatform";
      console.error("[PromptInjectionManager]", error);
      if (options.onError) options.onError(error);
      return false;
    }

    const prompt = options.prompt || this._getPromptContent();
    if (!prompt) {
      const error = "No prompt content available for platform injection";
      if (options.onError) options.onError(error);
      return false;
    }

    if (this.debugMode) {
      // console.log(`[PromptInjectionManager] Opening platform: ${platformName}, URL: ${platformUrl}, Key: ${platformKey}`);
    }

    // Log sending to LLM platform to backend
    this._logToBackend('info', 'Send to LLM platform clicked', {
      platform_name: platformName,
      platform_key: platformKey,
      prompt_length: prompt?.length || 0
    });
    
    try {
      // Track the sending to platform
      this.trackEvent("Send to LLM Platform", {
        llm_provider: platformName,
        prompt_length: prompt.length,
        timestamp: new Date().toISOString()
      });

      // Store the prompt and platform info for auto-injection after redirect
      await this._setStorageData({
        pendingPlatformInsertion: {
          prompt: prompt,
          platformName: platformName,
          platformKey: platformKey,
          timestamp: new Date().toISOString()
        }
      });

      // Create a new tab with the platform URL
      const tab = await this._createTab(platformUrl);

      if (this.debugMode) {
        // console.log("[PromptInjectionManager] Tab created:", tab.id);
      }

      // After opening platform in a new tab, the content script will handle the injection
      // since we've stored the pending prompt in chrome.storage

      if (options.onSuccess) options.onSuccess({ tab, prompt });
      return true;

    } catch (error) {
      console.error("[PromptInjectionManager] Open in Platform failed:", error);

      // Log error to backend
      this._logToBackend('error', 'Send to LLM platform failed', {
        platform_name: platformName,
        platform_key: platformKey,
        error_message: error?.message || 'Unknown error',
        prompt_length: prompt?.length || 0
      });

      if (options.onError) options.onError(error.message);
      return false;
    }
  }

  _getActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, resolve);
    });
  }

  _sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  _createTab(url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url: url, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
  }

  _setStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  async _retryWithScriptInjection(options, prompt) {
    try {
      if (this.debugMode) {
        // console.log("[PromptInjectionManager] Retrying with script injection");
      }

      // Log retry attempt to backend
      this._logToBackend('warning', 'Insert Here retry with script injection', {
        prompt_length: prompt?.length || 0
      });

      const tabs = await this._getActiveTab();
      if (!tabs || tabs.length === 0) {
        throw new Error("No active tab found for retry");
      }

      const activeTab = tabs[0];

      // Inject content script
      await this._injectContentScript(activeTab.id);

      // Try again after injecting the script
      const response = await this._sendMessageToTab(activeTab.id, {
        action: "insertHere",
        prompt: prompt
      });

      if (response && response.success) {
        // Log successful retry to backend
        this._logToBackend('info', 'Insert Here retry success', {
          prompt_length: prompt?.length || 0,
          tab_url: activeTab?.url || 'unknown'
        });
        if (options.onSuccess) options.onSuccess(response);
        return true;
      } else {
        throw new Error("Retry injection failed");
      }

    } catch (error) {
      console.error("[PromptInjectionManager] Retry failed:", error);
      
      // Log retry failure to backend
      this._logToBackend('error', 'Insert Here retry failed', {
        error_message: error?.message || 'Unknown error',
        prompt_length: prompt?.length || 0
      });
      
      if (options.onError) options.onError(error.message);
      return false;
    }
  }

  _injectContentScript(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ["content-script.js"]
      }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  // Add helper for backend logging
  async _logToBackend(logType, message, metadata) {
    try {
      let userId = 'unknown';
      try {
        const storage = await new Promise((resolve) => {
          chrome.storage.local.get(['userId'], resolve);
        });
        if (storage.userId) userId = storage.userId;
      } catch (e) {}

      const BACKEND_URL = "https://thinkvelocity.in/backend-V1-D";
        // const BACKEND_URL = "http://localhost:3005";
      await fetch(`${backendUrl}/extension/logs/${logType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message,
          metadata: Object.assign({
            platform: 'promptInjectionManager.js',
            timestamp: new Date().toISOString(),
          }, metadata || {})
        })
      });
    } catch (e) {
      // Silent fail for logging errors
      if (this.debugMode) {
        console.error('[PromptInjectionManager] Logging error:', e);
      }
    }
  }
}

// Create singleton instance
const promptInjectionManager = new PromptInjectionManager();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PromptInjectionManager = PromptInjectionManager;
  window.promptInjectionManager = promptInjectionManager;
}

function setupInsertHereButton(buttonId, options = {}) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.error(`[PromptInjectionManager] Button with ID '${buttonId}' not found`);
    return;
  }

  // Check if button already has our click handler to prevent duplicates
  if (button._hasPromptInjectionClickHandler) {
    if (options.debugMode) {
      // console.log(`[PromptInjectionManager] Button ${buttonId} already has click handler, skipping setup`);
    }
    return;
  }

  // Initialize manager if not already done
  if (!promptInjectionManager.isInitialized) {
    promptInjectionManager.init(options);
  }

  // Create the click handler function
  const clickHandler = async function() {
    const success = await promptInjectionManager.insertHere({
      onSuccess: (response) => {
        if (options.debugMode) {
          // console.log("[PromptInjectionManager] Insert Here successful:", response);
        }

        // Close popup if requested
        if (options.closePopupOnSuccess && typeof window !== 'undefined' && window.close) {
          window.close();
        }
      },
      onError: (error) => {
        console.error("[PromptInjectionManager] Insert Here failed:", error);
      }
    });

    return success;
  };

  // Add click event listener
  button.addEventListener("click", clickHandler);

  // Mark button as having our click handler
  button._hasPromptInjectionClickHandler = true;
  button._promptInjectionClickHandler = clickHandler;

  if (options.debugMode) {
    // console.log(`[PromptInjectionManager] Setup Insert Here button: ${buttonId}`);
  }
}

function setupOpenInPlatformButton(buttonId, options = {}) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.error(`[PromptInjectionManager] Button with ID '${buttonId}' not found`);
    return;
  }

  // Check if button already has our click handler to prevent duplicates
  if (button._hasPromptInjectionClickHandler) {
    if (options.debugMode) {
      // console.log(`[PromptInjectionManager] Button ${buttonId} already has click handler, skipping setup`);
    }
    return;
  }

  // Initialize manager if not already done
  if (!promptInjectionManager.isInitialized) {
    promptInjectionManager.init(options);
  }

  // Create the click handler function
  const clickHandler = async function() {
    if (options.debugMode) {
      // console.log("[PromptInjectionManager] Platform button clicked!");
    }

    // Get platform data from button's dataset
    const platformUrl = this.dataset.platformUrl;
    const platformName = this.dataset.platformName;
    const platformKey = this.dataset.platformKey || platformName?.toLowerCase();

    if (options.debugMode) {
      // console.log("[PromptInjectionManager] Platform data:", {
      //   platformUrl,
      //   platformName,
      //   platformKey
      // });
    }

    const success = await promptInjectionManager.openInPlatform({
      platformUrl,
      platformName,
      platformKey,
      onSuccess: (result) => {
        if (options.debugMode) {
          // console.log("[PromptInjectionManager] Open in Platform successful:", result);
        }
      },
      onError: (error) => {
        console.error("[PromptInjectionManager] Open in Platform failed:", error);
      }
    });

    return success;
  };

  // Add click event listener
  button.addEventListener("click", clickHandler);

  // Mark button as having our click handler
  button._hasPromptInjectionClickHandler = true;
  button._promptInjectionClickHandler = clickHandler;

  if (options.debugMode) {
    // console.log(`[PromptInjectionManager] Setup Open in Platform button: ${buttonId}`);
  }
}

function clearButtonClickHandlers(buttonId, debugMode = false) {
  const button = document.getElementById(buttonId);
  if (!button) {
    if (debugMode) {
      // console.log(`[PromptInjectionManager] Button with ID '${buttonId}' not found for cleanup`);
    }
    return;
  }

  // Remove the stored click handler if it exists
  if (button._promptInjectionClickHandler) {
    button.removeEventListener("click", button._promptInjectionClickHandler);
    if (debugMode) {
      // console.log(`[PromptInjectionManager] Removed click handler from button: ${buttonId}`);
    }
  }

  // Clear the flags
  button._hasPromptInjectionClickHandler = false;
  button._promptInjectionClickHandler = null;
}

function setupPromptInjectionButtons(config = {}) {
  const {
    insertButtonId = "insertButton",
    openInPlatformButtonId = "openInPlatformButton",
    trackEvent,
    closePopupOnSuccess = false,
    debugMode = false
  } = config;

  const options = { trackEvent, debugMode, closePopupOnSuccess };

  // Setup Insert Here button
  if (insertButtonId) {
    setupInsertHereButton(insertButtonId, options);
  }

  // Setup Open in Platform button
  if (openInPlatformButtonId) {
    setupOpenInPlatformButton(openInPlatformButtonId, options);
  }

  if (debugMode) {
    // console.log("[PromptInjectionManager] Setup complete for both injection buttons");
  }
}

// Export convenience functions
if (typeof window !== 'undefined') {
  window.setupInsertHereButton = setupInsertHereButton;
  window.setupOpenInPlatformButton = setupOpenInPlatformButton;
  window.setupPromptInjectionButtons = setupPromptInjectionButtons;
  window.clearButtonClickHandlers = clearButtonClickHandlers;
}

// Also support module exports if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PromptInjectionManager,
    promptInjectionManager,
    setupInsertHereButton,
    setupOpenInPlatformButton,
    setupPromptInjectionButtons
  };
}
