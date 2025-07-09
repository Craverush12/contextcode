window.velocityWrapperState = {
  wrapper: null,
  container: null,
  inputBox: null,
  button: null,
  anchors: {},
  isDragging: false,
  platform: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  hoverBox: true,
  animationsDisabled: false,
  buttonSystem: null,
};

// Logging helper for extension API usage
async function logToBackend(logType, message, metadata) {
  try {
    // Try to get userId from chrome.storage.local
    let userId = 'unknown';
    try {
      const storage = await new Promise((resolve) => {
        chrome.storage.local.get(['userId'], resolve);
      });
      if (storage.userId) userId = storage.userId;
    } catch (e) {}
    
    const BACKEND_URL = "https://thinkvelocity.in/backend-V1-D";
      // const BACKEND_URL = "http://localhost:3005";
    await fetch(`${BACKEND_URL}/extension/logs/${logType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message,
        metadata: Object.assign({
          platform: 'content-script.js',
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }, metadata || {})
      })
    });
  } catch (e) {
  }
}

// Log content script loaded
logToBackend('info', 'Content script loaded', { 
  url: window.location.href, 
  userAgent: navigator.userAgent 
});

// Run initialization functions when content script loads
(function initialize() {
  // Add platform detection
  const currentPlatform = detectPlatform();
  
  // Check for pending prompt injection
  checkForPendingPromptInsertion();
})();


function initializeButtonAnimationSystem(platformConfig, button = null) {
  // Clean up any message boxes directly
  const messageBoxes = document.querySelectorAll(".velocity-message-box");
  messageBoxes.forEach((box) => {
    if (box && box.parentNode) {
      box.parentNode.removeChild(box);
    }
  });

  if (window.velocityWrapperState.buttonSystem) {
    window.velocityWrapperState.buttonSystem.reset();
  }

  window.velocityWrapperState.buttonSystem =
    window.createVelocityButtonSystem(platformConfig);

  if (button) {
    window.velocityWrapperState.buttonSystem.state.currentButton = button;

    const inputBox =
      window.velocityWrapperState.inputBox ||
      document.querySelector(platformConfig.textAreaSelector);

    if (inputBox) {
      window.velocityWrapperState.buttonSystem.setupEventListeners(
        inputBox,
        button
      );

      window.velocityWrapperState.buttonSystem.animationController.handleButtonReinitialization(
        button
      );
    } else {
      // console.error("[Velocity] Input box not found for button initialization");
    }
  } else {
    window.velocityWrapperState.buttonSystem.init(platformConfig);
  }
}

// Function to disable all animations
function disableAllAnimations() {
  window.velocityWrapperState.animationsDisabled = true;

  if (window.velocityWrapperState.buttonSystem) {
    window.velocityWrapperState.buttonSystem.disableAnimations();
  } else {
    if (window.velocityAnimations) {
      if (window.velocityAnimations.state) {
        window.velocityAnimations.state.disableAnimations = true;
      }

      if (
        typeof window.velocityAnimations.disableAllAnimations === "function"
      ) {
        window.velocityAnimations.disableAllAnimations();
      }
    }

    const buttons = document.querySelectorAll(
      ".velocity-button-container button, .custom-injected-button button"
    );
    buttons.forEach((button) => {
      button.classList.remove(
        "velocity-loading-animation",
        "velocity-half-circle-glow",
        "velocity-inner-pulse-bounce",
        "velocity-inner-pulse-bounce-shake",
        "velocity-idle-typing-effect",
        "velocity-success-idle-effect",
        "velocity-multi-ring-container",
        "velocity-multi-ring",
        "velocity-splash",
        "velocity-highlight-pulse",
        "velocity-enhanced-highlight",
        "velocity-enhanced-scale"
      );

      // Remove multi-ring container elements
      const multiRingContainer = button.querySelector(
        ".velocity-multi-ring-container"
      );
      if (multiRingContainer) {
        try {
          button.removeChild(multiRingContainer);
        } catch (e) {}
      }

      // Remove any standalone multi-ring elements
      const multiRings = button.querySelectorAll(".velocity-multi-ring");
      multiRings.forEach((ring) => {
        try {
          if (ring.parentNode) {
            ring.parentNode.removeChild(ring);
          }
        } catch (e) {}
      });

      if (
        window.velocityAnimations &&
        window.velocityAnimations.cleanupLoadingAnimation
      ) {
        window.velocityAnimations.cleanupLoadingAnimation(button);
      }
    });
  }

  // Clear any animation intervals
  if (window._velocityAnimationIntervals) {
    window._velocityAnimationIntervals.forEach((interval) =>
      clearInterval(interval)
    );
    window._velocityAnimationIntervals = [];
  }

  // Also look for any other multi-ring containers in the document
  const documentMultiRings = document.querySelectorAll(
    ".velocity-multi-ring-container, .velocity-multi-ring"
  );
  documentMultiRings.forEach((element) => {
    try {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (e) {}
  });
}

// Ensure animations are disabled before showing the trial finished notification
function showTrialFinishedPopupWithDisabledAnimations() {
  disableAllAnimations();

  if (window.trailFinishedInstance && window.trailFinishedInstance.parentNode) {
    window.trailFinishedInstance.parentNode.removeChild(
      window.trailFinishedInstance
    );
    window.trailFinishedInstance = null;
  }

  document
    .querySelectorAll("#trail-finished-popup, .trail-finished")
    .forEach((popup) => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    });

  if (window.showTrailFinishedNotification) {
    window.showTrailFinishedNotification();
    disableAllAnimations();
  } else {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("trail-finished.js");
    script.onload = function () {
      if (window.showTrailFinishedNotification) {
        window.showTrailFinishedNotification();
        disableAllAnimations();

        const originalShowTrailFinishedNotification =
          window.showTrailFinishedNotification;
        window.showTrailFinishedNotification = function () {
          disableAllAnimations();

          return originalShowTrailFinishedNotification.apply(this, arguments);
        };
      }
    };
    document.head.appendChild(script);
  }
}

// Function to inject enhanced highlight styles
function injectEnhancedHighlightStyles() {
  if (document.getElementById("velocity-highlight-styles")) return;

  const styleEl = document.createElement("style");
  styleEl.id = "velocity-highlight-styles";
  styleEl.innerHTML = `
    @keyframes velocity-enhanced-highlight {
      0% { background-color: rgba(0, 136, 255, 0); box-shadow: 0 0 0 rgba(0, 136, 255, 0); }
      30% { background-color: rgba(0, 136, 255, 0.2); box-shadow: 0 0 10px rgba(0, 136, 255, 0.5); }
      70% { background-color: rgba(0, 136, 255, 0.2); box-shadow: 0 0 10px rgba(0, 136, 255, 0.5); }
      100% { background-color: rgba(0, 136, 255, 0); box-shadow: 0 0 0 rgba(0, 136, 255, 0); }
    }

    @keyframes velocity-enhanced-scale {
      0% { transform: scale(1); }
      30% { transform: scale(1.03); }
      70% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }

    .velocity-enhanced-highlight {
      animation: velocity-enhanced-highlight 1s ease-in-out forwards;
      border-color: #0088cb !important;
      transition: all 0.3s ease;
    }

    .velocity-enhanced-scale {
      animation: velocity-enhanced-scale 1s ease-in-out forwards;
    }

    .text-pop-effect {
      animation: text-pop 0.3s ease-in-out;
    }

    @keyframes text-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
  `;

  document.head.appendChild(styleEl);
}

function injectPromptIntoInputField(prompt) {
  if (!prompt || prompt === "none") {
    logToBackend('error', 'Invalid prompt provided', {
      prompt_length: prompt?.length || 0
    });
    return false;
  }

  const platform = window.velocityWrapperState?.platform;
  const currentURL = window.location.href;
  let detectedPlatform = platform;

  // Platform detection logic
  if (!detectedPlatform) {
    if (currentURL.includes("chat.openai.com") || currentURL.includes("chatgpt.com")) {
      detectedPlatform = "chatgpt";
    } else if (currentURL.includes("claude.ai")) {
      detectedPlatform = "claude";
    } else if (currentURL.includes("gemini.google.com")) {
      detectedPlatform = "gemini";
    } else if (currentURL.includes("grok.com")) {
      detectedPlatform = "grok";
    } else if (currentURL.includes("mistral.ai")) {
      detectedPlatform = "mistral";
    } else if (currentURL.includes("bolt.new")) {
      detectedPlatform = "bolt";
    } else if (currentURL.includes("v0.dev")) {
      detectedPlatform = "v0";
    } else if (currentURL.includes("gamma.app")) {
      detectedPlatform = "gamma";
    } else if (currentURL.includes("lovable.dev")) {
      detectedPlatform = "lovable";
    } else if (currentURL.includes("replit.com")) {
      detectedPlatform = "replit";
    }
  }

  // First try to get input field from wrapper state
  let inputField = window.velocityWrapperState?.inputBox;

  // // Platform-specific input field detection
  // if (!inputField && detectedPlatform === "perplexity") {
  //   // Special handling for Perplexity
  //   try {
  //     // First try the most reliable selector for Perplexity
  //     inputField = document.querySelector('data-lexical-editor=true');
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try the text input field
  //       inputField = document.querySelector('form [role="textbox"]');
  //     }
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try any visible textarea
  //       const textareas = document.querySelectorAll('textarea');
  //       for (const textarea of textareas) {
  //         if (textarea.offsetParent !== null && !textarea.disabled) {
  //           inputField = textarea;
  //           break;
  //         }
  //       }
  //     }
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try the latest selector 
  //       inputField = document.querySelector("div[class*='col-start-1 col-end-4 pb-sm overflow-hidden relative flex h-full w-full']");
  //     }
      
  //     logToBackend('info', 'Perplexity input field detection', {
  //       found: !!inputField,
  //       element_type: inputField ? inputField.tagName : null
  //     });
  //   } catch (err) {
  //     logToBackend('error', 'Error in Perplexity-specific input detection', {
  //       error_message: err.message
  //     });
  //   }
  // } else if (!inputField && detectedPlatform === "mistral") {
  //   // Special handling for Mistral
  //   try {
  //     // First try the most reliable selector for Mistral
  //     inputField = document.querySelector('.relative textarea');
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try finding ProseMirror editor
  //       inputField = document.querySelector('.ProseMirror');
  //     }
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try contenteditable div
  //       inputField = document.querySelector('[contenteditable="true"]');
  //     }
      
  //     if (!inputField || inputField.offsetParent === null) {
  //       // Try the specific class
  //       inputField = document.querySelector("div[class='relative overflow-hidden mb-2 min-h-10 w-full']");
  //     }
      
  //     logToBackend('info', 'Mistral input field detection', {
  //       found: !!inputField,
  //       element_type: inputField ? inputField.tagName : null
  //     });
  //   } catch (err) {
  //     logToBackend('error', 'Error in Mistral-specific input detection', {
  //       error_message: err.message
  //     });
  //   }
  // }

  // If no platform-specific input field found, try using platform-specific selectors
  if (!inputField && detectedPlatform && window.platforms?.[detectedPlatform]) {
    const platformConfig = window.platforms[detectedPlatform];
    if (platformConfig.textAreaSelector) {
      const selectors = platformConfig.textAreaSelector.split(",").map(s => s.trim());
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (el.offsetParent !== null && !el.disabled) {
            inputField = el;
            break;
          }
        }
        if (inputField) break;
      }
    }
  }

  // If still no input field, try generic selectors
  if (!inputField) {
    const genericSelectors = [
      "textarea",
      'input[type="text"]',
      ".ProseMirror",
      '[contenteditable="true"]',
      '[role="textbox"]',
      ".ql-editor",
      'div[class*="editor"]',
      'div[class*="input"]',
      'div[class*="textarea"]',
      "div.ProseMirror",
      '[data-testid*="input"]',
      '[data-testid*="editor"]',
      // Add iframe support
      'iframe[title*="editor"]',
      'iframe[title*="input"]',
      'iframe[class*="editor"]',
      'iframe[class*="input"]',
      // Add bottom-of-page selectors which are often where input fields are
      'div[class*="bottom"] textarea',
      'div[class*="footer"] textarea',
      'div[class*="composer"] textarea',
      'form textarea',
      'form [role="textbox"]'
    ];

    for (const selector of genericSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // For iframes, try to access their content
        if (el.tagName === 'IFRAME') {
          try {
            const iframeDoc = el.contentDocument || el.contentWindow.document;
            const iframeInput = iframeDoc.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
            if (iframeInput && iframeInput.offsetParent !== null && !iframeInput.disabled) {
              inputField = iframeInput;
              break;
            }
          } catch (e) {
            // Cross-origin iframe, skip it
            continue;
          }
        } else if (el.offsetParent !== null && !el.disabled) {
          inputField = el;
          break;
        }
      }
      if (inputField) break;
    }
  }

  if (!inputField) {
    logToBackend('error', 'No input field found for injection', {
      platform: detectedPlatform || 'unknown',
      url: currentURL
    });

    // Notify extension about failure
    chrome.runtime.sendMessage({
      action: 'promptInsertionFailed',
      platformName: detectedPlatform || 'unknown',
      platformKey: detectedPlatform || 'unknown',
      promptLength: prompt.length,
      error: 'No input field found'
    });

    return false;
  }

  try {
    // Add highlight styles if not already added
    injectEnhancedHighlightStyles();

    // Store successful input field for future use
    window.velocityWrapperState = window.velocityWrapperState || {};
    window.velocityWrapperState.inputBox = inputField;

    // Handle different types of input fields
    if (inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT") {
      const originalValue = inputField.value;
      inputField.value = prompt;
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      
      // Verify the value was actually set
      if (inputField.value !== prompt) {
        // Try using execCommand
        inputField.focus();
        document.execCommand('insertText', false, prompt);
        
        // If still not set, try selection approach
        if (inputField.value !== prompt) {
          inputField.select();
          document.execCommand('insertText', false, prompt);
        }
      }
    } else if (inputField.hasAttribute("contenteditable")) {
      const originalContent = inputField.innerHTML;
      inputField.innerHTML = prompt;
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      
      // Verify content was set
      if (inputField.innerHTML !== prompt) {
        // Try using execCommand
        inputField.focus();
        document.execCommand('insertHTML', false, prompt);
      }
    } else {
      // Try both value and innerHTML/textContent approaches
      let injectionSuccessful = false;
      
      // Try setting value if it exists
      if (typeof inputField.value !== "undefined") {
        const originalValue = inputField.value;
        inputField.value = prompt;
        inputField.dispatchEvent(new Event("input", { bubbles: true }));
        
        if (inputField.value === prompt) {
          injectionSuccessful = true;
        }
      }
      
      // If value approach failed, try innerHTML/textContent
      if (!injectionSuccessful) {
        if (detectedPlatform === "perplexity" || detectedPlatform === "mistral") {
          // For Perplexity and Mistral, try to find a child element that might be the actual input
          const possibleInputs = inputField.querySelectorAll('div[contenteditable="true"], [role="textbox"], textarea');
          if (possibleInputs.length > 0) {
            for (const possibleInput of possibleInputs) {
              try {
                possibleInput.textContent = prompt;
                possibleInput.dispatchEvent(new Event("input", { bubbles: true }));
                injectionSuccessful = true;
                break;
              } catch (e) {
                // Try next element
              }
            }
          }
        }
        
        // If still not successful, try direct text manipulation
        if (!injectionSuccessful) {
          try {
            inputField.textContent = prompt;
            inputField.dispatchEvent(new Event("input", { bubbles: true }));
          } catch (e) {
            // Final attempt with innerHTML
            inputField.innerHTML = prompt;
            inputField.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }
    }

    // Focus the input field
    inputField.focus();

    // Add visual feedback
    inputField.classList.add("velocity-enhanced-highlight", "velocity-enhanced-scale");
    
    const inputContainer = inputField.closest('.chat-input-container, .input-container, [role="textbox"]');
    if (inputContainer && inputContainer !== inputField) {
      inputContainer.classList.add("velocity-enhanced-highlight");
    }

    // Simulate Enter key press for Perplexity and Mistral if needed
    if (detectedPlatform === "perplexity" || detectedPlatform === "mistral") {
      // Find and click send button (often more reliable than simulating Enter)
      setTimeout(() => {
        const sendButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
          const buttonText = btn.textContent.toLowerCase();
          const hasIcon = btn.querySelector('svg') !== null;
          const rect = btn.getBoundingClientRect();
          
          return (buttonText.includes('send') || buttonText.includes('submit') || 
                 (hasIcon && rect.height < 50 && rect.width < 50)) && 
                 btn.offsetParent !== null;
        });
        
        if (sendButtons.length > 0) {
          // Sort by size (smaller buttons are usually send buttons)
          sendButtons.sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            return (aRect.width * aRect.height) - (bRect.width * bRect.height);
          });
          
          // Click the first (smallest) visible button
          sendButtons[0].click();
        }
      }, 500);
    }

    // Remove visual feedback after animation
    setTimeout(() => {
      inputField.classList.remove("velocity-enhanced-highlight", "velocity-enhanced-scale");
      if (inputContainer && inputContainer !== inputField) {
        inputContainer.classList.remove("velocity-enhanced-highlight");
      }
    }, 1000);

    // Log successful injection
    logToBackend('info', 'Prompt injected successfully', {
      platform: detectedPlatform || 'unknown',
      url: currentURL
    });

    // Notify extension about success
    chrome.runtime.sendMessage({
      action: 'promptInsertedInPlatform',
      platformName: detectedPlatform || 'unknown',
      platformKey: detectedPlatform || 'unknown',
      promptLength: prompt.length
    });

    return true;
  } catch (err) {
    logToBackend('error', 'Error injecting prompt', {
      error_message: err.message,
      platform: detectedPlatform || 'unknown',
      url: currentURL
    });

    // Notify extension about failure
    chrome.runtime.sendMessage({
      action: 'promptInsertionFailed',
      platformName: detectedPlatform || 'unknown',
      platformKey: detectedPlatform || 'unknown',
      promptLength: prompt.length,
      error: err.message
    });

    return false;
  }
}

window.injectPromptIntoInputField = injectPromptIntoInputField;

// Unified streaming state management
const StreamingState = {
  buffer: '',
  isStreaming: false,
  cursorInterval: null,
  inputBox: null,
  retries: 0,
  maxRetries: 3
};

// Single message listener for streaming
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "velocityEnhanceChunk") {
    handleEnhanceChunk(message, sendResponse);
    return true;
  } 
  else if (message.type === "velocityEnhanceComplete") {
    handleEnhanceComplete(message, sendResponse);
    return true;
  } 
  else if (message.type === "velocityEnhanceError") {
    handleEnhanceError(message, sendResponse);
    return false;
  }
  return false;
});

function handleEnhanceChunk(message, sendResponse) {
  // Log enhance chunk received
  logToBackend('info', 'Enhance chunk received', { 
    chunkLength: message.chunk?.length || 0
  });

  // Hide any existing traffic message box
  const trafficBox = document.querySelector('.velocity-state-message-box.velocity-traffic-message-box');
  if (trafficBox?.parentNode) {
    trafficBox.parentNode.removeChild(trafficBox);
  }
  window.velocityEnhanceBlocked = false;

  // Start streaming if not already started
  if (!StreamingState.isStreaming) {
    initializeStreaming();
  }

  // Try to inject the chunk
  injectStreamingChunk(message.chunk, sendResponse);
}

function initializeStreaming() {
  StreamingState.isStreaming = true;
  StreamingState.buffer = '';
  StreamingState.retries = 0;
  
  // Find and cache input box
  StreamingState.inputBox = window.velocityWrapperState?.inputBox || 
                           getPlatformInputBox() ||
                           document.querySelector('textarea:focus, [contenteditable="true"]:focus') ||
                           document.querySelector('textarea, [contenteditable="true"]');

  // Clear input and start cursor animation
  if (StreamingState.inputBox) {
    clearInputContent(StreamingState.inputBox);
    startStreamingCursor();
  }
}

function injectStreamingChunk(chunk, sendResponse) {
  if (!StreamingState.inputBox) {
    if (StreamingState.retries < StreamingState.maxRetries) {
      StreamingState.retries++;
      setTimeout(() => injectStreamingChunk(chunk, sendResponse), 50);
      return;
    }
    console.error('[Velocity] Error: Could not find input box to inject enhanced content.');
    sendResponse({ success: false });
    return;
  }

  // Append chunk to buffer and update UI
  StreamingState.buffer += chunk;
  updateInputContent(StreamingState.inputBox, StreamingState.buffer);
  sendResponse({ success: true });
}

function handleEnhanceComplete(message, sendResponse) {
  if (!StreamingState.inputBox) return;

  // Log enhance complete
  logToBackend('info', 'Enhance complete in content script', {
    responseStatus: message.response?.success,
    enhancedLength: message.response?.data?.enhanced_prompt?.length || 0
  });

  // Stop streaming and cursor animation
  stopStreaming();
  
  // Apply completion animation
  applyCompletionAnimation(StreamingState.inputBox);

  // Save prompt review if needed
  if (window.velocityWebSocketResponse) {
    const intentData = window.velocityWebSocketResponse?.main_intent || {};
    savePromptReview(message, intentData, StreamingState.inputBox);
  }

  sendResponse({ success: true });
}

function handleEnhanceError(message, sendResponse) {
  // Log enhance error
  logToBackend('error', 'Enhance error in content script', {
    error: message.error?.error || 'Unknown error'
  });
  
  stopStreaming();
  showEnhanceError(message.error);
  sendResponse({ success: true });
}

function startStreamingCursor() {
  if (StreamingState.cursorInterval) return;
  
  const cursor = document.createElement('span');
  cursor.className = 'streaming-cursor';
  StreamingState.inputBox.parentNode.appendChild(cursor);
  
  StreamingState.cursorInterval = setInterval(() => {
    cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
  }, 500);
}

function stopStreaming() {
  StreamingState.isStreaming = false;
  if (StreamingState.cursorInterval) {
    clearInterval(StreamingState.cursorInterval);
    StreamingState.cursorInterval = null;
    
    // Remove cursor element
    const cursor = document.querySelector('.streaming-cursor');
    if (cursor?.parentNode) {
      cursor.parentNode.removeChild(cursor);
    }
  }
}

function clearInputContent(inputBox) {
  if (!inputBox) return;
  
  if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
    inputBox.value = '';
  } else if (inputBox.hasAttribute('contenteditable')) {
    inputBox.innerText = '';
  } else {
    inputBox.textContent = '';
  }
  
  // Trigger input events
  inputBox.dispatchEvent(new Event('input', { bubbles: true }));
  inputBox.dispatchEvent(new Event('change', { bubbles: true }));
}

function updateInputContent(inputBox, content) {
  if (!inputBox) return;
  
  if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
    inputBox.value = content;
  } else if (inputBox.hasAttribute('contenteditable')) {
    inputBox.innerText = content;
  } else {
    inputBox.textContent = content;
  }
  
  // Trigger input events and scroll to bottom
  inputBox.dispatchEvent(new Event('input', { bubbles: true }));
  inputBox.dispatchEvent(new Event('change', { bubbles: true }));
  inputBox.scrollTop = inputBox.scrollHeight;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "insertEnhancedPrompt" && request.prompt) {
    try {
      const success = injectPromptIntoInputField(request.prompt);

      if (success) {
        if (window.velocityWrapperState.buttonSystem) {
          const button =
            window.velocityWrapperState.buttonSystem.state.currentButton;
          if (button) {
            window.velocityWrapperState.buttonSystem.handlePromptInjection(
              button
            );
          } else {
          }
        } else {
        }
        sendResponse({ success: true });
      } else {
        setTimeout(function () {
          const retrySuccess = injectPromptIntoInputField(request.prompt);

          if (retrySuccess && window.velocityWrapperState.buttonSystem) {
            const button =
              window.velocityWrapperState.buttonSystem.state.currentButton;
            if (button) {
              window.velocityWrapperState.buttonSystem.handlePromptInjection(
                button
              );
            }
          }

          sendResponse({
            success: retrySuccess,
            message: retrySuccess
              ? "Injection successful on retry"
              : "Injection failed after retry",
          });
        }, 500);
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }

    return true;
  }

  if (request.action === "insertHere" && request.prompt) {
    const success = injectPromptIntoInputField(request.prompt);

    if (success) {
      if (
        window.velocityWrapperState &&
        window.velocityWrapperState.buttonSystem
      ) {
        const button =
          window.velocityWrapperState.buttonSystem.state.currentButton;
        if (button) {
          setTimeout(() => {
            window.velocityWrapperState.buttonSystem.handlePromptInjection(
              button
            );
          }, 100);
        }
      }
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }

  return true;
});

if (
  [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "gamma.app",
    "v0.dev",
    "bolt.new",
    "grok.com",
    "lovable.dev",
    "replit.com",
    "mistral.ai",
  ].includes(window.location.hostname)
) {
  window.velocityLLMReady = true;
  window.velocityChatGPTReady = window.location.hostname === "chatgpt.com"; // For backward compatibility

  document.addEventListener("DOMContentLoaded", async () => {
    if (
      window.responseInterceptor &&
      typeof window.responseInterceptor.init === "function"
    ) {
      try {
        const success = await window.responseInterceptor.init();
      } catch (error) {
        console.error(
          "[Velocity] Error initializing Response Interceptor:",
          error
        );
      }
    } else {
      console.warn("[Velocity] Response Interceptor not available");
    }

    if (
      window.velocitySuggestionController &&
      typeof window.velocitySuggestionController.init === "function"
    ) {
      try {
        const hostname = window.location.hostname;
        let platform = null;

        if (hostname.includes("chatgpt.com")) {
          platform = "chatgpt";
        } else if (hostname.includes("claude.ai")) {
          platform = "claude";
        } else if (hostname.includes("gemini.google.com")) {
          platform = "gemini";
        } else if (hostname.includes("grok.com")) {
          platform = "grok";
        } else if (hostname.includes("bolt.new")) {
          platform = "bolt";
        } else if (hostname.includes("v0.dev")) {
          platform = "vercelv0";
        } else if (hostname.includes("gamma.app")) {
          platform = "gamma";
        } else if (
          hostname.includes("chat.mistral.ai") ||
          hostname.includes("mistral.ai")
        ) {
          platform = "mistral";
        } else if (hostname.includes("lovable.dev")) {
          platform = "lovable";
        } else if (hostname.includes("replit.com")) {
          platform = "replit";
        }else if (hostname.includes("suno.com")) {
          platform = "suno";
        }

        window.velocitySuggestionController.init(platform);
      } catch (error) {
        console.error(
          "[Velocity] Error initializing Suggestion Controller:",
          error
        );
      }
    } else {
      console.warn("[Velocity] Suggestion Controller not available");
    }
  });

  chrome.storage.local.get(
    [
      "storedResponse",
      "suggestedLLM",
      "tabOpenTimestamp",
      "userExplicitAction",
    ],
    function (data) {
      if (
        data.storedResponse &&
        data.storedResponse !== "none" &&
        data.userExplicitAction === "openInPlatform"
      ) {
        const isRecent =
          data.tabOpenTimestamp && Date.now() - data.tabOpenTimestamp < 30000;

        if (isRecent) {
          const attemptInjection = (attempt = 1) => {
            const success = injectPromptIntoInputField(data.storedResponse);

            if (success) {
              chrome.storage.local.set({
                tabOpenTimestamp: null,
                userExplicitAction: null,
              });
            } else if (attempt < 15) {
              const delay = Math.min(1000, attempt * 200);
              setTimeout(() => attemptInjection(attempt + 1), delay);
            } else {
              // Clear the user action flag even if injection failed
              chrome.storage.local.set({
                userExplicitAction: null,
              });
            }
          };

          setTimeout(() => attemptInjection(), 2000);
        } else {
          chrome.storage.local.set({
            userExplicitAction: null,
          });
        }
      } else if (
        data.storedResponse &&
        data.storedResponse !== "none" &&
        !data.userExplicitAction
      ) {
      }
    }
  );
}

function runInputElementDetection() {
  const potentialSelectors = [
    "textarea",
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    'div[class*="absolute"]',
    'div[class*="input"]',
    'div[class*="editor"]',
    'div[class*="text-input"]',
    'div[class*="secondary"]',
    'div[class*="composer"]',
    ".ProseMirror",
    ".ql-editor",
    "form textarea",
    'form input[type="text"]',
  ];

  setTimeout(() => {
    const foundElements = {};

    potentialSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        foundElements[selector] = elements.length;

        elements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          // console.log(`[Velocity] Found element with selector ${selector}:`, {
          //   index,
          //   rect,
          //   element: el
          // });
        });
      }
    });

    const possibleChatInputs = Array.from(
      document.querySelectorAll("div, textarea, input")
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.bottom > window.innerHeight * 0.7 &&
        rect.width > 200 &&
        rect.height > 20 &&
        window.getComputedStyle(el).display !== "none"
      );
    });

    // console.log('[Velocity] Possible chat inputs:', possibleChatInputs);

    const keywordElements = Array.from(document.querySelectorAll("*")).filter(
      (el) => {
        const classAndId = (el.className || "") + " " + (el.id || "");
        return classAndId.match(/input|text|chat|message|editor|compose/i);
      }
    );

    // console.log('[Velocity] Elements with input-related keywords:', keywordElements);
  }, 2000);
}

function detectPlatform() {
  const currentURL = window.location.href;

  if (!window.platforms) {
    // console.error("[Velocity] No platforms configuration found");
  }

  for (const key in window.platforms) {
    if (
      window.platforms[key].urlPattern &&
      window.platforms[key].urlPattern.test(currentURL)
    ) {
      return key;
    }
  }

  return null;
}

(function () {
  if (window.location.hostname.includes("thinkvelocity.in")) {
    function sendUserData() {
      const token = localStorage.getItem("token");
      const userName = localStorage.getItem("userName");
      const userId = localStorage.getItem("userId");
      const userEmail = localStorage.getItem("userEmail");

      if (token && userName && userId && userEmail) {
        chrome.runtime.sendMessage(
          { action: "storeUserData", token, userName, userId, userEmail },
          (response) => {
            checkAuthAndInjectButton();
          }
        );

        chrome.storage.local.set({ enabled: true });
      }

      if (!token && !userName && !userId && !userEmail) {
        chrome.storage.local.remove(
          ["token", "userName", "userId", "userEmail"],
          () => {}
        );
      }
    }
    sendUserData();
    window.addEventListener("storage", sendUserData);

    const documentObserver = new MutationObserver(() => {
      sendUserData();
    });
    documentObserver.observe(document.body, { childList: true, subtree: true });
  }
})();

function checkAuthAndInjectButton() {
  chrome.storage.local.get(
    ["enabled", "token", "userName", "userId", "userEmail"],
    (data) => {
      cleanupSuggestionSystem();

      removeButton();

      if (data.enabled !== false) {
        initializeWelcomeBox();
        injectButton();
      }
    }
  );
}

function cleanupSuggestionSystem() {
  // No need for the suggestion engine anymore - removed
  window.velocitySuggestionEngine = null;

  // Remove any suggestion-related event listeners
  const eventNames = ['velocitySuggestionsGenerated', 'velocitySuggestionUsed', 'velocityGenerateSuggestions'];
  eventNames.forEach(eventName => {
    const eventClone = new CustomEvent(eventName, {
      bubbles: true,
      detail: { cleanup: true }
    });
    document.dispatchEvent(eventClone);
  });

  // Clean up any UI elements
  const suggestionElements = document.querySelectorAll(
    ".velocity-suggestion-box, .velocity-suggestions-container, #velocity-suggestion-box"
  );
  suggestionElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Clean up any observers or timers
  if (window.inputObserver) {
    window.inputObserver.disconnect();
    window.inputObserver = null;
  }

  // Remove data attributes
  document.querySelectorAll("[data-velocity-monitored]").forEach((el) => {
    el.removeAttribute("data-velocity-monitored");
  });
}

function initSuggestionSystem() {
  // Suggestion engine has been removed - functionality moved to messageBoxStates.js
  // Just initialize platform state for compatibility
  const currentPlatform = detectPlatform();

  if (!currentPlatform) {
    return;
  }

  window.velocityWrapperState = window.velocityWrapperState || {};
  window.velocityWrapperState.platform = currentPlatform;
  
  // Log for debugging
  // console.log("[Velocity] Suggestion system handling moved to messageBoxStates.js");
}

function initializeWelcomeBox() {
  chrome.storage.local.get(["firstInstall", "welcomeDismissed"], (data) => {
    if (data.firstInstall !== false && !data.welcomeDismissed) {
      if (data.firstInstall === undefined) {
        chrome.storage.local.set({ firstInstall: true });
      }

      if (typeof window.showWelcomeMessage === "function") {
        window.showWelcomeMessage();
      } else {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("welcomeBox.js");
        script.onload = function () {
          if (typeof window.showWelcomeMessage === "function") {
            window.showWelcomeMessage();
          } else {
          }
        };
        document.head.appendChild(script);
      }
    }
  });
}

function injectButton() {
  chrome.storage.local.get("enabled", ({ enabled }) => {
    if (enabled === false) {
      return;
    }

    const platform = window.velocityWrapperState.platform;
    if (!platform || !window.platforms) {
      return;
    }

    if (window.velocityWrapperState.wrapper) {
      removeButton();
    }

    // Clean up any hover boxes and message boxes directly
    document.querySelectorAll(".velocity-hover-box, .velocity-message-box").forEach((box) => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });

    const platformConfig = window.platforms[platform];
    if (!platformConfig || !platformConfig.textAreaSelector) {
      return;
    }

    chrome.runtime.sendMessage({
      action: "trackMixpanelEvent",
      eventName: "Button Injected",
      properties: {
        platform: platform,
        url: window.location.href,
      },
    });

    findInputContainer(platformConfig.textAreaSelector);
  });
}

function findInputContainer(selector) {
  const findContainerForInput = (inputElement) => {
    if (!inputElement) return null;

    const inputRect = inputElement.getBoundingClientRect();

    let container = inputElement.parentElement;
    let depth = 0;
    const MAX_DEPTH = 8;

    const completeInputClassPatterns = [
      "input-container",
      "chat-input",
      "composer",
      "message-composer",
      "chat-composer",
      "input-box",
      "text-box",
      "message-box",
      "editor-container",
      "input-wrapper",
      "chat-box",
      "textarea-container",
      "text-input-container",
      "input-area",
      "chat-input-container",
      "prompt-container",
      "input-form",
      "form",
      "chat-form",
      "message-form",
      "composer-container",
      "message-input",
      "text-input",
      "editor-wrapper",
      "main-input",
      "chat-input-panel",
      "conversation-input",
      "message-creator",
    ];

    while (container && depth < MAX_DEPTH) {
      const className = container.className.toLowerCase();
      const id = (container.id || "").toLowerCase();

      const hasInputContainerClass = completeInputClassPatterns.some(
        (pattern) => className.includes(pattern) || id.includes(pattern)
      );

      const isFormElement =
        container.tagName === "FORM" ||
        container.getAttribute("role") === "form" ||
        className.includes("form");

      const style = window.getComputedStyle(container);
      const hasBorder = style.border !== "none" && style.border !== "";
      const hasBackground =
        style.backgroundColor !== "transparent" &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)";
      const hasBoxShadow = style.boxShadow !== "none" && style.boxShadow !== "";
      const isFlexOrGrid =
        style.display.includes("flex") || style.display.includes("grid");

      const hasButtons =
        container.querySelectorAll('button, [role="button"]').length > 0;

      const containerRect = container.getBoundingClientRect();
      const isSignificantlyLarger =
        containerRect.width > inputRect.width * 1.2 &&
        containerRect.height > inputRect.height * 1.1;

      if (
        (hasInputContainerClass || isFormElement) &&
        (hasButtons ||
          (isSignificantlyLarger &&
            (hasBorder || hasBackground || hasBoxShadow || isFlexOrGrid)))
      ) {
        const textArea = findTextAreaInContainer(container, inputElement);

        if (textArea) {
          const textAreaStyle = window.getComputedStyle(textArea);
          const hasOverflow =
            textAreaStyle.overflow === "auto" ||
            textAreaStyle.overflow === "scroll" ||
            textAreaStyle.overflowY === "auto" ||
            textAreaStyle.overflowY === "scroll";

          if (hasOverflow) {
            return {
              container: container,
              inputElement: inputElement,
              textArea: textArea,
              rect: container.getBoundingClientRect(),
              textAreaRect: container.getBoundingClientRect(),
            };
          }
        }

        return {
          container: container,
          inputElement: inputElement,
          textArea: textArea || inputElement,
          rect: container.getBoundingClientRect(),
          textAreaRect: (textArea || inputElement).getBoundingClientRect(),
        };
      }

      container = container.parentElement;
      depth++;
    }

    container = inputElement.parentElement;
    depth = 0;

    while (container && depth < MAX_DEPTH) {
      const childButtons = container.querySelectorAll(
        'button, svg, img, [role="button"]'
      ).length;
      const childDivs = container.querySelectorAll("div").length;
      const childSpans = container.querySelectorAll("span").length;
      const childIconElements = container.querySelectorAll(
        'svg, i, .icon, [class*="icon"]'
      ).length;

      const hasSendButton = Array.from(
        container.querySelectorAll('button, [role="button"]')
      ).some((button) => {
        const text = button.textContent.toLowerCase();
        const classes = button.className.toLowerCase();
        return (
          text.includes("send") ||
          classes.includes("send") ||
          classes.includes("submit") ||
          button.querySelector("svg") !== null
        );
      });

      const hasFormatting =
        container.querySelectorAll(
          '[class*="format"], [class*="toolbar"], [class*="counter"]'
        ).length > 0;

      const style = window.getComputedStyle(container);
      const hasBorder = style.border !== "none" && style.border !== "";
      const hasBackground =
        style.backgroundColor !== "transparent" &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)";
      const hasShadow = style.boxShadow !== "none" && style.boxShadow !== "";
      const hasPadding =
        parseInt(style.padding) > 0 || parseInt(style.paddingTop) > 0;
      const hasRoundedCorners = parseInt(style.borderRadius) > 0;

      const containerRect = container.getBoundingClientRect();
      const isWider = containerRect.width > inputRect.width + 40;
      const isAtBottom = containerRect.bottom > window.innerHeight * 0.6;

      let containerScore = 0;
      if (childButtons > 0) containerScore += 3;
      if (hasSendButton) containerScore += 5;
      if (hasFormatting) containerScore += 4;
      if (childIconElements > 0) containerScore += 2;
      if (hasBorder) containerScore += 2;
      if (hasBackground) containerScore += 2;
      if (hasShadow) containerScore += 2;
      if (hasRoundedCorners) containerScore += 3;
      if (hasPadding) containerScore += 1;
      if (isWider) containerScore += 2;
      if (isAtBottom) containerScore += 2;
      if (style.display.includes("flex") || style.display.includes("grid"))
        containerScore += 2;
      if (childDivs > 3 || childSpans > 2) containerScore += 1;

      if (containerScore >= 6) {
        const textArea = findTextAreaInContainer(container, inputElement);

        return {
          container: container,
          inputElement: inputElement,
          textArea: textArea || inputElement,
          rect: containerRect,
          textAreaRect: (textArea || inputElement).getBoundingClientRect(),
        };
      }

      container = container.parentElement;
      depth++;
    }

    container = inputElement.parentElement;
    depth = 0;
    let bestContainer = {
      element: inputElement,
      rect: inputRect,
      score: 0,
    };

    while (container && depth < MAX_DEPTH) {
      const containerRect = container.getBoundingClientRect();

      const widthDiff = containerRect.width - inputRect.width;
      const heightDiff = containerRect.height - inputRect.height;
      const isTooLarge =
        containerRect.width > window.innerWidth * 0.95 ||
        containerRect.height > window.innerHeight * 0.8;

      if (!isTooLarge) {
        let score = 0;

        if (
          widthDiff > 20 &&
          widthDiff < 300 &&
          heightDiff > 10 &&
          heightDiff < 200
        ) {
          score = (widthDiff + heightDiff) / 2;
        }

        const style = window.getComputedStyle(container);
        if (style.border !== "none" && style.border !== "") score += 30;
        if (style.borderRadius && parseInt(style.borderRadius) > 0) score += 20;
        if (style.boxShadow !== "none" && style.boxShadow !== "") score += 20;
        if (
          style.backgroundColor !== "transparent" &&
          style.backgroundColor !== "rgba(0, 0, 0, 0)"
        )
          score += 15;

        if (containerRect.bottom > window.innerHeight * 0.6) {
          score += 25;
        }

        const hasButtons =
          container.querySelectorAll(
            'button, [role="button"], svg, [class*="icon"]'
          ).length > 0;
        if (hasButtons) score += 40;

        if (score > bestContainer.score) {
          bestContainer = {
            element: container,
            rect: containerRect,
            score: score,
          };
        }
      }

      container = container.parentElement;
      depth++;
    }

    const textArea = findTextAreaInContainer(
      bestContainer.element,
      inputElement
    );

    return {
      container: bestContainer.element,
      inputElement: inputElement,
      textArea: textArea || inputElement,
      rect: bestContainer.rect,
      textAreaRect: (textArea || inputElement).getBoundingClientRect(),
    };
  };

  let inputElement = null;

  if (selector.includes(",")) {
    const selectors = selector.split(",").map((s) => s.trim());
    for (const singleSelector of selectors) {
      const element = document.querySelector(singleSelector);
      if (element) {
        inputElement = element;
        break;
      }
    }
  } else {
    inputElement = document.querySelector(selector);
  }

  if (inputElement) {
    const containerInfo = findContainerForInput(inputElement);
    if (containerInfo) {
      createFullWrapper(containerInfo);
      window.currentInputBox = containerInfo.textArea;

      window.velocityWrapperState.inputBox = containerInfo.textArea;
      clearInputField(window.velocityWrapperState.inputBox); // Added: Clear the input field
    } else {
      const fallbackInfo = {
        container: inputElement,
        inputElement: inputElement,
        textArea: inputElement,
        rect: inputElement.getBoundingClientRect(),
        textAreaRect: inputElement.getBoundingClientRect(),
      };
      createFullWrapper(fallbackInfo);

      window.velocityWrapperState.inputBox = inputElement;
      clearInputField(window.velocityWrapperState.inputBox); // Added: Clear the input field for fallback
    }
  } else {
    let debounceTimer = null;
    const inputObserver = new MutationObserver((mutations) => {
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        let delayedInput = null;
        if (selector.includes(",")) {
          const selectors = selector.split(",").map((s) => s.trim());
          for (const singleSelector of selectors) {
            const element = document.querySelector(singleSelector);
            if (element) {
              delayedInput = element;
              break;
            }
          }
        } else {
          delayedInput = document.querySelector(selector);
        }

        if (delayedInput) {
          const containerInfo = findContainerForInput(delayedInput);
          if (containerInfo) {
            createFullWrapper(containerInfo);
            window.currentInputBox = containerInfo.textArea;
            window.velocityWrapperState.inputBox = containerInfo.textArea;
            clearInputField(window.velocityWrapperState.inputBox); // Added: Clear the input field
          } else {
            const fallbackInfo = {
              container: delayedInput,
              inputElement: delayedInput,
              textArea: delayedInput,
              rect: delayedInput.getBoundingClientRect(),
              textAreaRect: delayedInput.getBoundingClientRect(),
            };
            createFullWrapper(fallbackInfo);
            window.velocityWrapperState.inputBox = delayedInput;
            clearInputField(window.velocityWrapperState.inputBox); // Added: Clear the input field for fallback
          }

          inputObserver.disconnect();
        }
      }, 300);
    });

    window._velocityObservers = window._velocityObservers || [];
    window._velocityObservers.push(inputObserver);

    inputObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    setTimeout(() => {
      if (!window.velocityWrapperState.wrapper) {
        inputObserver.disconnect();
        tryAlternativeContainers();
      }
    }, 1000);
  }
}

function findTextAreaInContainer(container, fallbackInput) {
  if (!container) return fallbackInput;

  const editableSelectors = [
    ".ProseMirror",
    ".ql-editor",
    ".CodeMirror",
    ".tox-edit-area",
    "textarea",
    'div[contenteditable="true"]',
    'div[role="textbox"]',
    'input[type="text"]',
    'div[class*="editor"]',
    'div[class*="input"]',
    'div[class*="textarea"]',
    'div[class*="text-field"]',
    "[contenteditable]",
    '[role="textbox"]',
  ];

  for (const selector of editableSelectors) {
    const elements = container.querySelectorAll(selector);
    if (elements.length > 0) {
      if (elements.length > 1) {
        const elementsArray = Array.from(elements);

        const visibleElements = elementsArray.filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 50 &&
            rect.height > 20 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        });

        if (visibleElements.length > 0) {
          return visibleElements.reduce((largest, current) => {
            const largestRect = largest.getBoundingClientRect();
            const currentRect = current.getBoundingClientRect();

            const largestArea = largestRect.width * largestRect.height;
            const currentArea = currentRect.width * currentRect.height;

            return currentArea > largestArea ? current : largest;
          });
        }
      }

      return elements[0];
    }
  }

  const allElements = container.querySelectorAll("*");
  let bestTextArea = null;
  let bestScore = 0;

  for (const el of allElements) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (
      rect.width < 50 ||
      rect.height < 20 ||
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      continue;
    }

    let score = 0;

    if (el.tagName === "TEXTAREA") score += 100;
    if (el.tagName === "INPUT" && el.type === "text") score += 90;
    if (el.getAttribute("contenteditable") === "true") score += 100;
    if (el.getAttribute("role") === "textbox") score += 80;

    const className = el.className.toLowerCase();
    if (className.includes("editor")) score += 70;
    if (className.includes("input")) score += 60;
    if (className.includes("text")) score += 40;
    if (className.includes("content")) score += 30;

    if (el.getAttribute("placeholder")) score += 60;

    if (
      style.backgroundColor !== "transparent" &&
      style.backgroundColor !== "rgba(0, 0, 0, 0)"
    )
      score += 20;
    if (style.border !== "none" && style.border !== "") score += 30;
    if (parseInt(style.borderRadius) > 0) score += 10;

    const area = rect.width * rect.height;
    const containerRect = container.getBoundingClientRect();
    const containerArea = containerRect.width * containerRect.height;

    if (area > containerArea * 0.3 && area < containerArea * 0.9) {
      score += 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTextArea = el;
    }
  }

  if (bestScore > 100) {
    return bestTextArea;
  }

  return fallbackInput;
}

function createFullWrapper(containerInfo) {
  const { container, inputElement, textArea, rect, textAreaRect } =
    containerInfo;

  const existingWrappers = document.querySelectorAll(".velocity-wrapper");
  existingWrappers.forEach((wrapper) => {
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  });

  const existingButtons = document.querySelectorAll(
    ".velocity-button-container"
  );
  existingButtons.forEach((button) => {
    if (button && button.parentNode) {
      button.parentNode.removeChild(button);
    }
  });

  if (
    window.velocityQualityAnalyzer &&
    typeof window.velocityQualityAnalyzer.cleanup === "function"
  ) {
    window.velocityQualityAnalyzer.cleanup();
  }

  const containerRect = container.getBoundingClientRect();

  const paddingTop = 40;
  const paddingRight = 60;
  const paddingBottom = 60;
  const paddingLeft = 60;

  const wrapper = document.createElement("div");
  wrapper.className = "velocity-wrapper";
  wrapper.style.cssText = `
    position: fixed;
    top: ${containerRect.top - paddingTop}px;
    left: ${containerRect.left - paddingLeft}px;
    width: ${containerRect.width + (paddingLeft + paddingRight)}px;
    height: ${containerRect.height + (paddingTop + paddingBottom)}px;
    z-index: 9998;
    pointer-events: none;
    // border: 1px dashed rgba(0, 136, 255, 0.2);
    box-sizing: border-box;
  `;

  let positionDebounceTimer = null;
  const updateWrapperPosition = () => {
    if (positionDebounceTimer) clearTimeout(positionDebounceTimer);

    positionDebounceTimer = setTimeout(() => {
      if (!container || !document.body.contains(container)) {
        if (wrapper && wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
        return;
      }

      const newContainerRect = container.getBoundingClientRect();

      wrapper.style.top = `${newContainerRect.top - paddingTop}px`;
      wrapper.style.left = `${newContainerRect.left - paddingLeft}px`;
      wrapper.style.width = `${
        newContainerRect.width + (paddingLeft + paddingRight)
      }px`;
      wrapper.style.height = `${
        newContainerRect.height + (paddingTop + paddingBottom)
      }px`;

      const button = window.velocityWrapperState.button;
      if (button) {
        const position = button.dataset.anchorPosition || "top-right";
        const anchors = window.velocityWrapperState.anchors;
        let anchor = null;

        if (position === "top-left") anchor = anchors.topLeft;
        else if (position === "top-right") anchor = anchors.topRight;
        else if (position === "bottom-left") anchor = anchors.bottomLeft;
        else if (position === "bottom-right") anchor = anchors.bottomRight;

        if (anchor) {
          snapButtonToAnchor(button, anchor);
        }
      }
    }, 100);
  };

  const mutationObserver = new MutationObserver(() => {
    updateWrapperPosition();
  });

  mutationObserver.observe(container, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  if (textArea && textArea !== container) {
    mutationObserver.observe(textArea, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  const resizeObserver = new ResizeObserver(() => {
    updateWrapperPosition();
  });

  const scrollHandler = () => {
    updateWrapperPosition();
  };

  resizeObserver.observe(container);
  if (textArea && textArea !== container) {
    resizeObserver.observe(textArea);
  }

  window.addEventListener("scroll", scrollHandler, { passive: true });
  let parent = container.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      parent.addEventListener("scroll", scrollHandler, { passive: true });
    }
    parent = parent.parentElement;
  }

  window.addEventListener("resize", scrollHandler, { passive: true });

  window._velocityObservers = window._velocityObservers || [];
  window._velocityObservers.push(resizeObserver);
  window._velocityObservers.push(mutationObserver);
  window._velocityScrollHandlers = window._velocityScrollHandlers || [];
  window._velocityScrollHandlers.push({
    element: window,
    handler: scrollHandler,
  });
  window._velocityScrollHandlers.push({
    element: window,
    handler: window.addEventListener("resize", scrollHandler, {
      passive: true,
    }),
  });

  window.velocityWrapperState.wrapper = wrapper;
  window.velocityWrapperState.container = container;
  window.velocityWrapperState.inputBox = textArea;

  createAnchorPoints(wrapper);

  const buttonContainer = createDraggableButton(wrapper);

  document.body.appendChild(wrapper);

  updateWrapperPosition();

  return wrapper;
}

function createAnchorPoints(wrapper) {
  const anchors = {
    topLeft: createAnchor("top-left"),
    topRight: createAnchor("top-right"),
    bottomLeft: createAnchor("bottom-left"),
    bottomRight: createAnchor("bottom-right"),
  };

  const platform = window.velocityWrapperState.platform;

  let anchorPositions = {
    topLeft: { top: "0", left: "0%" },
    topRight: { top: "0", right: "0%" },
    bottomLeft: { bottom: "0%", left: "0%" },
    bottomRight: { bottom: "14%", right: "17%" },
    defaultAnchor: "topRight",
  };

  if (
    platform &&
    window.platforms &&
    window.platforms[platform] &&
    window.platforms[platform].anchorPositions
  ) {
    anchorPositions = window.platforms[platform].anchorPositions;
  } else {
  }

  for (const [key, anchor] of Object.entries(anchors)) {
    if (anchorPositions[key]) {
      Object.entries(anchorPositions[key]).forEach(([prop, value]) => {
        anchor.style[prop] = value;
      });
    }
  }

  Object.values(anchors).forEach((anchor) => {
    wrapper.appendChild(anchor);
  });

  window.velocityWrapperState.anchors = anchors;
  window.velocityWrapperState.defaultAnchor =
    anchorPositions.defaultAnchor || "topRight";
}

function handleButtonClick(event, button, innerDiv) {
  // console.log('[Velocity DEBUG] handleButtonClick called');
  event.stopPropagation();
  event.preventDefault();

  if (button.disabled || button.classList.contains("processing")) {
    console.warn('[Velocity DEBUG] Button is disabled or processing, aborting click');
    return;
  }

  const currentInputBox = window.velocityWrapperState.inputBox;
  if (!currentInputBox) {
    // Log UI failure when input box is not found
    logToBackend('error', 'UI failure in content script', { 
      reason: 'Input box not found in handleButtonClick',
      platform: window.velocityWrapperState.platform || 'unknown'
    });
    console.error("[Velocity DEBUG] Input box not found in handleButtonClick");
    return;
  }
  
  // Log user action - clicked enhance button
  logToBackend('info', 'User clicked enhance in content script', {
    platform: window.velocityWrapperState.platform || 'unknown',
    hasInput: !!currentInputBox.value || !!currentInputBox.innerText || !!currentInputBox.textContent
  });

  let userPrompt = "";
  if (currentInputBox.tagName === "TEXTAREA") {
    userPrompt = currentInputBox.value.trim();
  } else if (currentInputBox.hasAttribute("contenteditable")) {
    userPrompt = currentInputBox.innerText.trim();
  } else {
    userPrompt = currentInputBox.textContent.trim();
  }

  function toBase64Unicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  const promptHash = toBase64Unicode(userPrompt).substring(0, 20);
  const now = Date.now();
  const recentEnhancements = window.velocityRecentEnhancements || {};

  if (
    recentEnhancements[promptHash] &&
    now - recentEnhancements[promptHash] < 2000
  ) {
    console.warn('[Velocity DEBUG] Enhancement throttled for promptHash:', promptHash);
    return;
  }

  if (!window.velocityRecentEnhancements) {
    window.velocityRecentEnhancements = {};
  }
  window.velocityRecentEnhancements[promptHash] = now;

  Object.keys(window.velocityRecentEnhancements).forEach((hash) => {
    if (now - window.velocityRecentEnhancements[hash] > 300000) {
      delete window.velocityRecentEnhancements[hash];
    }
  });

  button.disabled = true;
  button.classList.add("processing");
  // console.log('[Velocity DEBUG] Button set to processing');

  if (window.velocityQualityState && window.velocityQualityState.indicator) {
    window.velocityQualityState.indicator.style.display = "none";
    window.velocityQualityState.hiddenByButtonClick = true;
  }

  if (window.togglePromptReviewBox) {
    window.togglePromptReviewBox(false);
  }

  if (!window.velocityWrapperState.buttonSystem) {
    const platformKey = window.velocityWrapperState.platform;
    const platformConfig = window.platforms
      ? window.platforms[platformKey]
      : null;
    initializeButtonAnimationSystem(platformConfig, button);
  }

  const platform = window.velocityWrapperState.platform;
  const inputBox = window.velocityWrapperState.inputBox;
  let promptLength = 0;

  if (inputBox) {
    if (inputBox.tagName === "TEXTAREA") {
      promptLength = inputBox.value.trim().length;
    } else if (inputBox.hasAttribute("contenteditable")) {
      promptLength = inputBox.innerText.trim().length;
    } else {
      promptLength = inputBox.textContent.trim().length;
    }
  }

  chrome.runtime.sendMessage({
    action: "trackMixpanelEvent",
    eventName: "Platform Button Clicked",
    properties: {
      platform: platform,
      prompt_length: promptLength,
    },
  });

  chrome.storage.local.get(
    ["FreeUser", "freeUsage", "token"],
    (freeUserData) => {
      if (
        freeUserData.FreeUser === true &&
        freeUserData.freeUsage >= 3 &&
        !freeUserData.token
      ) {
        console.warn('[Velocity DEBUG] Free user limit reached, showing trial finished popup');
        showTrialFinishedPopupWithDisabledAnimations();
        return;
      }

      const platform = window.velocityWrapperState.platform;
      const inputBox = window.velocityWrapperState.inputBox;

      if (!inputBox) {
        console.error("[Velocity DEBUG] Input box not found during button click (after freeUser check)");
        return;
      }

      let userPrompt = "";
      if (inputBox.tagName === "TEXTAREA") {
        userPrompt = inputBox.value.trim();
      } else if (inputBox.hasAttribute("contenteditable")) {
        userPrompt = inputBox.innerText.trim();
      } else {
        userPrompt = inputBox.textContent.trim();
      }

      if (!userPrompt) {
        console.warn('[Velocity DEBUG] No user prompt entered');
        if (window.velocityWrapperState.buttonSystem) {
          window.velocityWrapperState.buttonSystem.messageSystem.showMessage(
            "warning",
            {
              text: "Please enter some text before enhancing!",
              type: "warning",
              button: button,
              positionStrategy: "relativeToButton",
              duration: 3000,
            }
          );
          setTimeout(() => {
            if (
              window.velocityQualityState &&
              window.velocityQualityState.indicator &&
              window.velocityQualityState.hiddenByButtonClick
            ) {
              window.velocityQualityState.indicator.style.display = "";
              window.velocityQualityState.hiddenByButtonClick = false;
            }
            if (button) {
              button.classList.remove("clicked-by-user");
            }
          }, 3100);
        } else {
          if (
            window.velocityAnimations &&
            window.velocityAnimations.createMessageBox
          ) {
            // Remove old message box creation
            // const msgBox = window.velocityAnimations.createMessageBox(
            //   "Please enter some text before enhancing!",
            //   "warning",
            //   button
            // );
            // setTimeout(() => {
            //   if (msgBox && msgBox.parentNode) {
            //     msgBox.parentNode.removeChild(msgBox);
            //   }
            //   if (
            //     window.velocityQualityState &&
            //     window.velocityQualityState.indicator &&
            //     window.velocityQualityState.hiddenByButtonClick
            //   ) {
            //     window.velocityQualityState.indicator.style.display = "";
            //     window.velocityQualityState.hiddenByButtonClick = false;
            //   }
            //   if (button) {
            //     button.classList.remove("clicked-by-user");
            //   }
            // }, 3100);
            // Instead, use a velocity-notification.warning styled box
            const existingWarning = document.querySelector('.velocity-notification.warning');
            if (existingWarning) existingWarning.remove();
            const warningBox = document.createElement('div');
            warningBox.className = 'velocity-notification warning';
            warningBox.textContent = 'Please enter some text before enhancing!';
            // Set border color based on theme
            if (document.body.classList.contains('dark-mode')) {
              warningBox.style.border = '1px solid #fff';
            } else {
              warningBox.style.border = '1px solid #000';
            }
            document.body.appendChild(warningBox);
            setTimeout(() => {
              if (warningBox && warningBox.parentNode) {
                warningBox.parentNode.removeChild(warningBox);
              }
              if (
                window.velocityQualityState &&
                window.velocityQualityState.indicator &&
                window.velocityQualityState.hiddenByButtonClick
              ) {
                window.velocityQualityState.indicator.style.display = "";
                window.velocityQualityState.hiddenByButtonClick = false;
              }
              if (button) {
                button.classList.remove("clicked-by-user");
              }
            }, 3100);
          }
        }
        button.disabled = false;
        button.classList.remove("processing");
        return;
      }

      chrome.storage.local.get(["selectedStyle"], (result) => {
        let selectedStyle = result.selectedStyle || "Descriptive";

        if (window.velocitySuggestions && window.velocitySuggestions.hideBox) {
          window.velocitySuggestions.hideBox();
        }

        window.velocitySuggestionState = window.velocitySuggestionState || {};
        window.velocitySuggestionState.isBoxHidden = false;
        window.velocitySuggestionState.sendButtonPressed = false;

        let intent = "";
        let intent_description = "";

        if (
          window.velocityWebSocketResponse &&
          window.velocityWebSocketResponse.main_intent
        ) {
          intent = window.velocityWebSocketResponse.main_intent.category || "";
          intent_description = window.velocityWebSocketResponse.main_intent.description || "";
        } else if (window.velocityIntentData) {
          intent = window.velocityIntentData.intent || "";
          intent_description = window.velocityIntentData.intent_description || "";
        } else {
          intent = "";
          intent_description = "";
        }

    

        chrome.runtime.sendMessage(
          {
            action: "EnhancePromptV2",
            prompt: userPrompt,
            style: selectedStyle,
            platform: platform,
            intent: intent,
            intent_description: intent_description,
            chat_history: ["", "", ""],
            context: "",
            domain: "",
          },
          (response) => {
            // Do NOT clear the timeout or message box
            // If velocityEnhanceBlocked is true, do not inject or display the enhanced prompt
            // if (window.velocityEnhanceBlocked) {
            //   console.warn('[Velocity DEBUG] Enhance prompt blocked due to high traffic message.');
            //   return;
            // }
            // Clear the 12s timeout and remove the traffic message box on any response
            if (enhanceTimeoutId) {
              clearTimeout(enhanceTimeoutId);
              enhanceTimeoutId = null;
              clearTrafficMessageBox();
            }
            
            // console.log('[Velocity DEBUG] EnhancePromptV2 response:', response);
            if (chrome.runtime.lastError) {
              console.error('[Velocity DEBUG] Chrome runtime error in EnhancePromptV2:', chrome.runtime.lastError);
              if (window.velocityWrapperState?.buttonSystem?.state?.currentButton) {
                const currentButton = window.velocityWrapperState.buttonSystem.state.currentButton;
                currentButton.disabled = false;
                currentButton.classList.remove("processing");
              }
              if (window.velocitySuggestions && window.velocitySuggestions.setEnhancedPromptActive) {
                window.velocitySuggestions.setEnhancedPromptActive(false, 0);
              }
              if (innerDiv) innerDiv.classList.remove("rotating");
              if (window.velocityWrapperState && window.velocityWrapperState.buttonSystem) {
                const button = window.velocityWrapperState.buttonSystem.state.currentButton;
              if (button) {
                  window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(button);
                  window.velocityWrapperState.buttonSystem.animationManager.stopAnimation("loading");
                  window.velocityWrapperState.buttonSystem.stateMachine.transition("idle", { button });
                  window.velocityWrapperState.buttonSystem.messageSystem.showMessage(
                    "error",
                    {
                      text: "Error enhancing prompt: " + (chrome.runtime.lastError.message || "Unknown error"),
                      type: "error",
                      button: button,
                      positionStrategy: "relativeToButton",
                      duration: 5000,
                    }
                  );
                  if (window.velocityQualityState && window.velocityQualityState.indicator) {
                    window.velocityQualityState.indicator.style.display = "";
                  }
                }
              }
              return;
            }
            if (!response || !response.success) {
              console.error('[Velocity DEBUG] EnhancePromptV2 failed:', response);
              if (window.velocityWrapperState?.buttonSystem?.state?.currentButton) {
                const currentButton = window.velocityWrapperState.buttonSystem.state.currentButton;
                currentButton.disabled = false;
                currentButton.classList.remove("processing");
              }
              if (window.velocitySuggestions && window.velocitySuggestions.setEnhancedPromptActive) {
                window.velocitySuggestions.setEnhancedPromptActive(false, 0);
              }
              if (innerDiv) innerDiv.classList.remove("rotating");
              if (window.velocityWrapperState && window.velocityWrapperState.buttonSystem) {
                const button = window.velocityWrapperState.buttonSystem.state.currentButton;
                if (button) {
                  window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(button);
                  window.velocityWrapperState.buttonSystem.animationManager.stopAnimation("loading");
                  window.velocityWrapperState.buttonSystem.stateMachine.transition("idle", { button });
                  window.velocityWrapperState.buttonSystem.messageSystem.showMessage(
                    "error",
                    {
                      text: "Error enhancing prompt: " + (response?.error || "Unknown error"),
                      type: "error",
                      button: button,
                      positionStrategy: "relativeToButton",
                      duration: 5000,
                    }
                  );
                  if (window.velocityQualityState && window.velocityQualityState.indicator) {
                    window.velocityQualityState.indicator.style.display = "";
                  }
                }
              }
              return;
            }
            // console.log('[Velocity DEBUG] EnhancePromptV2 success, injecting enhanced prompt');
            const currentButton = window.velocityWrapperState?.buttonSystem?.state?.currentButton;
            if (currentButton) {
              currentButton.disabled = false;
              currentButton.classList.remove("processing");
            }
              try {
                const enhancedPrompt =
                  response.data?.data?.enhanced_prompt ||
                  response.data?.enhanced_prompt ||
                  response.data;
                if (enhancedPrompt && typeof enhancedPrompt === "string") {
                  const inputBox = window.velocityWrapperState.inputBox;
                  if (inputBox) {
                    if (inputBox.tagName === "TEXTAREA") {
                      inputBox.value = enhancedPrompt;
                      inputBox.dispatchEvent(
                        new Event("input", { bubbles: true })
                      );
                    } else if (inputBox.hasAttribute("contenteditable")) {
                      inputBox.innerText = enhancedPrompt;
                      inputBox.dispatchEvent(
                        new Event("input", { bubbles: true })
                      );
                    }
                    inputBox.classList.add(
                      "velocity-enhanced-highlight",
                      "velocity-enhanced-scale"
                    );
                    setTimeout(() => {
                      inputBox.classList.remove(
                        "velocity-enhanced-highlight",
                        "velocity-enhanced-scale"
                      );
                    }, 1000);
                    chrome.storage.local.get(['userId', 'token'], async (userData) => {
                      if (!userData.userId || !userData.token) {
                      console.error('[Velocity DEBUG] Missing user data for saving prompt');
                        return;
                      }
                      try {
                        const saveResponse = await chrome.runtime.sendMessage({
                          action: 'saveResponseToHistory',
                          data: {
                            user_id: userData.userId,
                            prompt: userPrompt,
                            enhanced_prompt: enhancedPrompt,
                            ai_type: platform,
                            style: selectedStyle,
                            intent: intent,
                            intent_description: intent_description,
                            processing_time_ms: response.data?.processing_time_ms || null,
                            relevance_analysis: response.data?.relevance_analysis || null
                          }
                        });
                      // console.log('[Velocity DEBUG] Save response result:', saveResponse);
                      } catch (error) {
                      console.error('[Velocity DEBUG] Error saving prompt to history:', error);
                      }
                    });
                    if (window.velocityWrapperState.buttonSystem) {
                      const currentButton =
                        window.velocityWrapperState.buttonSystem.state
                          .currentButton;
                      if (currentButton) {
                        window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(
                          currentButton
                        );
                        window.velocityWrapperState.buttonSystem.animationManager.stopAnimation(
                          "loading"
                        );
                        window.velocityWrapperState.buttonSystem.stateMachine.transition(
                          "idle",
                          { button: currentButton }
                        );
                      }
                    }
                    if (innerDiv) {
                      innerDiv.classList.remove("rotating");
                    }
                    if (
                      window.velocityQualityState &&
                      window.velocityQualityState.indicator &&
                      window.velocityQualityState.hiddenByButtonClick
                    ) {
                      window.velocityQualityState.indicator.style.display = "";
                      window.velocityQualityState.hiddenByButtonClick = false;
                    }
                    if (button) {
                      button.classList.remove("clicked-by-user");
                    }
                  } else {
                  console.error("[Velocity DEBUG] Input box not found for injection");
                  }
                } else {
                console.error("[Velocity DEBUG] No valid enhanced prompt found in response");
                }
              } catch (error) {
              console.error("[Velocity DEBUG] Error injecting enhanced prompt:", error);
              }
          }
        );
      });
    }
  );

  // --- Add 12s timeout logic ---
  let enhanceTimeoutId = null;
  let trafficMessageBox = null;
  let enhanceAbortController = null; // For aborting fetch if possible
  function showTrafficMessageBox() {
    // Remove any existing message box
    if (trafficMessageBox && trafficMessageBox.parentNode) {
      trafficMessageBox.parentNode.removeChild(trafficMessageBox);
    }
    // Set the block flag
    window.velocityEnhanceBlocked = true;
    // Abort the API call if possible
    if (enhanceAbortController) {
      try { enhanceAbortController.abort(); } catch (e) {}
    }
    // Create the message box
    trafficMessageBox = document.createElement('div');
    trafficMessageBox.className = 'velocity-state-message-box visible velocity-traffic-message-box';
    trafficMessageBox.setAttribute('data-state', 'bad');
    trafficMessageBox.setAttribute('data-position', 'right');
    trafficMessageBox.innerHTML = `
      <div class="message-header">
        <span class="state-indicator" style="background:#fbbf24;color:#fff;">!</span>
        <span class="state-title">High Traffic</span>
        <button class="close-button" style="margin-left:auto;background:none;border:none;font-size:20px;cursor:pointer;color:#888;">&times;</button>
      </div>
      <div class="message-content">
        Currently we are facing high traffic, you can wait or try refreshing the page.
      </div>
    `;
    // Close button logic
    trafficMessageBox.querySelector('.close-button').onclick = function() {
      if (trafficMessageBox && trafficMessageBox.parentNode) {
        trafficMessageBox.parentNode.removeChild(trafficMessageBox);
      }
      window.velocityEnhanceBlocked = false;
    };
    // Position to the right of the injected button
    const btnRect = button.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    // Calculate position: right side, vertically centered to button
    const boxWidth = 320; // Approximate width
    const offset = 16; // px
    trafficMessageBox.style.position = 'absolute';
    trafficMessageBox.style.top = (btnRect.top + scrollY + btnRect.height/2 - 48) + 'px';
    trafficMessageBox.style.left = (btnRect.right + offset + scrollX) + 'px';
    trafficMessageBox.style.zIndex = 10001;
    document.body.appendChild(trafficMessageBox);
  }
  function clearTrafficMessageBox() {
    if (trafficMessageBox && trafficMessageBox.parentNode) {
      trafficMessageBox.parentNode.removeChild(trafficMessageBox);
      trafficMessageBox = null;
    }
    window.velocityEnhanceBlocked = false;
  }
  function stopButtonAnimation() {
    button.disabled = false;
    button.classList.remove('processing');
    if (innerDiv) innerDiv.classList.remove('rotating');
    if (window.velocityWrapperState && window.velocityWrapperState.buttonSystem) {
      window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(button);
      if (window.velocityWrapperState.buttonSystem.animationManager) {
        window.velocityWrapperState.buttonSystem.animationManager.stopAnimation('loading');
      }
      if (window.velocityWrapperState.buttonSystem.stateMachine) {
        window.velocityWrapperState.buttonSystem.stateMachine.transition('idle', { button });
      }
    }
  }
  // Start the timeout (8s for better user experience)
  enhanceTimeoutId = setTimeout(() => {
    stopButtonAnimation();
    showTrafficMessageBox();
  }, 12000); // 8000ms for better user experience
}

function setupSuggestionBoxIntegration() {
  // Suggestion engine functionality removed - all handled in messageBoxStates.js
  // console.log("[Velocity] Suggestion integration now handled in messageBoxStates.js");
}

function integrateWithSuggestionSystem() {
  // All suggestion functionality now handled by messageBoxStates.js directly
  // console.log("[Velocity] Suggestion system integration moved to messageBoxStates.js");
}

function createAnchor(position) {
  const anchor = document.createElement("div");
  anchor.className = `velocity-anchor velocity-anchor-${position}`;
  anchor.dataset.position = position;

  // Initially hide the anchor points
  anchor.style.cssText = `
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: rgba(0, 136, 255, 0.5);
    border-radius: 50%;
    z-index: 9999;
    pointer-events: auto;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.2s, opacity 0.2s;
    opacity: 0; /* Start hidden */
    visibility: hidden; /* Start hidden */
  `;

  anchor.addEventListener("mouseenter", () => {
    anchor.style.backgroundColor = "rgba(0, 136, 255, 0.8)";
    anchor.style.transform = "scale(1.2)";
  });

  anchor.addEventListener("mouseleave", () => {
    anchor.style.backgroundColor = "rgba(0, 136, 255, 0.5)";
    anchor.style.transform = "scale(1)";
  });

  return anchor;
}

function createDraggableButton(wrapper) {
  const buttonContainer = document.createElement("div");
  buttonContainer.className =
    "velocity-button-container custom-injected-button";
  buttonContainer.style.cssText = `
    position: fixed;
    z-index: 10000;
    pointer-events: auto;
    cursor: move;
  `;

  const button = document.createElement("button");
  button.className = "velocity-button";
  button.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: black;
    height: 36px;
    width: 36px;
    transition: opacity 0.2s;
    border: none;
    outline: none;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    cursor: pointer;
    pointer-events: auto;
    z-index: 10;
  `;

  button.addEventListener("mouseenter", () => (button.style.opacity = "0.7"));
  button.addEventListener("mouseleave", () => (button.style.opacity = "1"));

  const innerDiv = document.createElement("div");
  innerDiv.className = "velocity-button-inner";

  const coinImage = document.createElement("img");
  coinImage.src = chrome.runtime.getURL("assets/Velocity.png");
  coinImage.style.cssText = `
    width: 36px !important;
    height: 36px !important;
    max-width: 36px !important;
    max-height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    object-fit: contain !important;
    border-radius: 50% !important;
    flex-shrink: 0 !important;
    display: block !important;
  `;
  innerDiv.appendChild(coinImage);

  button.appendChild(innerDiv);
  buttonContainer.appendChild(button);

  let isDragging = false;
  let startX, startY;
  let offsetX = 0,
    offsetY = 0;

  buttonContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = buttonContainer.getBoundingClientRect();
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;

    window.velocityWrapperState.isDragging = true;
    window.velocityWrapperState.dragOffsetX = offsetX;
    window.velocityWrapperState.dragOffsetY = offsetY;

    // Show anchor points when dragging starts
    const anchors = window.velocityWrapperState.anchors;
    if (anchors) {
      Object.values(anchors).forEach((anchor) => {
        anchor.style.opacity = "1";
        anchor.style.visibility = "visible";
      });
    }

    // Hide any message boxes during dragging
    const messageBoxes = document.querySelectorAll(".velocity-message-box");
    messageBoxes.forEach((box) => {
      box.style.display = "none";
    });

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    newX = Math.max(
      wrapperRect.left,
      Math.min(newX, wrapperRect.right - buttonContainer.offsetWidth)
    );
    newY = Math.max(
      wrapperRect.top,
      Math.min(newY, wrapperRect.bottom - buttonContainer.offsetHeight)
    );

    buttonContainer.style.left = newX + "px";
    buttonContainer.style.top = newY + "px";
  });

  document.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    window.velocityWrapperState.isDragging = false;

    snapToNearestAnchor(buttonContainer, wrapper);

    // Hide anchor points when dragging stops
    const anchors = window.velocityWrapperState.anchors;
    if (anchors) {
      Object.values(anchors).forEach((anchor) => {
        anchor.style.opacity = "0";
        anchor.style.visibility = "hidden";
      });
    }
  });

  button.addEventListener("click", (e) => {
    if (window.velocityWrapperState.isDragging) {
      e.stopPropagation();
      return;
    }

    button.classList.add("clicked-by-user");
    handleButtonClick(e, button, innerDiv);
  });

  wrapper.appendChild(buttonContainer);
  window.velocityWrapperState.button = buttonContainer;

  snapButtonToAnchor(
    buttonContainer,
    window.velocityWrapperState.anchors.topRight
  );

  // Initialize animations with the new system - pass the actual button
  const platformKey = window.velocityWrapperState.platform;
  const platformConfig = window.platforms
    ? window.platforms[platformKey]
    : null;
  initializeButtonAnimationSystem(platformConfig, button); // Pass the actual button element

  // Initialize writing quality analyzer
  if (
    window.velocityQualityAnalyzer &&
    typeof window.velocityQualityAnalyzer.init === "function"
  ) {
    window.velocityQualityAnalyzer.init({
      platform: platformKey,
    });
  }

  // Initialize state message box for WebSocket response states
  if (
    window.velocityStateMessageBox &&
    typeof window.velocityStateMessageBox.setupButtonHover === "function"
  ) {
    try {
      window.velocityStateMessageBox.setupButtonHover(button);
    } catch (e) {
      console.error("[Velocity] Error initializing state message box:", e);
      console.error("[Velocity] Error details:", e.message);
      console.error("[Velocity] Error stack:", e.stack);
    }
  } else {
    console.warn(
      "[Velocity] State message box not available for initialization"
    );
    if (!window.velocityStateMessageBox) {
      console.warn("[Velocity] velocityStateMessageBox is not defined");
    } else if (
      typeof window.velocityStateMessageBox.setupButtonHover !== "function"
    ) {
      console.warn("[Velocity] setupButtonHover function is not available");
    }
  }

  // Hover box functionality removed

  return buttonContainer;
}

