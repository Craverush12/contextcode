/**
 * Writing Quality Analyzer
 *
 * This module handles real-time writing quality analysis via WebSocket connection.
 * It monitors input fields for text changes and updates a quality indicator UI.
 */

// Global state for the quality analyzer
window.velocityQualityState = {
  // WebSocket connection state
  socket: null,
  reconnectAttempts: 0,
  isConnected: false,
  messageQueue: [],

  // UI elements
  indicator: null,

  // Analysis state
  currentQuality: 'idle', // idle, suggestion, bad, ok, good
  isAnalyzing: false,
  lastAnalyzedText: '',
  lastCheckedText: '',  // For tracking content changes in periodic checks
  debounceTimer: null,
  contentCheckInterval: null,  // For periodic content checks

  // Button interaction state
  hiddenByButtonClick: false,  // Flag to track if indicator was hidden by button click
  indicatorStateBeforeDrag: null, // Store indicator state before dragging

  // Configuration
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000, // 2 seconds
  DEBOUNCE_DELAY: 300,

  // Platform info
  platform: null,

  // Connection state
  isConnecting: false,

  // New state for cleanup
  isUnloading: false,

  // New state for error handling
  lastError: null
};

// Add this at the top of the file after the velocityQualityState declaration
window.addEventListener('beforeunload', () => {
  cleanupQualityAnalyzer();
});

/**
 * Initialize the quality analyzer
 * @param {Object} config - Configuration options
 */
function initQualityAnalyzer(config = {}) {
  // Merge config with defaults
  const mergedConfig = {
    platform: window.velocityWrapperState?.platform || detectPlatform(),
    ...config
  };

  window.velocityQualityState.platform = mergedConfig.platform;

  // Create and inject the quality indicator
  createQualityIndicator();

  // Connect to WebSocket
  connectWebSocket();

  // Start monitoring input fields
  startInputMonitoring();

  // console.log("[Velocity Quality] Analyzer initialized for platform:", mergedConfig.platform);
}

/**
 * Create and inject the quality indicator UI
 */
function createQualityIndicator() {
  // First check if we already have an indicator
  if (window.velocityQualityState.indicator) {
    return;
  }

  // Try to get the button from the wrapper state first
  let buttonContainer = null;
  let velocityButton = null;

  // Check if we have a button in the wrapper state
  if (window.velocityWrapperState && window.velocityWrapperState.button) {
    buttonContainer = window.velocityWrapperState.button;
    velocityButton = buttonContainer.querySelector('button');
    // console.log("[Velocity Quality] Found button from wrapper state");
  }

  // If not found in wrapper state, try to find it in the DOM
  if (!velocityButton) {
    velocityButton = document.querySelector('.velocity-button-container button, .custom-injected-button button');
    if (velocityButton) {
      buttonContainer = velocityButton.closest('.velocity-button-container, .custom-injected-button');
      // console.log("[Velocity Quality] Found button from DOM query");
    }
  }

  // If still not found, retry after a short delay
  if (!velocityButton || !buttonContainer) {
    // console.log("[Velocity Quality] Button not found, will retry in 500ms");
    setTimeout(createQualityIndicator, 500);
    return;
  }

  // Create the indicator element
  const indicator = document.createElement('div');
  indicator.className = 'velocity-quality-indicator velocity-quality-idle';

  // Set explicit positioning styles to ensure it appears on the bottom left
  indicator.style.position = 'absolute';
  indicator.style.width = '12px';
  indicator.style.height = '12px';
  indicator.style.borderRadius = '50%';
  indicator.style.border = '2px solid #ffffff';
  indicator.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
  indicator.style.zIndex = '10000';

  // Append the indicator to the button element itself for better positioning
  velocityButton.style.position = 'relative';
  velocityButton.appendChild(indicator);
  // console.log("[Velocity Quality] Indicator attached directly to button element");

  // Store references
  window.velocityQualityState.indicator = indicator;

  // console.log("[Velocity Quality] Indicator created and attached to button");
}

/**
 * Check if the input field is empty and ensure idle state if it is
 * @returns {boolean} True if input is empty, false otherwise
 */
