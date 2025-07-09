/**
 * Input Quality Analyzer
 * 
 * This module handles real-time input quality analysis via WebSocket connection.
 * It monitors the prompt input field for text changes and sends data to the WebSocket server.
 */

// Global state for the input analyzer
window.velocityInputState = {
  // WebSocket connection state
  socket: null,
  reconnectAttempts: 0,
  isConnected: false,
  messageQueue: [],

  // Analysis state
  isAnalyzing: false,
  lastAnalyzedText: '',
  lastCheckedText: '',
  debounceTimer: null,
  contentCheckInterval: null,

  // Configuration
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 5000,
  DEBOUNCE_DELAY: 1000,
  WEBSOCKET_URL: 'wss://thinkvelocity.in/python-backend-D/ws/domain-analysis'
};

/**
 * Initialize the input analyzer
 */
function initInputAnalyzer() {
  // console.log('[Velocity Input] Initializing input analyzer');
  
  // Connect to WebSocket
  connectWebSocket();
  
  // Start monitoring input field
  startInputMonitoring();
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  try {
    // console.log('[Velocity Input] Attempting to connect to WebSocket:', window.velocityInputState.WEBSOCKET_URL);
    window.velocityInputState.socket = new WebSocket(window.velocityInputState.WEBSOCKET_URL);

    window.velocityInputState.socket.onopen = () => {
      // console.log('[Velocity Input] WebSocket connected successfully');
      window.velocityInputState.isConnected = true;
      window.velocityInputState.reconnectAttempts = 0;
      
      // Process any queued messages
      processMessageQueue();
    };

    window.velocityInputState.socket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        // console.log('[Velocity Input] Raw WebSocket response:', event.data);
        // console.log('[Velocity Input] Parsed analysis response:', response);
        handleAnalysisResponse(response);
      } catch (error) {
        // console.error('[Velocity Input] Error parsing WebSocket message:', error);
        // console.error('[Velocity Input] Raw message data:', event.data);
      }
    };

    window.velocityInputState.socket.onclose = (event) => {
      // console.log('[Velocity Input] WebSocket disconnected', {
      //   code: event.code,
      //   reason: event.reason,
      //   wasClean: event.wasClean
      // });
      window.velocityInputState.isConnected = false;
      handleDisconnect();
    };

    window.velocityInputState.socket.onerror = (error) => {
      // console.error('[Velocity Input] WebSocket error:', error);
    };

  } catch (error) {
    // console.error('[Velocity Input] Error creating WebSocket:', error);
    handleDisconnect();
  }
}

/**
 * Handle WebSocket disconnection
 */
function handleDisconnect() {
  if (window.velocityInputState.reconnectAttempts < window.velocityInputState.MAX_RECONNECT_ATTEMPTS) {
    // console.log(`[Velocity Input] Attempting to reconnect (${window.velocityInputState.reconnectAttempts + 1}/${window.velocityInputState.MAX_RECONNECT_ATTEMPTS})`);
    window.velocityInputState.reconnectAttempts++;
    setTimeout(connectWebSocket, window.velocityInputState.RECONNECT_DELAY);
  } else {
    // console.error('[Velocity Input] Max reconnection attempts reached');
  }
}

/**
 * Process queued messages
 */
function processMessageQueue() {
  while (window.velocityInputState.messageQueue.length > 0 && window.velocityInputState.isConnected) {
    const message = window.velocityInputState.messageQueue.shift();
    sendTextForAnalysis(message);
  }
}

/**
 * Start monitoring the input field
 */