function removeButton() {
  // Clean up quality analyzer if it exists
  if (
    window.velocityQualityAnalyzer &&
    typeof window.velocityQualityAnalyzer.cleanup === "function"
  ) {
    window.velocityQualityAnalyzer.cleanup();
  }

  // Clean up button animation system
  if (window.velocityWrapperState.buttonSystem) {
    window.velocityWrapperState.buttonSystem.reset();
    window.velocityWrapperState.buttonSystem = null;
  } else if (
    window.velocityAnimations &&
    window.velocityAnimations.resetState
  ) {
    window.velocityAnimations.resetState();
  }

  // Clean up any hover boxes and message boxes directly
  document.querySelectorAll(".velocity-hover-box, .velocity-message-box").forEach((box) => {
    if (box && box.parentNode) {
      box.parentNode.removeChild(box);
    }
  });

  const wrapper = window.velocityWrapperState.wrapper;
  if (wrapper && wrapper.parentNode) {
    if (window._velocityObservers && window._velocityObservers.length) {
      window._velocityObservers.forEach((observer) => {
        try {
          observer.disconnect();
        } catch (e) {
          // console.error("[Velocity] Error disconnecting observer:", e);
        }
      });
      window._velocityObservers = [];
    }

    if (
      window._velocityScrollHandlers &&
      window._velocityScrollHandlers.length
    ) {
      window._velocityScrollHandlers.forEach(({ element, handler }) => {
        try {
          element.removeEventListener("scroll", handler);
        } catch (e) {
          // console.error("[Velocity] Error removing scroll listener:", e);
        }
      });
      window._velocityScrollHandlers = [];
    }

    wrapper.parentNode.removeChild(wrapper);
  }

  window.velocityWrapperState.wrapper = null;
  window.velocityWrapperState.container = null;
  window.velocityWrapperState.inputBox = null;
  window.velocityWrapperState.button = null;
  window.velocityWrapperState.anchors = {};
  window.velocityWrapperState.isDragging = false;
  window.velocityWrapperState.dragOffsetX = 0;
  window.velocityWrapperState.dragOffsetY = 0;
}