function ensureIdleStateForEmptyInput() {
  const platform = window.velocityQualityState.platform;
  if (!platform || !window.platforms) {
    return false;
  }

  const platformConfig = window.platforms[platform];
  if (!platformConfig || !platformConfig.textAreaSelector) {
    return false;
  }

  // Find the input field
  let inputField = window.velocityWrapperState?.inputBox;
  if (!inputField) {
    inputField = document.querySelector(platformConfig.textAreaSelector);
  }

  if (!inputField) {
    return false;
  }

  // Check if input is empty
  const text = getInputText(inputField);
  const isEmpty = !text || text.trim().length === 0;

  if (isEmpty) {
    // console.log("[Velocity Quality] Input is empty, forcing idle state");
    // Force update to idle state without calling updateQualityIndicator to avoid recursion
    const { indicator } = window.velocityQualityState;
    if (indicator) {
      // Remove all quality classes
      indicator.classList.remove(
        'velocity-quality-idle',
        'velocity-quality-bad',
        'velocity-quality-ok',
        'velocity-quality-good',
        'velocity-quality-analyzing'
      );

      // Add idle class
      indicator.classList.add('velocity-quality-idle');

      // Update state
      window.velocityQualityState.currentQuality = 'idle';
      window.velocityQualityState.isAnalyzing = false;
    }
  }

  return isEmpty;
}

/**
 * Update the quality indicator UI
 * @param {string} quality - The quality level (idle, bad, ok, good)
 * @param {boolean} isAnalyzing - Whether analysis is in progress
 */