function startInputMonitoring() {
  const promptInput = document.getElementById('promptInput');
  if (!promptInput) {
    // console.error('[Velocity Input] Prompt input field not found');
    return;
  }

  // console.log('[Velocity Input] Starting input monitoring for:', promptInput);

  // Monitor input changes
  promptInput.addEventListener('input', () => {
    const text = promptInput.value.trim();
    // console.log('[Velocity Input] Input changed:', text);
    
    // Clear existing debounce timer
    if (window.velocityInputState.debounceTimer) {
      clearTimeout(window.velocityInputState.debounceTimer);
    }

    // Set new debounce timer
    window.velocityInputState.debounceTimer = setTimeout(() => {
      if (text && text !== window.velocityInputState.lastAnalyzedText) {
        // console.log('[Velocity Input] Sending text for analysis:', text);
        sendTextForAnalysis(text);
      }
    }, window.velocityInputState.DEBOUNCE_DELAY);
  });

  // Start periodic content check
  window.velocityInputState.contentCheckInterval = setInterval(() => {
    const text = promptInput.value.trim();
    if (text !== window.velocityInputState.lastCheckedText) {
      window.velocityInputState.lastCheckedText = text;
      if (text && text !== window.velocityInputState.lastAnalyzedText) {
        // console.log('[Velocity Input] Content changed, sending for analysis');
        sendTextForAnalysis(text);
      }
    }
  }, 2000); // Check every 2 seconds
}

/**
 * Send text to WebSocket server for analysis
 * @param {string} text - The text to analyze
 */
function sendTextForAnalysis(text) {
  if (!window.velocityInputState.isConnected) {
    // console.log('[Velocity Input] WebSocket not connected, queueing message');
    window.velocityInputState.messageQueue.push(text);
    return;
  }

  try {
    // Match the exact message format from writingQualityAnalyzer.js
    const messageData = {
      text: text,
      prompt: text,
      client_timestamp: Date.now(),
      platform: 'extension',
      type: 'quality_analysis_request'
    };

    // console.log('[Velocity Input] Preparing to send message:', messageData);
    
    // Ensure the socket is in OPEN state
    if (window.velocityInputState.socket.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(messageData);
      // console.log('[Velocity Input] Sending raw message:', messageString);
      window.velocityInputState.socket.send(messageString);
      // console.log('[Velocity Input] Message sent successfully');
      window.velocityInputState.lastAnalyzedText = text;
      window.velocityInputState.isAnalyzing = true;
    } else {
      // console.error('[Velocity Input] WebSocket not in OPEN state:', window.velocityInputState.socket.readyState);
      window.velocityInputState.messageQueue.push(text);
    }
  } catch (error) {
    // console.error('[Velocity Input] Error sending message:', error);
    window.velocityInputState.messageQueue.push(text);
  }
}

/**
 * Handle analysis response from WebSocket server
 * @param {Object} response - The analysis response
 */
function handleAnalysisResponse(response) {
  // console.log('[Velocity Input] ===== WebSocket Response =====');
  // console.log('[Velocity Input] Full WebSocket Response:', JSON.stringify(response, null, 2));
  
  // Store the main_intent data for the enhance API
  if (response.main_intent) {
    window.velocityWebSocketResponse = {
      main_intent: {
        category: response.main_intent.category || '',
        description: response.main_intent.description || ''
      }
    };
    // console.log('[Velocity Input] Stored WebSocket Intent Data:', JSON.stringify(window.velocityWebSocketResponse, null, 2));
  }
  
  // Log specific response fields
  if (response.quality) {
    // console.log('[Velocity Input] Quality:', response.quality);
  }
  if (response.quality_reasons) {
    // console.log('[Velocity Input] Quality reasons:', response.quality_reasons);
  }
  if (response.quality_score) {
    // console.log('[Velocity Input] Quality score:', response.quality_score);
  }
  if (response.domains) {
    // console.log('[Velocity Input] Domains:', response.domains);
  }
  if (response.intent) {
    // console.log('[Velocity Input] Intent:', response.intent);
  }
  
  window.velocityInputState.isAnalyzing = false;
  // console.log('[Velocity Input] ===== End WebSocket Response =====');
}

/**
 * Cleanup function to be called when the analyzer is no longer needed
 */
function cleanupInputAnalyzer() {
  if (window.velocityInputState.socket) {
    window.velocityInputState.socket.close();
  }
  
  if (window.velocityInputState.contentCheckInterval) {
    clearInterval(window.velocityInputState.contentCheckInterval);
  }
  
  if (window.velocityInputState.debounceTimer) {
    clearTimeout(window.velocityInputState.debounceTimer);
  }
  
  // console.log('[Velocity Input] Cleanup completed');
}

// Initialize the analyzer when the document is ready
document.addEventListener('DOMContentLoaded', initInputAnalyzer); 