function snapToNearestAnchor(button, wrapper) {
  const buttonRect = button.getBoundingClientRect();
  const buttonCenterX = buttonRect.left + buttonRect.width / 2;
  const buttonCenterY = buttonRect.top + buttonRect.height / 2;

  const anchors = window.velocityWrapperState.anchors;

  const distances = {};
  for (const [position, anchor] of Object.entries(anchors)) {
    const anchorRect = anchor.getBoundingClientRect();
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;

    distances[position] = Math.hypot(
      buttonCenterX - anchorCenterX,
      buttonCenterY - anchorCenterY
    );
  }

  let closestPosition = "topLeft";
  let minDistance = Infinity;

  for (const [position, distance] of Object.entries(distances)) {
    if (distance < minDistance) {
      minDistance = distance;
      closestPosition = position;
    }
  }

  snapButtonToAnchor(button, anchors[closestPosition]);
}

function snapButtonToAnchor(button, anchor) {
  const anchorPosition = anchor.dataset.position;
  button.dataset.anchorPosition = anchorPosition;

  const anchorRect = anchor.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();

  let offsetX = 0,
    offsetY = 0;

  switch (anchorPosition) {
    case "top-left":
      offsetX = 0;
      offsetY = 0;
      break;
    case "top-right":
      offsetX = -(buttonRect.width - anchorRect.width);
      offsetY = 0;
      break;
    case "bottom-left":
      offsetX = 0;
      offsetY = -(buttonRect.height - anchorRect.height);
      break;
    case "bottom-right":
      offsetX = -(buttonRect.width - anchorRect.width);
      offsetY = -(buttonRect.height - anchorRect.height);
      break;
  }

  const newLeft = anchorRect.left + offsetX;
  const newTop = anchorRect.top + offsetY;

  // Remove transition for instant snap
  // button.style.transition = "left 0.3s, top 0.3s";
  button.style.left = newLeft + "px";
  button.style.top = newTop + "px";

  // Remove setTimeout that clears the transition
  // setTimeout(() => {
  //   button.style.transition = "";
  // }, 300);
}