function updateQualityIndicator(quality, isAnalyzing = false) {
  // console.log(`[Velocity Quality] updateQualityIndicator called: ${quality}, analyzing: ${isAnalyzing}`);

  // Add stack trace to debug what's calling this function
  if (quality === 'idle' && window.velocityQualityState.currentQuality !== 'idle') {
    // console.log('[Velocity Quality] WARNING: Attempting to set idle state when current state is not idle');
    // console.log('[Velocity Quality] Call stack:', new Error().stack);
  }

  // Only check for empty input if we're trying to set the state to idle
  // This prevents overriding valid quality states when there's actually content
  if (quality === 'idle') {
    const isEmpty = ensureIdleStateForEmptyInput();
    if (isEmpty) {
      // console.log('[Velocity Quality] Input is empty, confirmed idle state');
      return; // Exit early if input is empty and we're setting to idle
    } else {
      // console.log('[Velocity Quality] Input has content, refusing to set idle state');
      return; // Don't set to idle if there's content
    }
  }

  const { indicator } = window.velocityQualityState;

  if (!indicator) {
    console.warn('[Velocity Quality] No quality indicator found');
    return;
  }

  // console.log(`[Velocity Quality] Setting quality state: ${quality} (was: ${window.velocityQualityState.currentQuality})`);

  // Update state
  window.velocityQualityState.currentQuality = quality;
  window.velocityQualityState.isAnalyzing = isAnalyzing;

  // Remove all quality classes
  indicator.classList.remove(
    'velocity-quality-idle',
    'velocity-quality-bad',
    'velocity-quality-ok',
    'velocity-quality-good',
    'velocity-quality-analyzing'
  );

  // Add appropriate class
  indicator.classList.add(`velocity-quality-${quality}`);

  // Add analyzing class if needed
  if (isAnalyzing) {
    indicator.classList.add('velocity-quality-analyzing');
  }

  // Update message box if it exists and is visible
  if (window.velocityStateMessageBox && window.velocityMessageBoxState && window.velocityMessageBoxState.isVisible) {
    // console.log('[Velocity Quality] Updating message box from quality indicator update');

    // Check if there's content in the input field
    const hasContent = checkInputHasContent();
    // console.log(`[Velocity Quality] Input has content: ${hasContent}`);

    // Determine which state to show
    let stateToShow = quality;
    if (isAnalyzing) {
      stateToShow = 'analyzing';
    }

    // console.log(`[Velocity Quality] Updating message box to state: ${stateToShow}`);

    // Update the message box with the new state
    window.velocityStateMessageBox.update(stateToShow, { hasContent });
  } else {
    // console.log('[Velocity Quality] Message box not visible or not initialized, skipping update');
    if (!window.velocityStateMessageBox) {
      console.warn('[Velocity Quality] velocityStateMessageBox not found');
    }
    if (!window.velocityMessageBoxState) {
      console.warn('[Velocity Quality] velocityMessageBoxState not found');
    }
  }
}

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
  const state = window.velocityQualityState;
  
  if (state.isConnecting) {
    // console.log('[Velocity WebSocket] Already attempting to connect, skipping...');
    return;
  }

  if (state.reconnectAttempts >= state.MAX_RECONNECT_ATTEMPTS) {
    // console.error(`[Velocity WebSocket] Maximum reconnect attempts (${state.MAX_RECONNECT_ATTEMPTS}) reached`);
    return;
  }

  state.isConnecting = true;
  // console.log('[Velocity WebSocket] Attempting to connect...', {
  //   attempt: state.reconnectAttempts + 1,
  //   maxAttempts: state.MAX_RECONNECT_ATTEMPTS,
  //   timestamp: new Date().toISOString()
  // });

  try {
    // Close existing connection if any
    if (state.socket) {
      try {
        state.socket.close();
      } catch (e) {
        console.warn('[Velocity WebSocket] Error closing existing connection:', e);
      }
    }

    // Create new WebSocket connection with timeout
    const wsUrl = 'wss://thinkvelocity.in/python-backend-D/ws/domain-analysis';
    // console.log('[Velocity WebSocket] Connecting to:', wsUrl);
    
    state.socket = new WebSocket(wsUrl);
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (state.socket.readyState !== WebSocket.OPEN) {
        // console.error('[Velocity WebSocket] Connection timeout');
        state.socket.close();
        state.isConnecting = false;
        handleDisconnect();
      }
    }, 10000); // 10 second timeout

    // Connection opened
    state.socket.onopen = () => {
      clearTimeout(connectionTimeout);
      // console.log('[Velocity WebSocket] Connection established', {
      //   timestamp: new Date().toISOString()
      // });
      state.reconnectAttempts = 0;
      state.isConnecting = false;
      state.lastError = null;
      state.isConnected = true;
      
      // Start heartbeat after successful connection
      startHeartbeat();
      
      // Process any queued messages
      processMessageQueue();
    };

    // Connection closed
    state.socket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      // console.log('[Velocity WebSocket] Connection closed', {
      //   code: event.code,
      //   reason: event.reason,
      //   wasClean: event.wasClean,
      //   timestamp: new Date().toISOString()
      // });
      state.isConnecting = false;
      state.isConnected = false;

      // Attempt to reconnect if not cleanly closed
      if (!event.wasClean) {
        state.reconnectAttempts++;
        // console.log('[Velocity WebSocket] Attempting to reconnect...', {
        //   attempt: state.reconnectAttempts,
        //   maxAttempts: state.MAX_RECONNECT_ATTEMPTS,
        //   delay: state.RECONNECT_DELAY,
        //   timestamp: new Date().toISOString()
        // });
        setTimeout(connectWebSocket, state.RECONNECT_DELAY);
      }
    };

    // Connection error
    state.socket.onerror = (error) => {
      clearTimeout(connectionTimeout);
      // console.error('[Velocity WebSocket] Error occurred:', {
      //   error: error,
      //   lastError: state.lastError,
      //   timestamp: new Date().toISOString()
      // });
      state.lastError = error;
      state.isConnecting = false;
      state.isConnected = false;
    };

    // Message received
    state.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log('[Velocity WebSocket] Message received:', {
        //   type: data.type,
        //   timestamp: new Date().toISOString()
        // });
        handleWebSocketMessage(data);
      } catch (error) {
        // console.error('[Velocity WebSocket] Error parsing message:', {
        //   error: error,
        //   rawData: event.data,
        //   timestamp: new Date().toISOString()
        // });
      }
    };

  } catch (error) {
    // console.error('[Velocity WebSocket] Connection error:', {
    //   error: error,
    //   timestamp: new Date().toISOString()
    // });
    state.isConnecting = false;
    state.lastError = error;
    state.reconnectAttempts++;
    
    if (state.reconnectAttempts < state.MAX_RECONNECT_ATTEMPTS) {
      // console.log('[Velocity WebSocket] Scheduling reconnect...', {
      //   attempt: state.reconnectAttempts,
      //   maxAttempts: state.MAX_RECONNECT_ATTEMPTS,
      //   delay: state.RECONNECT_DELAY,
      //   timestamp: new Date().toISOString()
      // });
      setTimeout(connectWebSocket, state.RECONNECT_DELAY);
    }
  }
}

/**
 * Send heartbeat to keep connection alive
 */
function startHeartbeat() {
  const state = window.velocityQualityState;

  // Clear any existing interval
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
  }

  // Set up new interval
  state.heartbeatInterval = setInterval(() => {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      // console.warn('[Velocity WebSocket] Heartbeat skipped - WebSocket not open');
      return;
    }

    try {
      const heartbeatData = {
        type: "heartbeat",
        client_timestamp: Date.now(),
        module: "quality_analyzer",
        platform: state.platform || 'unknown'
      };
      
      state.socket.send(JSON.stringify(heartbeatData));
      // console.log('[Velocity WebSocket] Heartbeat sent:', {
      //   timestamp: new Date().toISOString()
      // });
    } catch (error) {
      // console.error('[Velocity WebSocket] Heartbeat error:', error);
      
      // If heartbeat fails, try to reconnect
      if (state.socket.readyState !== WebSocket.OPEN) {
        // console.log('[Velocity WebSocket] Heartbeat failed, attempting reconnect');
        state.socket.close();
        connectWebSocket();
      }
    }
  }, 30000); // 30 second interval

  // Send initial heartbeat immediately
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    try {
      const initialHeartbeat = {
        type: "heartbeat",
        client_timestamp: Date.now(),
        module: "quality_analyzer",
        platform: state.platform || 'unknown'
      };
      state.socket.send(JSON.stringify(initialHeartbeat));
      // console.log('[Velocity WebSocket] Initial heartbeat sent');
    } catch (error) {
      // console.error('[Velocity WebSocket] Initial heartbeat failed:', error);
    }
  }
}

/**
 * Handle quality analysis response from the server
 * @param {Object} analysis - The quality analysis data
 */
function handleQualityAnalysisResponse(analysis) {
  // console.log("[Velocity Quality] Processing quality analysis:", analysis);

  // Check if analysis is empty or null
  if (!analysis || (analysis.score === undefined && !analysis.quality)) {
    // console.log("[Velocity Quality] Empty or null analysis data");

    // Check if there's content in the input field
    const hasContent = checkInputHasContent();
    // console.log(`[Velocity Quality] Input has content: ${hasContent}`);

    if (hasContent) {
      // If there's content but no quality analysis, show blue indicator (idle state)
      // console.log('[Velocity Quality] Content exists but no quality analysis - showing idle state');
      updateQualityIndicator('idle', true); // Set isAnalyzing to true to show blue indicator
    } else {
      // If no content, show idle state
      // console.log('[Velocity Quality] No content - showing idle state');
      updateQualityIndicator('idle', false);
    }
    return;
  }

  // Update the quality indicator based on the analysis
  let quality = 'idle';

  if (analysis.score !== undefined) {
    // console.log("[Velocity Quality] Quality score:", analysis.score);

    if (analysis.score < 0.4) {
      quality = 'bad';
    } else if (analysis.score < 0.7) {
      quality = 'ok';
    } else {
      quality = 'good';
    }

    // console.log("[Velocity Quality] Determined quality level:", quality);
  } else {
    // console.log("[Velocity Quality] No score found in analysis data");

    // Check if there's content and show idle state with analyzing if no score available
    const hasContent = checkInputHasContent();
    if (hasContent) {
      quality = 'idle';
      // console.log("[Velocity Quality] No score but content exists - showing idle state with analyzing");
      updateQualityIndicator(quality, true); // Set isAnalyzing to true to show blue indicator
      return;
    }
  }

  // Update the quality indicator with the determined quality
  updateQualityIndicator(quality, false);
}

/**
 * Start monitoring input fields for text changes
 */