// REMOVED: sendEnhanceRequest function - now using direct chrome.runtime.sendMessage calls to prevent duplicates
function removedSendEnhanceRequest(
  userPrompt,
  selectedStyle,
  platform,
  loadingHandler,
  innerDiv
) {
 

  if (!userPrompt || userPrompt.trim() === "") {
    // console.error("[Velocity] Cannot enhance empty prompt");

    // Only stop animations if the request is invalid
    if (innerDiv) innerDiv.classList.remove("rotating");
    if (loadingHandler) loadingHandler.clear();
    return;
  }

  // Set enhanced prompt active flag and hide suggestion box
  if (
    window.velocitySuggestions &&
    window.velocitySuggestions.setEnhancedPromptActive
  ) {
    // Set the enhanced prompt active with the original prompt length
    window.velocitySuggestions.setEnhancedPromptActive(true, userPrompt.length);
    
  }

  // Log the exact message structure being sent
  const message = {
    action: "EnhancePromptV2",
    prompt: userPrompt,
    writing_style: selectedStyle, // Use writing_style as per API requirements
    style: selectedStyle, // Keep style for backward compatibility
    platform: platform, // Make sure platform is included
    llm: "",
  };

 

  chrome.runtime.sendMessage(message, (response) => {

    if (chrome.runtime.lastError) {
      // Re-enable button on runtime error
      const currentButton =
        window.velocityWrapperState?.buttonSystem?.state?.currentButton;
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.classList.remove("processing");
      }

      // console.error("[Velocity DEBUG] Chrome runtime error:", chrome.runtime.lastError);
      // If error, reset enhanced prompt state
      if (
        window.velocitySuggestions &&
        window.velocitySuggestions.setEnhancedPromptActive
      ) {
        window.velocitySuggestions.setEnhancedPromptActive(false, 0);
      }

      // Only stop animations on error
      if (loadingHandler) {
        loadingHandler.clear();
      }
      if (innerDiv) innerDiv.classList.remove("rotating");

      // If using the button system, explicitly trigger error state
      if (
        window.velocityWrapperState &&
        window.velocityWrapperState.buttonSystem
      ) {
        const button =
          window.velocityWrapperState.buttonSystem.state.currentButton;
        if (button) {
          // Stop loading animations and go back to idle
          window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(
            button
          );
          window.velocityWrapperState.buttonSystem.animationManager.stopAnimation(
            "loading"
          );
          window.velocityWrapperState.buttonSystem.stateMachine.transition("idle", { button });

          // Show error message
          window.velocityWrapperState.buttonSystem.messageSystem.showMessage(
            "error",
            {
              text:
                "Error enhancing prompt: " +
                (chrome.runtime.lastError.message || "Unknown error"),
              type: "error",
              button: button,
              positionStrategy: "relativeToButton",
              duration: 5000,
            }
          );

          // Show the quality indicator again after error
          if (
            window.velocityQualityState &&
            window.velocityQualityState.indicator
          ) {
            window.velocityQualityState.indicator.style.display = "";
          }
        }
      }

      
      return;
    }

    if (!response || !response.success) {
      // Re-enable button on response error
      const currentButton =
        window.velocityWrapperState?.buttonSystem?.state?.currentButton;
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.classList.remove("processing");
      }


      // If error, reset enhanced prompt state
      if (
        window.velocitySuggestions &&
        window.velocitySuggestions.setEnhancedPromptActive
      ) {
        window.velocitySuggestions.setEnhancedPromptActive(false, 0);
      }

      // Only stop animations on error
      if (loadingHandler) {
        loadingHandler.clear();
      }
      if (innerDiv) innerDiv.classList.remove("rotating");

      // If using the button system, explicitly trigger error state
      if (
        window.velocityWrapperState &&
        window.velocityWrapperState.buttonSystem
      ) {
        const button =
          window.velocityWrapperState.buttonSystem.state.currentButton;
        if (button) {
          // Stop loading animations and go back to idle
          window.velocityWrapperState.buttonSystem.cleanupLoadingAnimation(
            button
          );
          window.velocityWrapperState.buttonSystem.animationManager.stopAnimation(
            "loading"
          );
          window.velocityWrapperState.buttonSystem.stateMachine.transition("idle", { button });
          // Show error message to user
          window.velocityWrapperState.buttonSystem.messageSystem.showMessage(
            "error",
            {
              text:
                "Error enhancing prompt: " +
                (response?.error || "Unknown error"),
              type: "error",
              button: button,
              positionStrategy: "relativeToButton",
              duration: 5000,
            }
          );

          // Show the quality indicator again after error
          if (
            window.velocityQualityState &&
            window.velocityQualityState.indicator
          ) {
            window.velocityQualityState.indicator.style.display = "";
          }
        }
      }

      return;
    }

    // Handle successful response

    // Re-enable button on successful completion
    const currentButton =
      window.velocityWrapperState?.buttonSystem?.state?.currentButton;
    if (currentButton) {
      currentButton.disabled = false;
      currentButton.classList.remove("processing");
    }

    try {

      const enhancedPrompt =
        response.data.data.enhanced_prompt || response.data.data;
      

      // Update input with enhanced prompt
      const inputBox = window.velocityWrapperState.inputBox;
      if (inputBox) {
        if (inputBox.tagName === "TEXTAREA") {
          inputBox.value = enhancedPrompt;
          inputBox.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (inputBox.hasAttribute("contenteditable")) {
          inputBox.innerText = enhancedPrompt;
          inputBox.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } else {
        
      }

      // Make sure highlight styles are injected
      injectEnhancedHighlightStyles();

      // Only now stop the loading animation and trigger success state
      if (window.velocityWrapperState.buttonSystem) {
        window.velocityWrapperState.buttonSystem.handleSuccessState(
          window.velocityWrapperState.buttonSystem.state.currentButton,
          false
        );
      }

      // Update the enhanced prompt length to match final result
      if (
        window.velocitySuggestions &&
        window.velocitySuggestions.setEnhancedPromptActive &&
        enhancedPrompt
      ) {
        // Keep enhanced prompt active but update length to the complete enhanced prompt
        window.velocitySuggestions.setEnhancedPromptActive(
          true,
          enhancedPrompt.length
        );
      }

      // Apply the highlight and scale effects
      if (inputBox) {
        inputBox.classList.add(
          "velocity-enhanced-highlight",
          "velocity-enhanced-scale"
        );

        // If the input is in a container, also highlight that
        const inputContainer = inputBox.closest(
          '.chat-input-container, .input-container, [role="textbox"]'
        );
        if (inputContainer && inputContainer !== inputBox) {
          inputContainer.classList.add("velocity-enhanced-highlight");
        }

        // After animation completes, remove highlight classes
        setTimeout(() => {
          inputBox.classList.remove(
            "velocity-enhanced-highlight",
            "velocity-enhanced-scale"
          );
          if (inputContainer && inputContainer !== inputBox) {
            inputContainer.classList.remove("velocity-enhanced-highlight");
          }

          // Show the quality indicator again after enhancement is complete
          if (
            window.velocityQualityState &&
            window.velocityQualityState.indicator
          ) {
            window.velocityQualityState.indicator.style.display = "";
            
          }
        }, 1000);
      }
    } catch (err) {
  
    }
  });
}