function startInputMonitoring() {
  const platform = window.velocityQualityState.platform;

  if (!platform || !window.platforms) {
    // console.error("[Velocity Quality] Cannot start monitoring: platform not detected");
    return;
  }

  const platformConfig = window.platforms[platform];
  if (!platformConfig || !platformConfig.textAreaSelector) {
    // console.error("[Velocity Quality] Invalid platform configuration");
    return;
  }

  // Find the input field
  let inputField = window.velocityWrapperState?.inputBox;

  if (!inputField) {
    inputField = document.querySelector(platformConfig.textAreaSelector);
  }

  if (!inputField) {
    // console.error("[Velocity Quality] Could not find input field to monitor");
    return;
  }

  // Check initial state - if input is empty, set to idle
  const initialText = getInputText(inputField);
  if (!initialText || initialText.trim().length === 0) {
    updateQualityIndicator('idle', false);
    window.velocityQualityState.lastAnalyzedText = '';
  }

  // Set up input event listeners
  const monitorInput = () => {
    const state = window.velocityQualityState;
    const text = getInputText(inputField);

    // Debug the input monitoring
    // console.log("[Velocity Quality] monitorInput called:", {
    //   textLength: text ? text.length : 0,
    //   textFirstChars: text ? text.substring(0, 30) + "..." : "null/empty",
    //   lastAnalyzedTextLength: state.lastAnalyzedText ? state.lastAnalyzedText.length : 0,
    //   lastAnalyzedTextFirstChars: state.lastAnalyzedText ? state.lastAnalyzedText.substring(0, 30) + "..." : "null/empty",
    //   isEmpty: !text || text.trim().length === 0,
    //   callStack: new Error().stack
    // });

    // Immediately check if text is empty and set to idle if it is
    if (!text || text.trim().length === 0) {
      // console.log("[Velocity Quality] Text is empty in monitorInput, setting to idle");
      updateQualityIndicator('idle', false);
      return; // Exit early if there's no text to analyze
    } else {
      // console.log(`[Velocity Quality] Text detected in monitorInput: "${text.substring(0, 50)}..."`);
      // Show idle state while waiting for analysis
      updateQualityIndicator('idle', true);
    }

    // Clear existing timer
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // Debounce the analysis request
    state.debounceTimer = setTimeout(() => {
      const currentText = getInputText(inputField);

      // Check again if text is empty (might have changed during debounce)
      if (!currentText || currentText.trim().length === 0) {
        // Reset to idle if text is empty
        updateQualityIndicator('idle', false);
        state.lastAnalyzedText = '';
        return;
      }

      // Only analyze if text has changed and is not empty
      if (currentText && currentText !== state.lastAnalyzedText) {
        // console.log("[Velocity Quality] Text changed, sending for analysis");
        // Trim the text to remove any leading/trailing whitespace
        const trimmedText = currentText.trim();
        sendTextForAnalysis(trimmedText);
        state.lastAnalyzedText = trimmedText;
      } else {
        // console.log("[Velocity Quality] Text unchanged or condition failed:", {
        //   hasCurrentText: !!currentText,
        //   isDifferentFromLast: currentText !== state.lastAnalyzedText
        // });
        // Text hasn't changed, stop analyzing animation
        updateQualityIndicator(state.currentQuality, false);
      }
    }, state.DEBOUNCE_DELAY);
  };

  // Add event listeners based on element type
  if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
    // Listen for standard input events
    inputField.addEventListener('input', monitorInput);

    // Add clipboard event listeners to catch paste operations
    inputField.addEventListener('paste', monitorInput);

    // Add keyup listeners for specific keys that might modify content
    inputField.addEventListener('keyup', (e) => {
      // Check for keys that might modify content: Ctrl+V, Ctrl+X, Delete, Backspace
      if (e.key === 'v' && (e.ctrlKey || e.metaKey) ||
          e.key === 'x' && (e.ctrlKey || e.metaKey) ||
          e.key === 'Delete' ||
          e.key === 'Backspace') {
        monitorInput();
      }
    });

    // Set up a periodic check for content changes
    const periodicCheck = () => {
      const state = window.velocityQualityState;
      const currentText = getInputText(inputField);

      // Debug the periodic check
      // console.log("[Velocity Quality] Periodic check:", {
      //   currentTextLength: currentText ? currentText.length : 0,
      //   currentTextFirstChars: currentText ? currentText.substring(0, 30) + "..." : "null/empty",
      //   lastCheckedTextLength: state.lastCheckedText ? state.lastCheckedText.length : 0,
      //   lastCheckedTextFirstChars: state.lastCheckedText ? state.lastCheckedText.substring(0, 30) + "..." : "null/empty",
      //   hasChanged: currentText !== state.lastCheckedText,
      //   lastAnalyzedTextLength: state.lastAnalyzedText ? state.lastAnalyzedText.length : 0,
      //   source: "periodic check"
      // });

      // If text has changed but no events were triggered, run monitorInput
      if (currentText !== state.lastCheckedText) {
        // console.log("[Velocity Quality] Text changed in periodic check, running monitorInput");
        state.lastCheckedText = currentText;
        monitorInput();
      }
    };

    // Check every 2 seconds for changes that might have been missed
    const checkInterval = setInterval(periodicCheck, 2000);
    window.velocityQualityState.contentCheckInterval = checkInterval;

  } else if (inputField.getAttribute('contenteditable') === 'true') {
    // For contenteditable elements, add more comprehensive event listeners
    inputField.addEventListener('input', monitorInput);
    inputField.addEventListener('paste', monitorInput);
    inputField.addEventListener('cut', monitorInput);
    inputField.addEventListener('keyup', monitorInput);

    // Also use MutationObserver as a fallback
    const observer = new MutationObserver(monitorInput);
    observer.observe(inputField, {
      childList: true,
      characterData: true,
      subtree: true
    });

    // Store observer for cleanup
    window.velocityQualityState.inputObserver = observer;
  } else {
    // For other elements, use MutationObserver with more comprehensive config
    const observer = new MutationObserver(monitorInput);
    observer.observe(inputField, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      characterDataOldValue: true
    });

    // Store observer for cleanup
    window.velocityQualityState.inputObserver = observer;
  }

  // Try to find the enhance button and add a listener to it
  try {
    // Look for the enhance button in the DOM
    const enhanceButton = document.querySelector('.velocity-enhance-button, [data-testid="velocity-enhance-button"]');
    if (enhanceButton) {
      // console.log("[Velocity Quality] Found enhance button, adding click listener");
      enhanceButton.addEventListener('click', () => {
        // console.log("[Velocity Quality] Enhance button clicked, scheduling text check");
        // Schedule multiple checks after the enhance button is clicked
        // This helps catch the text change that happens after enhancement
        setTimeout(() => {
          // console.log("[Velocity Quality] Running post-enhance check (250ms)");
          // Force reset the lastAnalyzedText to ensure the condition passes
          window.velocityQualityState.lastAnalyzedText = '';
          monitorInput();
        }, 250);

        setTimeout(() => {
          // console.log("[Velocity Quality] Running post-enhance check (500ms)");
          window.velocityQualityState.lastAnalyzedText = '';
          monitorInput();
        }, 500);

        setTimeout(() => {
          // console.log("[Velocity Quality] Running post-enhance check (1000ms)");
          window.velocityQualityState.lastAnalyzedText = '';
          monitorInput();
        }, 1000);
      });
    } else {
      // console.log("[Velocity Quality] Enhance button not found");
    }
  } catch (error) {
    // console.error("[Velocity Quality] Error setting up enhance button listener:", error);
  }

  // console.log("[Velocity Quality] Input monitoring started");
}