function handleInsertHereButtonClick(prompt) {
  // Get current tab's URL
  const currentURL = window.location.href;
  let matchedPlatform = null;

  // Log attempt to insert
  logToBackend('info', 'Insert Here button clicked', {
    url: currentURL
  });

  // Check if current URL matches any platform
  for (const platform in window.platforms) {
    if (window.platforms[platform].urlPattern.test(currentURL)) {
      matchedPlatform = platform;
      break;
    }
  }

  // If we're not on a supported platform, try to find input field anyway
  if (!matchedPlatform) {
    logToBackend('warning', 'No matching platform found for URL, will try generic input detection', {
      url: currentURL
    });
  }

  // Special handling for Perplexity and Mistral - wait longer for page to fully load
  const isSpecialPlatform = matchedPlatform === 'perplexity' || matchedPlatform === 'mistral';
  const maxRetries = isSpecialPlatform ? 5 : 3; // More retries for special platforms
  const baseDelay = isSpecialPlatform ? 1000 : 500; // Longer delays for special platforms

  // Try to inject the prompt with retries
  const attemptInjection = async (attempt = 1) => {
    // Log attempt
    logToBackend('info', `Attempting to inject prompt (attempt ${attempt})`, {
      platform: matchedPlatform || 'unknown',
      url: currentURL,
      isSpecialPlatform
    });

    // For Perplexity and Mistral, ensure enough time for rendering on first attempt
    if (isSpecialPlatform && attempt === 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const success = injectPromptIntoInputField(prompt);

    if (success) {
      // Update button state to success if button system exists
      if (window.velocityWrapperState.buttonSystem) {
        const button = window.velocityWrapperState.buttonSystem.state.currentButton;
        if (button) {
          window.velocityWrapperState.buttonSystem.handleSuccessState(button, false);
        }
      }
      return true;
    }

    // If failed and we have retries left, wait and try again
    if (attempt < maxRetries) {
      logToBackend('warning', `Injection failed, will retry (attempt ${attempt})`, {
        platform: matchedPlatform || 'unknown',
        url: currentURL
      });

      // Try alternative input detection methods
      if (attempt === 2) {
        const alternativeFound = tryAlternativeContainers();
        if (alternativeFound) {
          logToBackend('info', 'Found alternative input container', {
            platform: matchedPlatform || 'unknown',
            url: currentURL
          });
        }
      }

      // For Perplexity and Mistral, try to scroll to bottom to ensure input field is loaded
      if (isSpecialPlatform && attempt === 3) {
        try {
          window.scrollTo(0, document.body.scrollHeight);
          logToBackend('info', 'Scrolled to bottom to help load input field', {
            platform: matchedPlatform
          });
        } catch (e) {
          // Ignore scroll errors
        }
      }

      // Wait longer between each retry, with progressive backoff
      const delay = baseDelay * (attempt * 0.8);
      await new Promise(resolve => setTimeout(resolve, delay));
      return attemptInjection(attempt + 1);
    }

    // All retries failed
    logToBackend('error', 'All injection attempts failed', {
      platform: matchedPlatform || 'unknown',
      url: currentURL,
      attempts: attempt,
      isSpecialPlatform
    });
    
    // Show error notification to user
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: 'Injection Failed',
      message: `Couldn't insert prompt into ${matchedPlatform || 'platform'}. Try copying it manually.`,
    });
    
    return false;
  };

  // Start injection attempts
  return attemptInjection();
}

function tryAlternativeContainers() {
  const alternativeSelectors = [
    "textarea",
    'div[contenteditable="true"]',
    '[role="textbox"]',
    ".ProseMirror",
    ".ql-editor",
    'div[class*="editor"]',
    'div[class*="input"]',
    'div[class*="textarea"]',
    'div[class*="bottom"]',
    'div[class*="footer"]',
    'div[class*="absolute"]',
    'div[class*="secondary"]',
    'div[class*="composer"]',
    ".chat-input-container",
    ".message-composer",
    ".input-container",
    ".editor-container",
    "form textarea",
    'form input[type="text"]',
    "form div[contenteditable]",
  ];

  for (const selector of alternativeSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      const visibleElements = Array.from(elements).filter((el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          window.getComputedStyle(el).display !== "none" &&
          window.getComputedStyle(el).visibility !== "hidden"
        );
      });

      if (visibleElements.length > 0) {
        const bottomElements = visibleElements.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.bottom > window.innerHeight * 0.7 && rect.width > 100;
        });

        if (bottomElements.length > 0) {
          const largestBottomElement = bottomElements.reduce(
            (largest, current) => {
              const largestRect = largest.getBoundingClientRect();
              const currentRect = current.getBoundingClientRect();
              return currentRect.width * currentRect.height >
                largestRect.width * largestRect.height
                ? current
                : largest;
            },
            bottomElements[0]
          );

          return useElementForWrapper(largestBottomElement);
        }

        const largestElement = visibleElements.reduce((largest, current) => {
          const largestRect = largest.getBoundingClientRect();
          const currentRect = current.getBoundingClientRect();
          return currentRect.width * currentRect.height >
            largestRect.width * largestRect.height
            ? current
            : largest;
        }, visibleElements[0]);

        return useElementForWrapper(largestElement);
      }
    }
  }

  const possibleInputs = Array.from(
    document.querySelectorAll("div, textarea, input")
  )
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.bottom > window.innerHeight * 0.6 &&
        rect.width > 200 &&
        rect.height > 20 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    })
    .sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return bRect.bottom - aRect.bottom;
    });

  if (possibleInputs.length > 0) {
    return useElementForWrapper(possibleInputs[0]);
  }
}