/**
 * Get text from input field
 * @param {Element} inputField - The input field element
 * @returns {string} The text content
 */
function getInputText(inputField) {
  if (!inputField) {
    // console.log("[Velocity Quality] getInputText: Input field is null or undefined");
    return '';
  }

  let text = '';
  const tagName = inputField.tagName;
  const isContentEditable = inputField.getAttribute('contenteditable') === 'true';

  if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
    text = inputField.value;
  } else if (isContentEditable) {
    text = inputField.innerText;
  } else {
    text = inputField.textContent || '';
  }

  // Always log for debugging the current issue
  // console.log("[Velocity Quality] getInputText result:", {
  //   tagName: tagName,
  //   isContentEditable: isContentEditable,
  //   textLength: text ? text.length : 0,
  //   textFirstChars: text ? text.substring(0, 50) + "..." : "null/empty",
  //   isEmpty: !text || text.trim().length === 0
  // });

  return text;
}

/**
 * Send text to the server for quality analysis
 * @param {string} text - The text to analyze
 */
function sendTextForAnalysis(text) {
  const state = window.velocityQualityState;

  // Log that we're sending text for analysis
  // console.log('[Velocity WebSocket] Sending text for analysis:', text);

  // Prepare message data
  const messageData = {
    text: text,
    prompt: text, // Add prompt field as the server might be expecting this
    client_timestamp: Date.now(),
    platform: state.platform || 'unknown',
    type: 'quality_analysis_request'
  };

  // Log the message data being sent
  // console.log('[Velocity WebSocket] Message data being sent:', messageData);

  // Send if connected, queue if not
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    try {
      state.socket.send(JSON.stringify(messageData));
    } catch (error) {
      console.error("[Velocity Quality] Error sending text for analysis:", error);
      state.messageQueue.push(messageData);
    }
  } else {
    state.messageQueue.push(messageData);

    // Try to reconnect if not already connecting
    if (!state.isConnected && state.reconnectAttempts < state.MAX_RECONNECT_ATTEMPTS) {
      connectWebSocket();
    }
  }
}