function useElementForWrapper(element) {
  let container = element.parentElement;
  let bestParent = null;
  let depth = 0;
  const MAX_DEPTH = 3;

  while (container && depth < MAX_DEPTH) {
    const style = window.getComputedStyle(container);
    if (
      style.display.includes("flex") ||
      style.display.includes("grid") ||
      container.className.match(/input|editor|compose|chat/i)
    ) {
      bestParent = container;
      break;
    }
    container = container.parentElement;
    depth++;
  }

  if (bestParent) {
    const textArea = findTextAreaInContainer(bestParent, element);

    createFullWrapper({
      container: bestParent,
      inputElement: element,
      textArea: textArea,
      rect: bestParent.getBoundingClientRect(),
      textAreaRect: textArea.getBoundingClientRect(),
    });
  } else {
    createFullWrapper({
      container: element,
      inputElement: element,
      textArea: element,
      rect: element.getBoundingClientRect(),
      textAreaRect: element.getBoundingClientRect(),
    });
  }

  window.currentInputBox = element;
  return true;
}

function getPositionFromButtonAnchor(button) {
  const buttonContainer = button.closest(".velocity-button-container");
  if (!buttonContainer) {
    return { side: "right", verticalAlign: "top" };
  }

  const anchorPosition = buttonContainer.dataset.anchorPosition || "top-right";

  const side = anchorPosition.includes("left") ? "left" : "right";
  const verticalAlign = anchorPosition.includes("top") ? "top" : "bottom";

  return { side, verticalAlign };
}

// Setup event listeners
chrome.storage.local.get("enabled", ({ enabled }) => {
  // Default to true if enabled is not explicitly set to false
  if (enabled !== false) {
    (function () {
      injectButton();
      setupSimplifiedObserver();
      initializeWelcomeBox();
    })();
  }
});

function setupSimplifiedObserver() {
  const DEBOUNCE_TIME = 500;

  let lastInjectionTime = Date.now();
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const now = Date.now();
      if (now - lastInjectionTime < 2000) {
        return;
      }

      if (
        window.velocityWrapperState.wrapper &&
        document.contains(window.velocityWrapperState.wrapper)
      ) {
        return;
      }

      if (
        window.velocityWrapperState.inputBox &&
        !document.contains(window.velocityWrapperState.inputBox)
      ) {
        window.velocityWrapperState.wrapper = null;
        window.velocityWrapperState.container = null;
        window.velocityWrapperState.inputBox = null;
        window.velocityWrapperState.button = null;
        window.velocityWrapperState.anchors = {};
      }

      const currentPlatform = detectPlatform();
      if (currentPlatform !== window.velocityWrapperState.platform) {
        window.velocityWrapperState.platform = currentPlatform;
      }

      if (currentPlatform) {
        // Always initialize suggestion system on platform change
        integrateWithSuggestionSystem;

        // Only inject button if enabled is not false, regardless of auth status
        chrome.storage.local.get(["enabled"], (data) => {
          if (data.enabled !== false) {
            injectButton();
            lastInjectionTime = now;
          } else {
            // For free users, just make sure to monitor inputs
            const platformConfig = window.platforms
              ? window.platforms[currentPlatform]
              : null;
            if (platformConfig && platformConfig.textAreaSelector) {
              try {
                if (
                  window.velocitySuggestions &&
                  typeof window.velocitySuggestions.monitor === "function"
                ) {
                  window.velocitySuggestions.monitor(platformConfig);
                } else {
                  monitorInputFields(platformConfig);
                }
                const inputElement = document.querySelector(platformConfig.textAreaSelector);
                if (inputElement) {
                    clearInputField(inputElement); // Added: Clear input for free users if detected
                }
              } catch (e) {
                
              }
            }
          }
        });
      }
    }, DEBOUNCE_TIME);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  window._velocityObservers = window._velocityObservers || [];
  window._velocityObservers.push(observer);

  let lastUrl = window.location.href;

  const urlCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      window.velocityWrapperState.wrapper = null;
      window.velocityWrapperState.container = null;
      window.velocityWrapperState.inputBox = null;
      window.velocityWrapperState.button = null;
      window.velocityWrapperState.anchors = {};
      window.velocityWrapperState.platform = detectPlatform();

      // Always initialize suggestion system on URL change
      integrateWithSuggestionSystem;

      if (window.velocityWrapperState.platform) {
        chrome.storage.local.get(["enabled"], (data) => {
          if (data.enabled !== false) {
            injectButton();
            lastInjectionTime = Date.now();
          }
        });
      }
    }
  }, 1000);

  window._velocityIntervals = window._velocityIntervals || [];
  window._velocityIntervals.push(urlCheckInterval);
}

function cleanupObserversAndIntervals() {
  cleanupObservers();
  // ... rest of existing cleanup code ...
}

chrome.storage.onChanged.addListener((changes) => {
  if (
    changes.enabled ||
    changes.token ||
    changes.userName ||
    changes.userId ||
    changes.userEmail
  ) {


    if (
      window.velocitySuggestions &&
      typeof window.velocitySuggestions.prepareForAuthChange === "function"
    ) {
      window.velocitySuggestions.prepareForAuthChange();
    } else if (window.velocitySuggestionState) {

      window.velocitySuggestionState.authChanging = true;
    }

    checkAuthAndInjectButton();


    setTimeout(() => {

      if (window.velocitySuggestionState) {
        window.velocitySuggestionState.authChanging = false;
      }

      initSuggestionSystem();
    }, 1000); // Longer delay to ensure proper cleanup
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggleButton") {
    if (message.enabled) {
      injectButton();
      setupSimplifiedObserver();
    } else {
      removeButton();
      cleanupObserversAndIntervals();
    }
  }
});

// Initialize welcome box on all pages
document.addEventListener("DOMContentLoaded", function () {
  initializeWelcomeBox();
});

if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  initializeWelcomeBox();
}

function initializeExistingButtonAnimations() {
  const buttons = document.querySelectorAll(
    ".velocity-button-container button, .custom-injected-button button"
  );

  if (buttons.length > 0) {
    if (
      window.velocityAnimations &&
      typeof window.velocityAnimations.initButtonAnimations === "function"
    ) {
      buttons.forEach((button) => {
        try {
          const platform = window.velocityWrapperState.platform;
          const platformConfig = window.platforms[platform];
          window.velocityAnimations.initButtonAnimations(platformConfig);

          const innerDiv = button.querySelector("div");
          // Only initialize SVG pulse effects if the button contains an SVG element
          const hasSvg = innerDiv && innerDiv.querySelector("svg");
          if (
            hasSvg &&
            window.velocitySvgPulse &&
            typeof window.velocitySvgPulse.initSvgPulseEffect === "function"
          ) {
            window.velocitySvgPulse.initSvgPulseEffect(
              platformConfig,
              innerDiv
            );
          }
        } catch (e) {
          // console.error("[Velocity] Error initializing animations for existing button:", e);
        }
      });
    } else {
      //console.warn("[Velocity] Animation system not available for initialization");
    }
  }
}

// Run animation initialization on document load
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initializeExistingButtonAnimations, 500);
});

// Also initialize animations immediately if document is already loaded
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  setTimeout(initializeExistingButtonAnimations, 500);
}

// WebSocket-related functionality
function monitorInputFields(platformConfig) {
  if (!platformConfig || !platformConfig.textAreaSelector) {
    return;
  }

  const inputSelector = platformConfig.textAreaSelector;

  // Add this function before handleInputChange
  function hideSuggestionBox() {
    try {
      if (!window.velocityStateMessageBox) {
        // If message box doesn't exist yet, just update the quality indicator
        if (window.velocityQualityState && window.velocityQualityState.indicator) {
          updateQualityIndicator('idle', false);
        }
        return;
      }

      // Check if message box is in persistent mode
      if (window.velocityMessageBoxState && window.velocityMessageBoxState.isPersistent) {
        // console.log('[Velocity] Message box is in persistent mode, not hiding');
        return;
      }

      window.velocityStateMessageBox.hide();
    } catch (error) {
      console.warn('[Velocity] Error hiding suggestion box:', error);
      // Fallback to updating quality indicator
      if (window.velocityQualityState && window.velocityQualityState.indicator) {
        updateQualityIndicator('idle', false);
      }
    }
  }

  function handleInputChange(e) {
    // Initialize velocitySuggestionState if it doesn't exist
    if (!window.velocitySuggestionState) {
      window.velocitySuggestionState = {
        lastMonitoredElement: null,
        inputElement: null,
        lastProcessedText: '',
        debounceTimer: null
      };
    }

    // Initialize message box if it doesn't exist
    if (!window.velocityStateMessageBox) {
      initializeMessageBox();
    }

    const inputElement = e.target;
    window.velocitySuggestionState.lastMonitoredElement = inputElement;
    window.velocitySuggestionState.inputElement = inputElement;

    let text;
    if (inputElement.tagName === "TEXTAREA") {
      text = inputElement.value;
    } else if (inputElement.hasAttribute("contenteditable")) {
      text = inputElement.innerText;
    } else {
      text = inputElement.textContent;
    }

    // console.log('[Velocity WebSocket] Input text:', text);

    if (!text || text.length < 5) {
      // console.log('[Velocity WebSocket] Text too short, hiding suggestion box');
      hideSuggestionBox();
      return;
    }

    if (text === window.velocitySuggestionState.lastProcessedText) {
      // console.log('[Velocity WebSocket] Text unchanged, skipping processing');
      return;
    }
    window.velocitySuggestionState.lastProcessedText = text;

    clearTimeout(window.velocitySuggestionState.debounceTimer);
    window.velocitySuggestionState.debounceTimer = setTimeout(() => {
      // console.log('[Velocity WebSocket] Sending text for analysis:', text);
      chrome.runtime.sendMessage(
        {
          action: "sendText",
          text: text,
          platform: window.velocityWrapperState?.platform || detectPlatform(),
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Velocity WebSocket] Error sending message:', chrome.runtime.lastError);
            // If message port is closed, try to reconnect WebSocket
            if (window.velocityQualityState && window.velocityQualityState.socket) {
              // console.log('[Velocity WebSocket] Message port closed, attempting to reconnect...');
              window.velocityQualityState.socket.close();
            }
          } else {
            // console.log('[Velocity WebSocket] Message sent successfully:', response);
          }
        }
      );
    }, 500);
  }

  function setupInputObservers() {
    // Clean up existing observers first
    cleanupObservers();

    const platformConfig = detectPlatform();
    if (!platformConfig || !platformConfig.textAreaSelector) {
      return;
    }

    const inputSelector = platformConfig.textAreaSelector;

    inputObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const newInputs = document.querySelectorAll(
            inputSelector + ":not([data-velocity-monitored])"
          );
          newInputs.forEach((input) => {
            input.setAttribute("data-velocity-monitored", "true");

            if (input.tagName === "TEXTAREA") {
              input.addEventListener("input", handleInputChange);
            } else if (input.hasAttribute("contenteditable")) {
              input.addEventListener("input", handleInputChange);
            } else {
              input.addEventListener("input", handleInputChange);
            }
          });
        }
      });
    });

    inputObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Setup DOM observer for dynamic content
    domObserver = new MutationObserver(() => {
      setupInputObservers();
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupInputObservers();

  if (!window.domObserver) {
    window.domObserver = new MutationObserver((mutations) => {
      setupInputObservers();
    });

    window.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initSuggestionSystem();
});

if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  initSuggestionSystem();
}

// Function to check WebSocket status and log it
function checkWebSocketStatus() {
  chrome.runtime.sendMessage({ action: "ping" }, (response) => {
    if (chrome.runtime.lastError) {
    } else if (response) {
      
    }
  });
}

// Check WebSocket status periodically
setInterval(checkWebSocketStatus, 30000); // Check every 30 seconds
checkWebSocketStatus(); // Check immediately

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "ping" && sendResponse) {
   
    sendResponse({ success: true, contentReady: true });
    return true;
  }

  if (message.action === "showFreeTrialPopup") {
    
    if (window.showTrailFinishedNotification) {
      window.showTrailFinishedNotification();
    } else {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("trail-finished.js");
      script.onload = function () {
        if (window.showTrailFinishedNotification) {
          window.showTrailFinishedNotification();
          disableAllAnimations();
        } else {
          
        }
      };
      document.head.appendChild(script);
    }
    if (sendResponse) sendResponse({ success: true });
    return true;
  }

  if (
    message.action &&
    (message.action.includes("websocket") ||
      message.action === "displaySuggestions" ||
      message.action === "extensionStateChanged")
  ) {
   
  }

  return false;
});

if (
  [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "gamma.app",
    "v0.dev",
    "bolt.new",
    "grok.com",
    "lovable.dev",
    "replit.com",

  ].includes(window.location.hostname)
) {


  window.velocityLLMReady = true;
  window.velocityChatGPTReady = window.location.hostname === "chatgpt.com"; 



  chrome.storage.local.get(
    ["storedResponse", "suggestedLLM"],
    function (result) {
      if (result.storedResponse && result.storedResponse !== "none") {
      } else {
      }
    }
  );

  try {
    chrome.runtime.sendMessage({
      action: "chatgptContentScriptReady",
      url: window.location.href,
    });
  } catch (e) {
   
  }
}


const qualityIndicatorStyles = document.createElement("link");
qualityIndicatorStyles.rel = "stylesheet";
qualityIndicatorStyles.href = chrome.runtime.getURL("quality-indicator.css");
document.head.appendChild(qualityIndicatorStyles);


window.testMessageBox = function () {
  
  return;


};


window.testMessageBoxCleanup = function () {
 
  return;

  
};

// Debug helper to check message system status
window.debugMessageSystem = function () {


  if (window.velocityWrapperState.buttonSystem?.messageSystem) {
    
  }
};

// Function to inject enhanced highlight animation styles
function injectEnhancedHighlightStyles() {
  if (document.getElementById("velocity-highlight-styles")) return;

  const styleEl = document.createElement("style");
  styleEl.id = "velocity-highlight-styles";
  styleEl.innerHTML = `
    @keyframes velocity-enhanced-highlight {
      0% { background-color: rgba(0, 136, 255, 0); box-shadow: 0 0 0 rgba(0, 136, 255, 0); }
      30% { background-color: rgba(0, 136, 255, 0.2); box-shadow: 0 0 10px rgba(0, 136, 255, 0.5); }
      70% { background-color: rgba(0, 136, 255, 0.2); box-shadow: 0 0 10px rgba(0, 136, 255, 0.5); }
      100% { background-color: rgba(0, 136, 255, 0); box-shadow: 0 0 0 rgba(0, 136, 255, 0); }
    }

    @keyframes velocity-enhanced-scale {
      0% { transform: scale(1); }
      30% { transform: scale(1.03); }
      70% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }

    .velocity-enhanced-highlight {
      animation: velocity-enhanced-highlight 1s ease-in-out forwards;
      border-color: #0088cb !important;
      transition: all 0.3s ease;
    }

    .velocity-enhanced-scale {
      animation: velocity-enhanced-scale 1s ease-in-out forwards;
    }

    .text-pop-effect {
      animation: text-pop 0.3s ease-in-out;
    }

    @keyframes text-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
  `;

  document.head.appendChild(styleEl);
}

// Add this near the top of the file
let inputObserver = null;
let domObserver = null;

// Add cleanup function
function cleanupObservers() {
  if (inputObserver) {
    inputObserver.disconnect();
    inputObserver = null;
  }
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
}

// Add beforeunload listener
window.addEventListener('beforeunload', cleanupObservers);

// Add streaming cursor styles
const style = document.createElement('style');
style.textContent = `
  .streaming-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background-color: #4facfe;
    margin-left: 2px;
    animation: blink 1s infinite;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Add this new function
function clearInputField(inputField) {
  if (!inputField) {
    return;
  }

  if (inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT") {
    inputField.value = "";
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    inputField.dispatchEvent(new Event("change", { bubbles: true })); // Add change event for more compatibility
  } else if (inputField.hasAttribute("contenteditable")) {
    inputField.innerHTML = ""; // Use innerHTML for rich text contenteditable
    inputField.textContent = ""; // Also clear textContent for good measure
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    inputField.dispatchEvent(new Event("change", { bubbles: true })); // Add change event
    // For contenteditable, sometimes a keydown/keyup can help trigger framework updates
    inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', bubbles: true }));
    inputField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Delete', code: 'Delete', bubbles: true }));
  } else {
    // Fallback for other elements that might be treated as input
    inputField.textContent = "";
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    inputField.dispatchEvent(new Event("change", { bubbles: true }));
  }
  // Remove focus after clearing to prevent some platforms from restoring text
  inputField.blur();
}

let streamingStarted = false;
let streamingInputBox = null;
let lastStreamedPrompt = '';

function getPlatformInputBox() {
  let inputBox = null;
  let platform = null;
  if (window.velocityWrapperState && window.velocityWrapperState.platform) {
    platform = window.velocityWrapperState.platform;
  } else if (window.velocityQualityState && window.velocityQualityState.platform) {
    platform = window.velocityQualityState.platform;
  }
  if (platform && window.platforms && window.platforms[platform]) {
    const selector = window.platforms[platform].textAreaSelector;
    if (selector) {
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null && !el.disabled) {
          inputBox = el;
          break;
        }
      }
    }
  }
  return inputBox;
}

// Streaming handled by unified StreamingState system

(function addTrafficMessageBoxStyles() {
  if (document.getElementById('velocity-traffic-message-box-styles')) return;
  const style = document.createElement('style');
  style.id = 'velocity-traffic-message-box-styles';
  style.textContent = `
    .velocity-state-message-box.velocity-traffic-message-box {
      min-width: 260px;
      max-width: 340px;
      background: #fff;
      color: #222;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.13);
      font-size: 16px;
      font-weight: 500;
      padding: 2px 6px;
      display: flex;
      flex-direction: column;
      z-index: 10001;
      transition: opacity 0.2s;
    }
    .velocity-state-message-box.velocity-traffic-message-box .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .velocity-state-message-box.velocity-traffic-message-box .state-indicator {
      background: #fbbf24;
      color: #fff;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: inline-block;
      text-align: center;
      line-height: 24px;
      font-size: 18px;
      font-weight: bold;
    }
    .velocity-state-message-box.velocity-traffic-message-box .state-title {
      font-size: 18px;
      font-weight: 700;
      color: #fbbf24;
    }
    .velocity-state-message-box.velocity-traffic-message-box .close-button {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #888;
    }
    .velocity-state-message-box.velocity-traffic-message-box .message-content {
      color: #222 !important;
      font-size: 15px;
      font-weight: 400;
      margin-top: 2px;
    }
    body.dark-mode .velocity-state-message-box.velocity-traffic-message-box .message-content {
      color: #f3f3f3 !important;
    }
    body.dark-mode .velocity-state-message-box.velocity-traffic-message-box {
      background: #23272f;
      color: #f3f3f3;
      box-shadow: 0 4px 24px rgba(0,0,0,0.33);
    }
    body.dark-mode .velocity-state-message-box.velocity-traffic-message-box .close-button {
      color: #aaa;
    }
    body.dark-mode .velocity-state-message-box.velocity-traffic-message-box .state-title {
      color: #fbbf24;
    }
    /* Ensure text and icon are visible in light mode */
    .velocity-state-message-box.velocity-traffic-message-box .state-indicator {
      background: #fbbf24 !important;
      color: #fff !important;
    }
    .velocity-state-message-box.velocity-traffic-message-box .state-title {
      color: #fbbf24 !important;
    }
    .velocity-state-message-box.velocity-traffic-message-box .close-button {
      color: #888 !important;
    }
  `;
  document.head.appendChild(style);
})();


// Streaming logic handled by unified StreamingState system above

// Streaming message handling moved to unified listener above

function handleEnhanceChunk(message, sendResponse) {
  // Hide any existing traffic message box
  const trafficBox = document.querySelector('.velocity-state-message-box.velocity-traffic-message-box');
  if (trafficBox?.parentNode) {
    trafficBox.parentNode.removeChild(trafficBox);
  }
  window.velocityEnhanceBlocked = false;

  // Start streaming if not already started
  if (!StreamingState.isStreaming) {
    initializeStreaming();
  }

  // Try to inject the chunk
  injectStreamingChunk(message.chunk, sendResponse);
}

function initializeStreaming() {
  StreamingState.isStreaming = true;
  StreamingState.buffer = '';
  StreamingState.retries = 0;
  
  // Find and cache input box
  StreamingState.inputBox = window.velocityWrapperState?.inputBox || 
                           document.querySelector('textarea:focus, [contenteditable="true"]:focus') ||
                           document.querySelector('textarea, [contenteditable="true"]');

  // Clear input and start cursor animation
  if (StreamingState.inputBox) {
    clearInputContent(StreamingState.inputBox);
    startStreamingCursor();
  }
}

function injectStreamingChunk(chunk, sendResponse) {
  if (!StreamingState.inputBox) {
    if (StreamingState.retries < StreamingState.maxRetries) {
      StreamingState.retries++;
      setTimeout(() => injectStreamingChunk(chunk, sendResponse), 50);
      return;
    }
    console.error('[Velocity] Error: Could not find input box to inject enhanced content.');
    sendResponse({ success: false });
    return;
  }

  // Append chunk to buffer and update UI
  StreamingState.buffer += chunk;
  updateInputContent(StreamingState.inputBox, StreamingState.buffer);
  sendResponse({ success: true });
}

function handleEnhanceComplete(message, sendResponse) {
  if (!StreamingState.inputBox) return;

  // Stop streaming and cursor animation
  stopStreaming();
  
  // Apply completion animation
  applyCompletionAnimation(StreamingState.inputBox);

  // Save prompt review if needed
  if (window.velocityWebSocketResponse) {
    const intentData = window.velocityWebSocketResponse?.main_intent || {};
    savePromptReview(message, intentData, StreamingState.inputBox);
  }

  sendResponse({ success: true });
}

function handleEnhanceError(message, sendResponse) {
  stopStreaming();
  showEnhanceError(message.error);
  sendResponse({ success: true });
}

function startStreamingCursor() {
  if (StreamingState.cursorInterval) return;
  
  const cursor = document.createElement('span');
  cursor.className = 'streaming-cursor';
  StreamingState.inputBox.parentNode.appendChild(cursor);
  
  StreamingState.cursorInterval = setInterval(() => {
    cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
  }, 500);
}

function stopStreaming() {
  StreamingState.isStreaming = false;
  if (StreamingState.cursorInterval) {
    clearInterval(StreamingState.cursorInterval);
    StreamingState.cursorInterval = null;
    
    // Remove cursor element
    const cursor = document.querySelector('.streaming-cursor');
    if (cursor?.parentNode) {
      cursor.parentNode.removeChild(cursor);
    }
  }
}

function clearInputContent(inputBox) {
  if (inputBox.tagName === 'TEXTAREA') {
    inputBox.value = '';
  } else {
    inputBox.textContent = '';
  }
  inputBox.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateInputContent(inputBox, content) {
  if (inputBox.tagName === 'TEXTAREA') {
    inputBox.value = content;
  } else {
    inputBox.textContent = content;
  }
  inputBox.dispatchEvent(new Event('input', { bubbles: true }));
  inputBox.scrollTop = inputBox.scrollHeight;
}

function applyCompletionAnimation(inputBox) {
  const highlightStyle = document.createElement('style');
  highlightStyle.textContent = `
    @keyframes enhanceHighlight {
      0% { background-color: transparent; transform: scale(1); }
      50% { background-color: rgba(0, 136, 255, 0.1); transform: scale(1.02); }
      100% { background-color: transparent; transform: scale(1); }
    }
    .enhance-highlight {
      animation: enhanceHighlight 1s ease-in-out;
    }
  `;
  document.head.appendChild(highlightStyle);

  inputBox.classList.add('enhance-highlight');
  setTimeout(() => {
    inputBox.classList.remove('enhance-highlight');
    highlightStyle.remove();
  }, 1000);
}

function showEnhanceError(error) {
  // Log UI error display
  logToBackend('error', 'Failed to display enhanced prompt in content script', {
    error: error?.error || error,
    inputBoxExists: !!StreamingState.inputBox
  });
  
  if (!StreamingState.inputBox) return;
  
  const errorSpan = document.createElement('span');
  errorSpan.style.cssText = `
    color: red;
    display: block;
    margin-top: 8px;
    font-size: 14px;
  `;
  errorSpan.textContent = `Error: ${error?.error || error}`;
  StreamingState.inputBox.parentNode.appendChild(errorSpan);
  
  setTimeout(() => {
    if (errorSpan.parentNode) {
      errorSpan.parentNode.removeChild(errorSpan);
    }
  }, 5000);
}

function savePromptReview(message, intentData, inputBox) {
  chrome.runtime.sendMessage({
    type: 'savePromptReview',
    data: {
      originalPrompt: message.originalPrompt,
      enhancedPrompt: inputBox.value || inputBox.textContent,
      metrics: message.metrics,
      intent: intentData.category,
      intent_description: intentData.description
    }
  });
}

// Add function to check for pending prompt insertion on page load
function checkForPendingPromptInsertion() {
  chrome.storage.local.get(['pendingPlatformInsertion'], async (result) => {
    if (result.pendingPlatformInsertion) {
      const { prompt, platformName, platformKey, timestamp } = result.pendingPlatformInsertion;
      
      // Check if the pending insertion is recent (within last 60 seconds)
      const now = Date.now();
      const insertionTime = new Date(timestamp).getTime();
      const isRecent = (now - insertionTime) < 60000; // 60 seconds
      
      if (prompt && isRecent) {
        // Log the auto-injection attempt
        logToBackend('info', 'Auto-injecting prompt after page load', {
          platform: platformName,
          platform_key: platformKey,
          prompt_length: prompt.length
        });
        
        // Wait for the page to fully load and input fields to be available
        setTimeout(() => {
          // Try to inject the prompt with retries
          const attemptAutoInjection = async (attempt = 1) => {
            const success = injectPromptIntoInputField(prompt);
            
            if (success) {
              // Notify that insertion was successful
              chrome.runtime.sendMessage({
                action: 'promptInsertedInPlatform',
                platformName,
                platformKey,
                promptLength: prompt.length
              });
              
              // Clear the pending insertion
              chrome.storage.local.remove(['pendingPlatformInsertion']);
              
              // Apply highlight effect to show success
              const inputBox = window.velocityWrapperState?.inputBox;
              if (inputBox) {
                inputBox.classList.add("velocity-enhanced-highlight", "velocity-enhanced-scale");
                setTimeout(() => {
                  inputBox.classList.remove("velocity-enhanced-highlight", "velocity-enhanced-scale");
                }, 1000);
              }
              
              return true;
            }
            
            // If failed and we have retries left, try again
            if (attempt < 5) { // Try up to 5 times
              const delay = 1000 * attempt; // Progressive delay
              await new Promise(resolve => setTimeout(resolve, delay));
              return attemptAutoInjection(attempt + 1);
            }
            
            // All attempts failed
            chrome.runtime.sendMessage({
              action: 'promptInsertionFailed',
              platformName,
              platformKey,
              promptLength: prompt.length,
              error: 'Failed to find input field after multiple attempts'
            });
            
            return false;
          };
          
          attemptAutoInjection();
        }, 2000); // Give page 2 seconds to initialize
      }
    }
  });
}