/**
 * Clean up the quality analyzer
 */
function cleanupQualityAnalyzer() {
  const state = window.velocityQualityState;
  state.isUnloading = true; // Prevent reconnection attempts during cleanup

  // Close WebSocket
  if (state.socket) {
    try {
      state.socket.close();
    } catch (e) {
      console.warn("[Velocity Quality] Error closing WebSocket:", e);
    }
    state.socket = null;
  }

  // Clear intervals
  if (state.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
  }

  if (state.contentCheckInterval) {
    clearInterval(state.contentCheckInterval);
    state.contentCheckInterval = null;
  }

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }

  // Disconnect observer
  if (state.inputObserver) {
    state.inputObserver.disconnect();
    state.inputObserver = null;
  }

  // Remove indicator
  if (state.indicator && state.indicator.parentNode) {
    state.indicator.parentNode.removeChild(state.indicator);
    state.indicator = null;
  }

  // Clear message queue
  state.messageQueue = [];
  state.isConnected = false;
  state.isConnecting = false;
  state.reconnectAttempts = 0;

  // console.log("[Velocity Quality] Analyzer cleaned up");
}

/**
 * Detect the current platform
 * @returns {string|null} The detected platform or null
 */
function detectPlatform() {
  const currentURL = window.location.href;

  if (!window.platforms) {
    // console.error("[Velocity Quality] Platforms not available");
    return null;
  }

  for (const key in window.platforms) {
    if (window.platforms[key].urlPattern && window.platforms[key].urlPattern.test(currentURL)) {
      return key;
    }
  }

  return null;
}

/**
 * Check if the input field has content
 * @returns {boolean} True if the input field has content, false otherwise
 */
function checkInputHasContent() {
  // console.log('[Velocity Quality] checkInputHasContent called');

  // Get the platform and input field
  const platform = window.velocityQualityState?.platform;
  if (!platform || !window.platforms) {
    // console.log('[Velocity Quality] checkInputHasContent: No platform or platforms config');
    return false;
  }

  const platformConfig = window.platforms[platform];
  if (!platformConfig || !platformConfig.textAreaSelector) {
    // console.log('[Velocity Quality] checkInputHasContent: No platform config or textAreaSelector');
    return false;
  }

  // Get the input field
  let inputField = window.velocityWrapperState?.inputBox;
  if (!inputField) {
    inputField = document.querySelector(platformConfig.textAreaSelector);
    // console.log('[Velocity Quality] checkInputHasContent: Using DOM selector to find input field');
  } else {
    // console.log('[Velocity Quality] checkInputHasContent: Using cached input field from velocityWrapperState');
  }

  if (!inputField) {
    // console.log('[Velocity Quality] checkInputHasContent: No input field found');
    return false;
  }

  // Get the text from the input field
  const text = getInputText(inputField);
  const hasContent = text.trim().length > 0;

  // console.log(`[Velocity Quality] checkInputHasContent result: ${hasContent} (text length: ${text.length})`);

  // Return true if the text is not empty
  return hasContent;
}

function handleWebSocketMessage(data) {
  // Log the full WebSocket response for debugging
  // console.log('[Velocity WebSocket] Full WebSocket Response:', data);
  // Store the complete WebSocket response globally
  window.velocityWebSocketResponse = data;

  // Extract and store intent data
  if (data.main_intent) {
    window.velocityIntentData = {
      intent: data.main_intent.category || '',
      intent_description: data.main_intent.description || '',
      timestamp: Date.now()
    };

    // Store intent data for enhance prompt
    window.velocityEnhanceIntent = {
      intent: data.main_intent.category,
      intent_description: data.main_intent.description
    };
  }

  // Process quality metrics
  let quality = data.quality || 'idle';
  let metrics = {};

  if (data.quality_metrics) {
    metrics = {
      clarity: data.quality_metrics.clarity_score || 0,
      specificity: data.quality_metrics.ambiguity_score || 0,
      intent: data.quality_metrics.intent_clarity || 0,
      depth: data.quality_metrics.depth_of_prompt || 0
    };

    // If quality is not explicitly set, calculate it from metrics
    if (quality === 'idle') {
      const averageScore = (metrics.clarity + metrics.specificity + metrics.intent + metrics.depth) / 4;

      if (averageScore < 0.4) {
        quality = 'bad';
      } else if (averageScore < 0.7) {
        quality = 'ok';
      } else {
        quality = 'good';
      }
    }

    // Update indicator with the quality from WebSocket response
    updateQualityIndicator(quality, false);

    if (quality === 'bad') {
      window.extractAndUpdateQualityMetrics(data);
    }
  } else {
    // If there's content but no metrics, keep showing idle state
    const hasContent = checkInputHasContent();
    if (hasContent) {
      updateQualityIndicator('idle', true);
    } else {
      updateQualityIndicator('idle', false);
    }
  }
}

// Add new function to process message queue
function processMessageQueue() {
  const state = window.velocityQualityState;
  
  if (!state.isConnected || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  while (state.messageQueue.length > 0) {
    const message = state.messageQueue.shift();
    try {
      state.socket.send(JSON.stringify(message));
      // console.log('[Velocity WebSocket] Sent queued message:', message);
    } catch (error) {
      // console.error('[Velocity WebSocket] Error sending queued message:', error);
      state.messageQueue.unshift(message); // Put message back in queue
      break;
    }
  }
}

// Export functions for use in content-script.js
window.velocityQualityAnalyzer = {
  init: initQualityAnalyzer,
  cleanup: cleanupQualityAnalyzer,
  updateIndicator: updateQualityIndicator,
  checkInputHasContent: checkInputHasContent
};

function checkWebSocketStatus() {
  const state = window.velocityQualityState;
  
  if (!state.socket) {
    // console.log('[Velocity WebSocket] No socket connection exists');
    return {
      connected: false,
      status: 'no_socket',
      lastError: state.lastError
    };
  }

  const readyState = state.socket.readyState;
  let status = 'unknown';
  
  switch (readyState) {
    case WebSocket.CONNECTING:
      status = 'connecting';
      break;
    case WebSocket.OPEN:
      status = 'open';
      break;
    case WebSocket.CLOSING:
      status = 'closing';
      break;
    case WebSocket.CLOSED:
      status = 'closed';
      break;
  }

  // console.log('[Velocity WebSocket] Connection status:', {
  //   status: status,
  //   readyState: readyState,
  //   isConnected: state.isConnected,
  //   reconnectAttempts: state.reconnectAttempts,
  //   lastError: state.lastError,
  //   timestamp: new Date().toISOString()
  // });

  return {
    connected: readyState === WebSocket.OPEN,
    status: status,
    readyState: readyState,
    isConnected: state.isConnected,
    reconnectAttempts: state.reconnectAttempts,
    lastError: state.lastError
  };
}

// Add periodic status check
setInterval(() => {
  if (!window.velocityQualityState) return; // Guard for undefined state
  const status = checkWebSocketStatus();
  if (!status.connected && status.reconnectAttempts < window.velocityQualityState.MAX_RECONNECT_ATTEMPTS) {
    connectWebSocket();
  }
}, 60000); // Check every minute
