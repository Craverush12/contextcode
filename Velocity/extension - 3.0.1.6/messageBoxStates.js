// Simple CSS injection
(function injectCSS() {
  if (!document.querySelector('link[href*="messageBoxStates.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('messageBoxStates.css');
    document.head.appendChild(link);
  }
})();

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
    
    // Send log through background script to avoid CORS
    chrome.runtime.sendMessage({
      action: "logToBackend",
      logType,
      userId,
      message,
      metadata: Object.assign({
        platform: 'messageBoxStates.js',
        timestamp: new Date().toISOString()
      }, metadata || {})
    });
  } catch (error) {
    console.error('[Velocity Log] Error logging to backend:', error);
  }
}

// Configuration for message box behavior
const MESSAGE_BOX_CONFIG = {
  hideDelay: 800, // Delay in milliseconds before hiding message box after mouse leave
  transitionDelay: 300, // Delay for opacity transition
  bottomGap: 150, // Minimum gap in pixels from bottom of webpage
  margin: 10 // General margin from viewport edges
};

// Global state for message boxes
window.velocityMessageBoxState = {
  currentBox: null,
  isVisible: false,
  currentState: 'idle',
  isHovering: false,
  isPersistent: false, // Flag for persistent behavior in bad state
  activeSection: null, // Track which section is currently open ('questions' or 'analysis')
  suggestions: [], // Store current suggestions
  allSuggestions: [], // Store all available suggestions
  currentSuggestionSet: 0, // Track which set of suggestions is currently displayed
  hasFetchedSuggestions: false, // Flag to track if suggestions were already fetched
  messageContent: {
    idle: {
      title: 'Suggestions',
      content: `
        <div class="suggestion-boxes">
          <div class="suggestion-box loading">
            <div class="loading-indicator">
              <div class="loading-bar-container">
                <div class="loading-bar"></div>
                <div class="loading-bar"></div>
              </div>
            </div>
          </div>
          <div class="suggestion-box loading">
            <div class="loading-indicator">
              <div class="loading-bar-container">
                <div class="loading-bar"></div>
                <div class="loading-bar"></div>
              </div>
            </div>
          </div>
          <div class="suggestion-box loading">
            <div class="loading-indicator">
              <div class="loading-bar-container">
                <div class="loading-bar"></div>
                <div class="loading-bar"></div>
              </div>
            </div>
          </div>
          <div class="action-button-container">
            <button class="action-button remix-button">Remix</button>
            <button class="action-button help-button">Help</button>
          </div>
        </div>
      `
    },
    analyzing: {
      title: 'Analyzing your text',
      content: `
        <div class="loading-indicator">
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
        </div>
      `
    },
    bad: {
      title: 'Needs Improvement',
      content: `
        <div class="suggestion-content">
          <div class="metrics-indicator-container">
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="clarity">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EF4444" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="67.9" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">4</span>
                </div>
                <span class="metric-label">Clarity</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="specificity">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EF4444" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="79.2" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">3</span>
                </div>
                <span class="metric-label">Specificity</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="intent">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="45.2" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">6</span>
                </div>
                <span class="metric-label">Intent</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="depth">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EF4444" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="90.5" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">2</span>
                </div>
                <span class="metric-label">Depth</span>
              </div>
            </div>
          </div>
          <div class="suggestion-footer">
            <button class="need-help-button">Need help</button>
            <button class="suggestion-button">Suggestions</button>
          </div>
        </div>

        <!-- Expandable Questions Section -->
        <div class="expandable-section questions-section" style="display: none;">
          <div class="questions-input-sections">
            <div class="question-input-field">
              <div class="question-label">Question 1</div>
              <input type="text" style="border: 1px solid #000000;" class="question-input" placeholder="Your answer here." />
            </div>
            <div class="question-input-field">
              <div class="question-label">Question 2</div>
              <input type="text" style="border: 1px solid #000000;" class="question-input" placeholder="Your answer here." />
            </div>
            <div class="button-container">
              <button class="refine-prompt-button">
                <img src="${chrome.runtime.getURL('assets/refineprompt.png')}" alt="Refine icon" width="18" height="18" style="margin-right: 8px;" />
                Refine Prompt
              </button>
            </div>
          </div>
        </div>

        <!-- Expandable Analysis Section -->
        <div class="expandable-section analysis-section" style="display: none;">
          <div class="analysis-metrics-section">
            <div class="combined-container">
              <div class="recommendations-container">
                <div class="metric-header">
                  <div class="metric-icon">
                    <img id="metric-icon-img" src="${chrome.runtime.getURL('assets/clarity.png')}" width="12" height="12" alt="Metric icon" />
                  </div>
                  <div class="recommendations-title">Recommendations</div>
                </div>
                <div class="recommendations-content">
                  Your prompt lacks detailed background or context. To improve, try adding more detailed background or context. To improve, try adding more detailed background or context.
                </div>
                <div class="button-container">
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    ok: {
      title: 'Getting There',
      content: `
        <div class="suggestion-content">
          <div class="metrics-indicator-container">
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="clarity">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#22C55E" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="22.6" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">8</span>
                </div>
                <span class="metric-label">Clarity</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="specificity">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="45.2" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">6</span>
                </div>
                <span class="metric-label">Specificity</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="intent">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="33.9" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">7</span>
                </div>
                <span class="metric-label">Intent</span>
              </div>
            </div>
            <div class="metric-indicator-wrapper">
              <div class="metric-indicator" data-metric="depth">
                <div class="metric-circle-container">
                  <svg viewBox="0 0 44 44" class="metric-svg">
                    <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                    <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="56.6" transform="rotate(-90, 22, 22)" />
                  </svg>
                  <span class="metric-value">5</span>
                </div>
                <span class="metric-label">Depth</span>
              </div>
            </div>
          </div>
          <div class="suggestion-footer">
            <button class="need-help-button">Need help</button>
            <button class="suggestion-button">Suggestions</button>
          </div>
        </div>

        <!-- Expandable Questions Section -->
        <div class="expandable-section questions-section" style="display: none;">
          <div class="questions-input-sections">
            <div class="question-input-field">
              <div class="question-label">Question 1</div>
              <input type="text" class="question-input" placeholder="Your answer here." />
            </div>
            <div class="question-input-field">
              <div class="question-label">Question 2</div>
              <input type="text" class="question-input" placeholder="Your answer here." />
            </div>
            <div class="button-container">
              <button class="refine-prompt-button">
                <img src="${chrome.runtime.getURL('assets/refineprompt.png')}" alt="Refine icon" width="18" height="18" style="margin-right: 8px;" />
                Refine Prompt
              </button>
            </div>
          </div>
        </div>

        <!-- Expandable Analysis Section -->
        <div class="expandable-section analysis-section" style="display: none;">
          <div class="analysis-metrics-section">
            <div class="combined-container">
              <div class="metrics-indicator-container">
                <div class="metric-indicator-wrapper">
                  <div class="metric-indicator" data-metric="clarity">
                    <div class="metric-circle-container">
                      <svg viewBox="0 0 44 44" class="metric-svg">
                        <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                        <circle cx="22" cy="22" r="18" stroke="#22C55E" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="22.6" transform="rotate(-90, 22, 22)" />
                      </svg>
                      <span class="metric-value">8</span>
                    </div>
                    <span class="metric-label">Clarity</span>
                  </div>
                </div>
                <div class="metric-indicator-wrapper">
                  <div class="metric-indicator" data-metric="specificity">
                    <div class="metric-circle-container">
                      <svg viewBox="0 0 44 44" class="metric-svg">
                        <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                        <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="45.2" transform="rotate(-90, 22, 22)" />
                      </svg>
                      <span class="metric-value">6</span>
                    </div>
                    <span class="metric-label">Specificity</span>
                  </div>
                </div>
                <div class="metric-indicator-wrapper">
                  <div class="metric-indicator" data-metric="intent">
                    <div class="metric-circle-container">
                      <svg viewBox="0 0 44 44" class="metric-svg">
                        <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                        <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="33.9" transform="rotate(-90, 22, 22)" />
                      </svg>
                      <span class="metric-value">7</span>
                    </div>
                    <span class="metric-label">Intent</span>
                  </div>
                </div>
                <div class="metric-indicator-wrapper">
                  <div class="metric-indicator" data-metric="depth">
                    <div class="metric-circle-container">
                      <svg viewBox="0 0 44 44" class="metric-svg">
                        <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                        <circle cx="22" cy="22" r="18" stroke="#EAB308" stroke-width="4" fill="none" stroke-dasharray="113.1" stroke-dashoffset="56.6" transform="rotate(-90, 22, 22)" />
                      </svg>
                      <span class="metric-value">5</span>
                    </div>
                    <span class="metric-label">Depth</span>
                  </div>
                </div>
              </div>
              <div class="recommendations-container">
                <div class="metric-header">
                  <div class="metric-icon">
                    <img id="metric-icon-img" src="${chrome.runtime.getURL('assets/clarity.png')}" width="12" height="12" alt="Metric icon" />
                  </div>
                  <div class="recommendations-title">Clarity</div>
                </div>
                <div class="recommendations-content">
                  Your prompt lacks detailed background or context. To improve, try adding more detailed background or context. To improve, try adding more detailed background or context.
                </div>
                <div class="button-container">
                  <button class="refine-prompt-button">
                    <img src="${chrome.runtime.getURL('assets/refineprompt.png')}" alt="Refine icon" width="18" height="18" style="margin-right: 8px;" />
                    Refine Prompt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    good: {
      title: 'Well-Written',
      content: `
        <div class="suggestion-content">
          <p>Your prompt is well structured and clear. AI should understand your request well.</p>
          <div class="feedback-buttons-container">
            <button class="feedback-button like-button" data-feedback="like">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0-2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              Like
            </button>
            <button class="feedback-button dislike-button" data-feedback="dislike">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
              </svg>
              Dislike
            </button>
          </div>
          <div class="prompt-history-link">
            You can check your prompt history <a href="#" class="profile-link" data-action="open-profile">here</a>
          </div>
        </div>
      `
    }
  }
};

/**
 * Create a message box for displaying state-specific content
 * @returns {HTMLElement} The message box element
 */
function createStateMessageBox() {
  // First remove any existing message boxes to prevent duplicates
  const existingMessageBoxes = document.querySelectorAll('.velocity-state-message-box');
  
  // Log if multiple message boxes are found
  if (existingMessageBoxes.length > 1) {
    logToBackend('warning', 'Multiple message boxes detected', {
      count: existingMessageBoxes.length,
      states: Array.from(existingMessageBoxes).map(box => box.getAttribute('data-state')).join(', ')
    });
    
    // Remove all existing message boxes
    existingMessageBoxes.forEach(box => {
      if (box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });
  }
  
  // Check again for any remaining message box
  let messageBox = document.querySelector('.velocity-state-message-box');
  
  if (messageBox) {
    // Ensure proper cleanup of any stale event listeners
    const newMessageBox = messageBox.cloneNode(true);
    messageBox.parentNode.replaceChild(newMessageBox, messageBox);
    messageBox = newMessageBox;
    return messageBox;
  }

  // Create the message box
  messageBox = document.createElement('div');
  messageBox.className = 'velocity-state-message-box';
  messageBox.setAttribute('data-state', 'idle');

  // Add safety check for DOM manipulation
  try {
    // Create the message box structure
    messageBox.innerHTML = `
      <div class="message-header">
        <div class="state-indicator"></div>
        <div class="state-title">Start typing</div>
        <button class="close-button" style="position: absolute; right: 10px; top: 10px; background:rgb(255, 255, 255); color: black; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; z-index: 1000000;">×</button>
      </div>
      <div class="message-content">
        <div class="suggestion-box">Your suggestions and analysis will appear here.</div>
      </div>
    `;

    // Add event listener for close button with safety check
    // Removed direct listener on closeButton and added a delegated one to messageBox
    messageBox.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-button')) {
        // console.log('[Velocity MessageBox] CLOSE BUTTON CLICK DETECTED!', e.target); // More prominent debugging message
        e.stopPropagation();
        // Reset persistent state when explicitly closing
        window.velocityMessageBoxState.isPersistent = false;
        window.velocityMessageBoxState.activeSection = null;
        hideStateMessageBox();
      }
    });
  } catch (error) {
    console.error('[Velocity MessageBox] Error creating message box structure:', error);
    return null;
  }

  // Add hover event listeners for suggestion text ellipsis expansion
  messageBox.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('suggestion-text') || e.target.closest('.suggestion-text')) {
      const suggestionText = e.target.classList.contains('suggestion-text') ?
                            e.target : e.target.closest('.suggestion-text');
      suggestionText.classList.add('expanded');
    }
  });

  messageBox.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('suggestion-text') || e.target.closest('.suggestion-text')) {
      const suggestionText = e.target.classList.contains('suggestion-text') ?
                            e.target : e.target.closest('.suggestion-text');
      suggestionText.classList.remove('expanded');
    }
  });

  // Add event listeners for suggestion buttons
  messageBox.addEventListener('click', (e) => {
    // Handle remix button click
    if (e.target.classList.contains('remix-button')) {
      e.stopPropagation();
      
      // Show loading state
      const contentElement = messageBox.querySelector('.message-content');
      if (contentElement) {
        contentElement.innerHTML = `
          <div class="suggestion-boxes">
            <div class="suggestion-box loading">
              <div class="loading-indicator">
                <div class="loading-bar-container">
                  <div class="loading-bar"></div>
                  <div class="loading-bar"></div>
                </div>
              </div>
            </div>
            <div class="suggestion-box loading">
              <div class="loading-indicator">
                <div class="loading-bar-container">
                  <div class="loading-bar"></div>
                  <div class="loading-bar"></div>
                </div>
              </div>
            </div>
            <div class="suggestion-box loading">
              <div class="loading-indicator">
                <div class="loading-bar-container">
                  <div class="loading-bar"></div>
                  <div class="loading-bar"></div>
                </div>
              </div>
            </div>
            <div class="action-button-container">
              <button class="action-button remix-button">Remix</button>
              <button class="action-button help-button">Help</button>
            </div>
          </div>
        `;
      }
      
      // Fetch new suggestions
      (async () => {
        try {
          // Get user data from chrome.storage
          const userData = await new Promise((resolve) => {
            chrome.storage.local.get(["userId", "token", "apiAuthKey"], (result) => {
              resolve({
                userId: result.userId || "anonymous",
                apiAuthKey: result.apiAuthKey || "a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf"
              });
            });
          });
          
          // Call the API to get suggestions
          const apiUrl = `https://thinkvelocity.in/dev/test/remix-suggestion/${userData.userId}`;
          
          // Send message to background script to make the API call
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "fetchSuggestions",
              url: apiUrl,
              token: userData.apiAuthKey
            }, resolve);
          });

          if (!response || !response.success) {
            throw new Error(`API Error: ${response?.status} ${response?.statusText}`);
          }

          // Parse the response data
          const data = JSON.parse(response.data);
          
          if (!data || !data.suggested_questions || !Array.isArray(data.suggested_questions)) {
            throw new Error('Invalid API response format');
          }

          // Convert API suggestions to our format
          const suggestions = data.suggested_questions.map((text, index) => ({
            text: text,
            confidence: 0.9 - (index * 0.05),
            type: 'api',
            category: 'api',
            source: 'api'
          }));

          // Update the suggestions in the state
          window.velocityMessageBoxState.allSuggestions = suggestions;
          window.velocityMessageBoxState.suggestions = suggestions.slice(0, 3);
          window.velocityMessageBoxState.currentSuggestionSet = 0;
          
          // Update the UI
          updateStateMessageBox('idle');
        } catch (error) {
          console.error('[Velocity MessageBox] Error fetching new suggestions:', error);
          // Show error state in UI
          if (contentElement) {
            contentElement.innerHTML = `
              <div class="suggestion-boxes">
                <div class="suggestion-box error">
                  <div class="suggestion-text">Failed to fetch suggestions. Please try again.</div>
                </div>
                <div class="suggestion-box error">
                  <div class="suggestion-text">Unable to load suggestions.</div>
                </div>
                <div class="suggestion-box error">
                  <div class="suggestion-text">Click Retry to try again.</div>
                </div>
                <div class="action-button-container">
                  <button class="action-button remix-button">Retry</button>
                  <button class="action-button help-button">Help</button>
                </div>
              </div>
            `;
          }
        }
      })();
      return;
    }

    // Handle help button click
    if (e.target.classList.contains('help-button')) {
      e.stopPropagation();
      showHelpModal();
      return;
    }

    // Handle clicks on the entire suggestion box
    if (e.target.classList.contains('suggestion-box') || e.target.closest('.suggestion-box')) {
      e.stopPropagation(); // Prevent event bubbling
      
      try {
        // Get the suggestion box element
        const suggestionBox = e.target.classList.contains('suggestion-box') ? 
                            e.target : e.target.closest('.suggestion-box');
        
        // Get the suggestion data
        const suggestionData = JSON.parse(decodeURIComponent(suggestionBox.dataset.suggestion));
        
        // Track suggestion usage
        window.dispatchEvent(new CustomEvent('velocitySuggestionUsed', {
          detail: {
            suggestion: suggestionData,
            source: 'message-box-click'
          }
        }));
        
        // Insert suggestion into input field
        insertSuggestionIntoInput(suggestionData.text);
        
        // Track with Mixpanel
        chrome.runtime.sendMessage({
          action: "trackMixpanelEvent",
          eventName: "Suggestion Used",
          properties: {
            platform: window.velocityWrapperState?.platform || 'unknown',
            suggestion_text: suggestionData.text.substring(0, 100),
            suggestion_type: suggestionData.type || 'unknown',
            suggestion_category: suggestionData.category || 'unknown',
            suggestion_source: suggestionData.source || 'unknown',
            interaction_source: 'message-box-click',
            url: window.location.href
          }
        });
        
        // Hide the message box after using suggestion
        hideStateMessageBox();
      } catch (error) {
        console.error('[Velocity MessageBox] Error handling suggestion box click:', error);
      }
    }
    
    // Handle the existing Analysis suggestion button click logic
    if (e.target.classList.contains('suggestion-button')) {
      // Handle suggestion button click - get recommendation from API
      e.stopPropagation(); // Prevent event bubbling

    

      const questionsSection = messageBox.querySelector('.questions-section');
      const analysisSection = messageBox.querySelector('.analysis-section');
      // Track Suggestion button click with Mixpanel
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Suggestion Button Clicked",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          quality_state: window.velocityMessageBoxState.currentState || 'unknown',
          url: window.location.href
        }
      });
      
      if (analysisSection) {
        // Check if analysis section is already open (toggle behavior)
        const isAnalysisOpen = analysisSection.style.display === 'block';

        if (isAnalysisOpen && window.velocityMessageBoxState.activeSection === 'analysis') {
          // Close analysis section if it's already open
          analysisSection.style.display = 'none';
          window.velocityMessageBoxState.activeSection = null;
          window.velocityMessageBoxState.isPersistent = false;
          // console.log('[Velocity MessageBox] Analysis section closed (toggle)');
          return;
        }

        // Hide questions section if it's open
        if (questionsSection) {
          questionsSection.style.display = 'none';
        }

        // Set persistent behavior for bad state interactions
        if (window.velocityMessageBoxState.currentState === 'bad') {
          window.velocityMessageBoxState.isPersistent = true;
          window.velocityMessageBoxState.activeSection = 'analysis';
          // console.log('[Velocity MessageBox] Persistent mode enabled for analysis section');
        }

        // Show loading state in analysis section
        analysisSection.style.display = 'block';
        showRecommendationLoader(analysisSection);

        // Get the current prompt from input field
        getCurrentPromptText().then(promptText => {
          if (!promptText || promptText.trim().length === 0) {
            console.warn('[Velocity MessageBox] No prompt text found for recommendation');
            showRecommendationError(analysisSection, 'Please enter a prompt to get recommendations.');
            return;
          }

          // console.log('[Velocity MessageBox] Getting recommendation for prompt:', promptText.substring(0, 50) + '...');

          // Call the recommendation API
          chrome.runtime.sendMessage({
            action: 'getRecommendation',
            prompt: promptText,
            platform: window.velocityWrapperState?.platform || 'unknown',
            style: 'default'
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Velocity MessageBox] Error getting recommendation:', chrome.runtime.lastError.message || chrome.runtime.lastError);
              showRecommendationError(analysisSection, 'Failed to get recommendation. Please try again.');
              return;
            }

            if (response && response.success && response.data) {
              // console.log('[Velocity MessageBox] Recommendation received:', response.data);
              // Handle different response formats
              const recommendation = response.data.recommendation || response.data.message || response.data;
              showRecommendationContent(analysisSection, recommendation);
            } else {
              console.error('[Velocity MessageBox] Failed to get recommendation:', response?.error || 'Unknown error');
              showRecommendationError(analysisSection, response?.error || 'Failed to get recommendation. Please try again.');
            }
          });
        }).catch(error => {
          console.error('[Velocity MessageBox] Error getting prompt text:', error);
          showRecommendationError(analysisSection, 'Failed to get prompt text. Please try again.');
        });
      }
    } else if (e.target.classList.contains('need-help-button')) {
      // Handle need help button click - get clarifying questions from API
      e.stopPropagation(); // Prevent event bubbling
      
      // Log need help button click to backend
      logToBackend('info', 'Need help button clicked', {
        quality_state: window.velocityMessageBoxState.currentState || 'unknown',
        platform: window.velocityWrapperState?.platform || 'unknown'
      });

      const questionsSection = messageBox.querySelector('.questions-section');
      const analysisSection = messageBox.querySelector('.analysis-section');
       // Track Need help button click with Mixpanel
       chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Need Help Button Clicked",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          quality_state: window.velocityMessageBoxState.currentState || 'unknown',
          url: window.location.href
        }
      });

      if (questionsSection) {
        // Check if questions section is already open (toggle behavior)
        const isQuestionsOpen = questionsSection.style.display === 'block';

        if (isQuestionsOpen && window.velocityMessageBoxState.activeSection === 'questions') {
          // Close questions section if it's already open
          questionsSection.style.display = 'none';
          window.velocityMessageBoxState.activeSection = null;
          window.velocityMessageBoxState.isPersistent = false;
          // console.log('[Velocity MessageBox] Questions section closed (toggle)');
          return;
        }

        // Hide analysis section if it's open
        if (analysisSection) {
          analysisSection.style.display = 'none';
        }

        // Set persistent behavior for bad state interactions
        if (window.velocityMessageBoxState.currentState === 'bad') {
          window.velocityMessageBoxState.isPersistent = true;
          window.velocityMessageBoxState.activeSection = 'questions';
          // console.log('[Velocity MessageBox] Persistent mode enabled for questions section');
        }

        // Show loading state in questions section
        questionsSection.style.display = 'block';
        showQuestionsLoader(questionsSection);

        // Get the current prompt from input field
        getCurrentPromptText().then(promptText => {
          if (!promptText || promptText.trim().length === 0) {
            console.warn('[Velocity MessageBox] No prompt text found for clarifying questions');
            showQuestionsError(questionsSection, 'Please enter a prompt to get clarifying questions.');
            return;
          }
          // Log API call to get clarifying questions
          logToBackend('info', 'Getting clarifying questions from API', {
            prompt_length: promptText.length,
            platform: window.velocityWrapperState?.platform || 'unknown'
          });

          // Call the clarify API
          chrome.runtime.sendMessage({
            action: 'getClarifyingQuestions',
            prompt: promptText,
            platform: window.velocityWrapperState?.platform || 'unknown',
            style: 'default'
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Velocity MessageBox] Error getting clarifying questions:', chrome.runtime.lastError.message || chrome.runtime.lastError);
              
              // Log API error
              logToBackend('error', 'Failed to get clarifying questions', {
                error: chrome.runtime.lastError.message || 'Unknown runtime error',
                prompt_length: promptText.length
              });
              
              showQuestionsError(questionsSection, 'Failed to get clarifying questions. Please try again.');
              return;
            }

            if (response && response.success && response.data) {
              // console.log('[Velocity MessageBox] Clarifying questions received:', response.data);
              // Handle different response formats
              const questions = response.data.questions || response.data.clarifying_questions || response.data;
              if (Array.isArray(questions) && questions.length > 0) {
                // Log success
                logToBackend('info', 'Successfully got clarifying questions', {
                  questions_count: questions.length,
                  first_question_preview: questions[0].substring(0, 50)
                });
                
                showQuestionsContent(questionsSection, questions, promptText);
              } else {
                console.error('[Velocity MessageBox] No questions found in response:', response.data);
                
                // Log empty questions response
                logToBackend('error', 'No questions found in API response', {
                  response_data: JSON.stringify(response.data).substring(0, 200)
                });
                
                showQuestionsError(questionsSection, 'No clarifying questions available for this prompt.');
              }
            } else {
              console.error('[Velocity MessageBox] Failed to get clarifying questions:', response?.error || 'Unknown error');
              showQuestionsError(questionsSection, response?.error || 'Failed to get clarifying questions. Please try again.');
            }
          });
        }).catch(error => {
          console.error('[Velocity MessageBox] Error getting prompt text:', error);
          showQuestionsError(questionsSection, 'Failed to get prompt text. Please try again.');
        });
      }
    } else if (e.target.classList.contains('action-button')) {
      // Handle action button clicks
      e.stopPropagation(); // Prevent event bubbling

      if (e.target.classList.contains('help-button')) {
        // Handle help button click
        // console.log('[Velocity MessageBox] Help button clicked');
        showHelpModal();
      }
    } else if (e.target.classList.contains('suggestion-clickable') ||
               e.target.closest('.suggestion-clickable')) {
      // Handle suggestion click
      const suggestionElement = e.target.classList.contains('suggestion-clickable') ?
                               e.target : e.target.closest('.suggestion-clickable');
      const suggestionText = decodeURIComponent(suggestionElement.dataset.suggestion || '');

      if (suggestionText) {
        // console.log('[Velocity MessageBox] Suggestion clicked:', suggestionText);
        insertSuggestionIntoInput(suggestionText);

        // Track suggestion use with Mixpanel
        chrome.runtime.sendMessage({
          action: "trackMixpanelEvent",
          eventName: "Suggestion Used",
          properties: {
            platform: window.velocityWrapperState?.platform || 'unknown',
            suggestion_length: suggestionText.length,
            url: window.location.href
          }
        });

        // Dispatch event for tracking
        window.dispatchEvent(new CustomEvent('velocitySuggestionUsed', {
          detail: {
            suggestion: { text: suggestionText },
            source: 'messageBox'
          }
        }));
      }
    } else if (e.target.classList.contains('refine-prompt-button')) {
      // Handle refine prompt button click - use refine API
      // console.log('[Velocity MessageBox] Refine Prompt button clicked');
      
      // Track Refine Prompt button click with Mixpanel
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Refine Prompt Button Clicked",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          quality_state: window.velocityMessageBoxState.currentState || 'unknown',
          url: window.location.href
        }
      });

      handleRefinePromptClick(e.target, messageBox);
    } else if (e.target.classList.contains('feedback-button')) {
      // Handle like/dislike button clicks
      e.stopPropagation(); // Prevent event bubbling

      const feedbackType = e.target.dataset.feedback;
      // console.log('[Velocity MessageBox] Feedback button clicked:', feedbackType);

      handleFeedbackButtonClick(e.target, feedbackType);
    } else if (e.target.classList.contains('profile-link')) {
      // Handle profile link click
      e.preventDefault();
      e.stopPropagation();

      // console.log('[Velocity MessageBox] Profile link clicked');
      handleProfileLinkClick();
    }
  });

  // Add the message box to the document
  document.body.appendChild(messageBox);
  // console.log('[Velocity MessageBox] Added message box to document body');

  // Store the message box in the global state
  window.velocityMessageBoxState.currentBox = messageBox;

  // Add input change listeners as specified in MESSAGE_BOX_SYSTEM_OVERVIEW.md
  addInputChangeListeners(messageBox);

  return messageBox;
}

/**
 * Save feedback to the new API
 * @param {string} feedbackType - 'like' or 'dislike'
 */
function saveFeedbackToAPI(feedbackType) {
  // console.log(`[Velocity MessageBox] Saving ${feedbackType} feedback to API`);

  // Get the prompt_review_id from storage (should be set when prompt is enhanced)
  chrome.storage.local.get(['currentPromptReviewId'], (result) => {
    const promptReviewId = result.currentPromptReviewId;

    if (!promptReviewId) {
      console.warn('[Velocity MessageBox] No prompt_review_id found in storage, cannot save feedback');
      return;
    }

    // console.log(`[Velocity MessageBox] Found prompt_review_id: ${promptReviewId}, saving feedback`);

    // Convert feedbackType to boolean (like = true, dislike = false)
    const feedback = feedbackType === 'like';

    // Send message to background script to save feedback
    chrome.runtime.sendMessage({
      action: 'saveFeedback',
      promptReviewId: promptReviewId,
      feedback: feedback
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Velocity MessageBox] Error sending feedback message:', chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        // console.log('[Velocity MessageBox] Feedback saved successfully:', response.data);
      } else {
        console.error('[Velocity MessageBox] Failed to save feedback:', response?.error || 'Unknown error');
      }
    });
  });
}

/**
 * Handle feedback button clicks (like/dislike)
 * @param {HTMLElement} button - The clicked button element
 * @param {string} feedbackType - 'like' or 'dislike'
 */
function handleFeedbackButtonClick(button, feedbackType) {
  // console.log(`[Velocity MessageBox] Processing ${feedbackType} feedback`);

  // Visual feedback - change button appearance
  const isLike = feedbackType === 'like';
  const otherButton = button.parentElement.querySelector(isLike ? '.dislike-button' : '.like-button');

  // Reset both buttons first
  button.classList.remove('selected');
  if (otherButton) {
    otherButton.classList.remove('selected');
  }

  // Add selected state to clicked button
  button.classList.add('selected');

  // Change button text to show feedback was received
  const svg = button.querySelector('svg');

  if (isLike) {
    button.innerHTML = `${svg.outerHTML} Liked!`;
    button.style.backgroundColor = '#22C55E';
    button.style.color = 'white';
  } else {
    button.innerHTML = `${svg.outerHTML} Disliked`;
    button.style.backgroundColor = '#EF4444';
    button.style.color = 'white';
  }

  // Send feedback to analytics/tracking
  try {
    // Get prompt review ID for tracking context
    chrome.storage.local.get(['currentPromptReviewId'], (result) => {
      const promptReviewId = result.currentPromptReviewId;
      
      // Track feedback with Mixpanel using Chrome API with enhanced properties
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Quality Feedback",
        properties: {
          feedback_type: feedbackType,
          quality_state: window.velocityMessageBoxState.currentState || 'good',
          platform: window.velocityWrapperState?.platform || 'unknown',
          prompt_review_id: promptReviewId || 'unknown',
          source: 'message_box',
          url: window.location.href
        }
      });

      // Dispatch custom event for other tracking systems
      window.dispatchEvent(new CustomEvent('velocityQualityFeedback', {
        detail: {
          feedbackType: feedbackType,
          qualityState: window.velocityMessageBoxState.currentState || 'good',
          promptReviewId: promptReviewId,
          timestamp: Date.now()
        }
      }));

      // console.log(`[Velocity MessageBox] ${feedbackType} feedback tracked successfully`);

      // Save feedback to the new API
      saveFeedbackToAPI(feedbackType);
    });
  } catch (error) {
    console.error('[Velocity MessageBox] Error tracking feedback:', error);
  }

  // Auto-hide message box after a short delay to show the feedback was received
  setTimeout(() => {
    if (window.velocityMessageBoxState.isVisible) {
      // console.log('[Velocity MessageBox] Auto-hiding message box after feedback');
      hideStateMessageBox();
    }
  }, 1500);
}

/**
 * Handle profile link click to open profile page
 */
function handleProfileLinkClick() {
  // console.log('[Velocity MessageBox] Opening profile page');

  try {
    // Open the profile page in a new tab
    const profileUrl = 'https://thinkvelocity.in/profile';
    window.open(profileUrl, '_blank');

    // Track the profile link click using Chrome API
    chrome.runtime.sendMessage({
      action: "trackMixpanelEvent",
      eventName: "Profile Link Clicked",
      properties: {
        source: 'green_mode_message_box',
        platform: window.velocityWrapperState?.platform || 'unknown',
        url: window.location.href
      }
    });

    // Dispatch custom event for other tracking systems
    window.dispatchEvent(new CustomEvent('velocityProfileLinkClicked', {
      detail: {
        source: 'green_mode_message_box',
        timestamp: Date.now()
      }
    }));

    // console.log('[Velocity MessageBox] Profile link click tracked successfully');
  } catch (error) {
    console.error('[Velocity MessageBox] Error opening profile page:', error);
  }
}

/**
 * Handle refine prompt button click
 * @param {HTMLElement} button - The refine prompt button element
 * @param {HTMLElement} messageBox - The message box element
 */
function handleRefinePromptClick(button, messageBox) {
  // Get the stored questions and collect answers
  const storedQuestions = window.velocityMessageBoxState.currentQuestions || [];
  const questionInputs = messageBox.querySelectorAll('.question-input');
  const answers = Array.from(questionInputs).map(input => input.value.trim());

  // Create Q&A pairs (including empty answers)
  const qaArray = [];
  for (let i = 0; i < Math.min(storedQuestions.length, answers.length); i++) {
    qaArray.push({
      question: storedQuestions[i],
      answer: answers[i] || '' // Include empty answers
    });
  }

  // Log refine prompt button click
  logToBackend('info', 'Refine Prompt button clicked', {
    questions_count: storedQuestions.length,
    answers_count: answers.filter(answer => answer.length > 0).length,
    platform: window.velocityWrapperState?.platform || 'unknown'
  });

  // Show loading state on the refine button
  button.classList.add('loading');
  const originalText = button.innerHTML;
  button.innerHTML = '<div class="loader-small"></div> Refining...';
  button.disabled = true;
  
  // Set a flag in the state to indicate we're refining a prompt
  // This will prevent auto-hiding the message box
  window.velocityMessageBoxState.isRefining = true;
  
  // Define injectedButton as null (removed animation)
  const injectedButton = null;

  // Get the original prompt
  const originalPrompt = window.velocityMessageBoxState.currentPrompt || '';

  // Track refine prompt started with Mixpanel
  chrome.runtime.sendMessage({
    action: "trackMixpanelEvent",
    eventName: "Refine Prompt Started",
    properties: {
      platform: window.velocityWrapperState?.platform || 'unknown',
      questions_count: storedQuestions.length,
      answers_count: answers.filter(answer => answer.length > 0).length,
      original_prompt_length: originalPrompt.length,
      url: window.location.href
    }
  });

  // Log API call to refine prompt
  logToBackend('info', 'Calling refine prompt API', {
    original_prompt_length: originalPrompt.length,
    qa_pairs_count: qaArray.length,
    platform: window.velocityWrapperState?.platform || 'unknown'
  });

  // Call the refine API
  chrome.runtime.sendMessage({
    action: 'refinePrompt',
    originalPrompt: originalPrompt,
    qaArray: qaArray
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Velocity MessageBox] Error refining prompt:', chrome.runtime.lastError.message || chrome.runtime.lastError);
      // Reset both buttons state on error
      button.classList.remove('loading');
      button.innerHTML = originalText;
      button.disabled = false;
      
      // Reset the refining flag since we're done (with an error)
      window.velocityMessageBoxState.isRefining = false;
      
      // Log API error
      logToBackend('error', 'Error refining prompt', {
        error: chrome.runtime.lastError.message || 'Unknown runtime error',
        original_prompt_length: originalPrompt.length
      });
      
      // Injected button animation removed
      showRefineError(button, 'Failed to refine prompt. Please try again.');

      // Track refine prompt error
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Refine Prompt Error",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          error: chrome.runtime.lastError.message || 'Unknown error',
          url: window.location.href
        }
      });

      return;
    }

    if (response && response.success && response.data) {
      const refinedPrompt = response.data.refined_prompt ||
                           response.data.enhanced_prompt ||
                           response.data.prompt ||
                           response.data.message ||
                           response.data;

      if (typeof refinedPrompt === 'string' && refinedPrompt.trim().length > 0) {
        // Check if we need to enhance the current prompt first to get a prompt_review_id
        checkAndHandleRefinedPromptSaving(originalPrompt, refinedPrompt);

        // Inject the refined prompt
        const inputBox = window.velocityWrapperState?.inputBox;
        if (inputBox) {
          // Inject the refined prompt
          if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
            inputBox.value = refinedPrompt;
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (inputBox.hasAttribute('contenteditable')) {
            inputBox.innerText = refinedPrompt;
            inputBox.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }

          // Show success state on both buttons
          button.classList.remove('loading');
          button.classList.add('success');
          button.innerHTML = '<span>✓ Prompt Refined</span>';

          // Log successful refinement
          logToBackend('info', 'Successfully refined prompt', {
            platform: window.velocityWrapperState?.platform || 'unknown',
            original_prompt_length: originalPrompt.length,
            refined_prompt_length: refinedPrompt.length, 
            character_difference: refinedPrompt.length - originalPrompt.length,
            percent_change: originalPrompt.length > 0 ? ((refinedPrompt.length - originalPrompt.length) / originalPrompt.length * 100).toFixed(2) : 0
          });

          // Reset the refining flag after a successful operation
          window.velocityMessageBoxState.isRefining = false;

          // Track successful refine
          chrome.runtime.sendMessage({
            action: "trackMixpanelEvent",
            eventName: "Refine Prompt Success",
            properties: {
              platform: window.velocityWrapperState?.platform || 'unknown',
              original_prompt_length: originalPrompt.length,
              refined_prompt_length: refinedPrompt.length,
              character_difference: refinedPrompt.length - originalPrompt.length,
              percent_change: originalPrompt.length > 0 ? ((refinedPrompt.length - originalPrompt.length) / originalPrompt.length * 100).toFixed(2) : 0,
              url: window.location.href
            }
          });

          // Reset both buttons state after 2 seconds
          setTimeout(() => {
            button.classList.remove('success');
            button.innerHTML = originalText;
            button.disabled = false;

            // Hide the questions section
            const questionsSection = messageBox.querySelector('.questions-section');
            if (questionsSection) {
              questionsSection.style.display = 'none';
            }
            
            // Only now hide the message box if needed
            if (window.velocityMessageBoxState.isVisible && !window.velocityMessageBoxState.isPersistent) {
              hideStateMessageBox();
            }
          }, 2000);
        }
      } else {
        console.error('[Velocity MessageBox] Invalid refined prompt received');
        // Reset both buttons state on error
        button.classList.remove('loading');
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Reset the refining flag since we're done (with an error)
        window.velocityMessageBoxState.isRefining = false;
        
        // Injected button animation removed
        showRefineError(button, 'Failed to refine prompt. Invalid response received.');
        
        // Track invalid response error
        chrome.runtime.sendMessage({
          action: "trackMixpanelEvent",
          eventName: "Refine Prompt Error",
          properties: {
            platform: window.velocityWrapperState?.platform || 'unknown',
            error: 'Invalid response received',
            url: window.location.href
          }
        });
      }
    } else {
      console.error('[Velocity MessageBox] Failed to refine prompt:', response?.error || 'Unknown error');
      // Reset both buttons state on error
      button.classList.remove('loading');
      button.innerHTML = originalText;
      button.disabled = false;
      
      // Reset the refining flag since we're done (with an error)
      window.velocityMessageBoxState.isRefining = false;
      
      // Injected button animation removed
      showRefineError(button, response?.error || 'Failed to refine prompt. Please try again.');
      
      // Track API error
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Refine Prompt Error",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          error: response?.error || 'Unknown error',
          url: window.location.href
        }
      });
    }
  });
}

/**
 * Update the message box content based on the current state
 * @param {string} state - The current state (idle, analyzing, bad, ok, good)
 */
function updateStateMessageBox(state) {
  // Validate state
  if (!state || typeof state !== 'string') {
    console.error('[Velocity MessageBox] Invalid state provided:', state);
    return;
  }

  // Check for duplicate message boxes before updating
  const messageBoxes = document.querySelectorAll('.velocity-state-message-box');
  if (messageBoxes.length > 1) {
    logToBackend('warning', 'Multiple message boxes detected before update', {
      count: messageBoxes.length,
      requested_state: state,
      current_states: Array.from(messageBoxes).map(box => box.getAttribute('data-state')).join(', ')
    });
    
    // Remove all existing message boxes except the first one
    for (let i = 1; i < messageBoxes.length; i++) {
      if (messageBoxes[i].parentNode) {
        messageBoxes[i].parentNode.removeChild(messageBoxes[i]);
      }
    }
  }

  // Get or create the message box with safety check
  const messageBox = window.velocityMessageBoxState.currentBox || createStateMessageBox();
  if (!messageBox) {
    console.error('[Velocity MessageBox] Failed to create or get message box');
    logToBackend('error', 'Failed to create or get message box', {
      requested_state: state
    });
    return;
  }

  // Get the content for this state with validation
  const stateContent = window.velocityMessageBoxState.messageContent[state];
  if (!stateContent) {
    console.error(`[Velocity MessageBox] No content defined for state: ${state}`);
    return;
  }

  // Prevent state conflicts
  if (window.velocityMessageBoxState.isAnalyzing && state !== 'analyzing') {
    console.warn('[Velocity MessageBox] State update blocked - analysis in progress');
    return;
  }

  try {
    // Update the message box attributes
    messageBox.setAttribute('data-state', state);

    // Update the title with safety check
    const titleElement = messageBox.querySelector('.state-title');
    if (titleElement) {
      titleElement.textContent = stateContent.title;
    }

    // Update the content with safety check
    const contentElement = messageBox.querySelector('.message-content');
    if (contentElement) {
      // Only show suggestions in the idle state
      if (state === 'idle' && window.velocityMessageBoxState.suggestions?.length > 0) {
        const suggestionsHTML = generateSuggestionsHTML(window.velocityMessageBoxState.suggestions);
        contentElement.innerHTML = suggestionsHTML;
      } else {
        contentElement.innerHTML = stateContent.content;
      }
    }

    // Update the state in the global state
    window.velocityMessageBoxState.currentState = state;
  } catch (error) {
    console.error('[Velocity MessageBox] Error updating message box state:', error);
  }

  // Add state logging at the end
  // console.log(`[Velocity MessageBox] State updated to: ${state}`);
  logSuggestionState();
}

/**
 * Generate HTML for suggestions
 * @param {Array} suggestions - Array of suggestion objects
 * @param {boolean} showEmptyInputMessage - Whether to show empty input message instead of suggestions
 * @returns {string} HTML string for suggestions
 */
function generateSuggestionsHTML(suggestions, showEmptyInputMessage = false) {
  // Add debug log to see what suggestions we're working with
  // console.log('[Velocity MessageBox] Generating HTML for suggestions:', suggestions);

  // Check if we have actual suggestions to display
  if (!suggestions || suggestions.length === 0) {
    // Show empty input message if requested
    if (showEmptyInputMessage) {
    return `
        <div class="suggestion-boxes">
          <div class="empty-input-validation">Please start typing to see real-time analysis.</div>
          <div class="suggestion-box">No suggestions available yet.</div>
        </div>
      `;
    }
    // Default message when no suggestions are available
    return `
      <div class="suggestion-boxes">
        <div class="suggestion-box">No suggestions available at this time.</div>
      </div>
    `;
  }

  // Generate HTML for each suggestion
  const suggestionBoxesHTML = suggestions.map(suggestion => {
    // Sanitize suggestion text
    const text = suggestion.text || "No suggestion text available";

    return `
      <div class="suggestion-box clickable" data-suggestion="${encodeURIComponent(JSON.stringify(suggestion))}">
        <div class="suggestion-text">${text}</div>
      </div>
    `;
  }).join('\n');

  // Return the full HTML with suggestions
  return `
    <div class="suggestion-boxes">
      ${suggestionBoxesHTML}
      <div class="action-button-container">
        <button class="action-button remix-button">Remix</button>
        <button class="action-button help-button">Help</button>
      </div>
    </div>
  `;
}

/**
 * Check if the current input field is empty
 * @returns {boolean} True if input is empty, false otherwise
 */
function checkInputIsEmpty() {
  try {
    // Get the current platform and input selector
    const platform = window.velocityWrapperState?.platform;
    if (!platform || !window.platforms || !window.platforms[platform]) {
      console.warn('[Velocity MessageBox] Platform not found for input check');
      return true; // Assume empty if we can't find the platform
    }

    const platformConfig = window.platforms[platform];
    const inputSelector = platformConfig.textAreaSelector;

    if (!inputSelector) {
      console.warn('[Velocity MessageBox] No input selector found for platform:', platform);
      return true;
    }

    // Find the input element
    const inputElement = document.querySelector(inputSelector);
    if (!inputElement) {
      console.warn('[Velocity MessageBox] Input element not found with selector:', inputSelector);
      return true;
    }

    // Check if input has content based on element type
    let hasContent = false;
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      hasContent = inputElement.value.trim().length > 0;
    } else if (inputElement.hasAttribute('contenteditable')) {
      hasContent = inputElement.innerText.trim().length > 0;
    } else {
      hasContent = inputElement.textContent.trim().length > 0;
    }

    // console.log('[Velocity MessageBox] Input check result:', !hasContent ? 'empty' : 'has content');
    return !hasContent;
  } catch (error) {
    console.error('[Velocity MessageBox] Error checking input:', error);
    return true; // Assume empty on error
  }
}

/**
 * Show empty input message in the message box
 * @param {HTMLElement} targetElement - The element to position the message box relative to
 */
function showEmptyInputMessage(targetElement) {
  // console.log('[Velocity MessageBox] Showing empty input message');

  // Get or create the message box
  const messageBox = window.velocityMessageBoxState.currentBox || createStateMessageBox();

  // Keep the existing title (usually "Suggestions")
  const titleElement = messageBox.querySelector('.state-title');
  if (titleElement) {
    titleElement.textContent = 'Suggestions';
  }

  // Get current suggestions to keep them visible
  const currentSuggestions = window.velocityMessageBoxState.suggestions || [];

  // Update the content with empty input message added to existing suggestions
  const contentElement = messageBox.querySelector('.message-content');
  if (contentElement) {
    contentElement.innerHTML = generateSuggestionsHTML(currentSuggestions, true); // true = show empty input message
  }

  // Update the state
  messageBox.setAttribute('data-state', 'idle');
  window.velocityMessageBoxState.currentState = 'idle';

  // Show the message box
  showStateMessageBox(targetElement);

  // Fade out the validation message after 3 seconds, keep suggestions
  setTimeout(() => {
    if (window.velocityMessageBoxState.isVisible) {
      // console.log('[Velocity MessageBox] Fading out empty input validation message');
      const validationMessage = messageBox.querySelector('.empty-input-validation');
      if (validationMessage) {
        // Add fade-out class to trigger CSS transition
        validationMessage.classList.add('fade-out');

        // Remove the element after the fade animation completes (0.5s)
        setTimeout(() => {
          if (validationMessage.parentNode) {
            validationMessage.remove();
            // console.log('[Velocity MessageBox] Empty input validation message removed after fade');
          }
        }, 500); // Match the CSS transition duration
      }
    }
  }, 3000);
}

/**
 * Show the state message box
 * @param {HTMLElement} targetElement - The element to position the message box relative to
 */
function showStateMessageBox(targetElement) {
  // Check for multiple message boxes and remove extras
  const messageBoxes = document.querySelectorAll('.velocity-state-message-box');
  if (messageBoxes.length > 1) {
    logToBackend('warning', 'Multiple message boxes detected in showStateMessageBox', {
      count: messageBoxes.length
    });
    
    // Keep only the first one and remove the rest
    for (let i = 1; i < messageBoxes.length; i++) {
      if (messageBoxes[i].parentNode) {
        messageBoxes[i].parentNode.removeChild(messageBoxes[i]);
      }
    }
  }
  
  const messageBox = document.querySelector('.velocity-state-message-box');
  if (!messageBox) return;
  
  // Get the button element
  const button = targetElement.closest('.velocity-button-container') || 
                document.querySelector('.velocity-button-container button');
  
  if (!button) return;
  
  // Check if there's enough space to display the message box
  const hasEnoughSpace = checkAndUpdateMessageBoxPosition(messageBox, button);
  
  if (!hasEnoughSpace) {
    // If there's not enough space, don't show the message box
    messageBox.style.display = 'none';
    return;
  }
  
  // Add window resize listener to update position
  const resizeHandler = () => {
    const stillHasSpace = checkAndUpdateMessageBoxPosition(messageBox, button);
    if (!stillHasSpace) {
      messageBox.style.display = 'none';
      messageBox.classList.remove('visible'); // Ensure visible class is removed if space is lost
    }
  };
  
  window.addEventListener('resize', resizeHandler);
  
  // Store the resize handler for cleanup
  messageBox._resizeHandler = resizeHandler;
  
  // Show the message box
  messageBox.style.display = 'block';
  messageBox.style.opacity = '1';
  messageBox.classList.add('visible'); // Add visible class here

  // Use a single persistent timer
  clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
  if (messageBox) {
    if (!messageBox._hasAutoHideListeners) {
      messageBox.addEventListener('mouseenter', () => {
        window.velocityMessageBoxState.isHovering = true;
        clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
      });
      messageBox.addEventListener('mouseleave', () => {
        window.velocityMessageBoxState.isHovering = false;
        clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
        window.velocityMessageBoxState.autoHideTimeout = setTimeout(() => {
          if (!window.velocityMessageBoxState.isHovering) {
            hideStateMessageBox();
          }
        }, 2000);
      });
      messageBox._hasAutoHideListeners = true;
    }
    // Start auto-hide timer when shown
    clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
    window.velocityMessageBoxState.autoHideTimeout = setTimeout(() => {
      if (!window.velocityMessageBoxState.isHovering) {
        hideStateMessageBox();
      }
    }, 2000);
  }
}

function checkAndUpdateMessageBoxPosition(messageBox, button) {
  if (!messageBox || !button) return;

  const buttonRect = button.getBoundingClientRect();
  const messageBoxRect = messageBox.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Default dimensions and margins
  const messageBoxWidth = 320;
  const messageBoxHeight = messageBoxRect.height || 300; // Fallback height if not measured
  const margin = 10;
  
  // Calculate available space in all directions
  const spaceOnRight = windowWidth - buttonRect.right;
  const spaceOnLeft = buttonRect.left;
  const spaceOnBottom = windowHeight - buttonRect.bottom;
  const spaceOnTop = buttonRect.top;
  
  // Get anchor position from button container
  const buttonContainer = button.closest('.velocity-button-container');
  const anchorPosition = buttonContainer?.dataset.anchorPosition || 'right';
  
  // Strict space checking with additional buffer
  const hasEnoughSpaceRight = spaceOnRight >= messageBoxWidth + margin;
  const hasEnoughSpaceLeft = spaceOnLeft >= messageBoxWidth + margin;
  
  // More strict bottom space check with additional buffer
  const requiredBottomSpace = messageBoxHeight + margin + 20; // Added 20px buffer
  const hasEnoughSpaceBottom = spaceOnBottom >= requiredBottomSpace;
  const hasEnoughSpaceTop = spaceOnTop >= messageBoxHeight + margin;
  
  // Determine the best position based on available space and anchor
  let bestPosition = {
    horizontal: 'right',
    vertical: 'bottom',
    hasEnoughSpace: false
  };
  
  // First try to respect the anchor position
  if (anchorPosition.includes('right') && hasEnoughSpaceRight) {
    bestPosition.horizontal = 'right';
    bestPosition.hasEnoughSpace = true;
  } else if (anchorPosition.includes('left') && hasEnoughSpaceLeft) {
    bestPosition.horizontal = 'left';
    bestPosition.hasEnoughSpace = true;
  }
  
  // If anchor position doesn't have enough space, try alternatives
  if (!bestPosition.hasEnoughSpace) {
    if (hasEnoughSpaceRight) {
      bestPosition.horizontal = 'right';
      bestPosition.hasEnoughSpace = true;
    } else if (hasEnoughSpaceLeft) {
      bestPosition.horizontal = 'left';
      bestPosition.hasEnoughSpace = true;
    }
  }
  
  // Strict vertical position check
  if (hasEnoughSpaceBottom) {
    // Double check if the message box would actually fit
    const wouldFitAtBottom = (buttonRect.bottom + requiredBottomSpace) <= windowHeight;
    if (wouldFitAtBottom) {
      bestPosition.vertical = 'bottom';
    } else {
      bestPosition.vertical = 'top';
    }
  } else {
    bestPosition.vertical = 'top';
  }
  
  // Final space validation
  const finalSpaceCheck = () => {
    if (bestPosition.vertical === 'bottom') {
      return spaceOnBottom >= requiredBottomSpace;
    } else {
      return spaceOnTop >= messageBoxHeight + margin;
    }
  };
  
  // Only show message box if there's enough space in at least one direction
  if (!bestPosition.hasEnoughSpace || !finalSpaceCheck()) {
    messageBox.style.display = 'none';
    return false;
  }
  
  // Apply the best position
  messageBox.setAttribute('data-position', bestPosition.horizontal);
  messageBox.classList.toggle('positioned-above', bestPosition.vertical === 'top');
  
  // Set horizontal position
  if (bestPosition.horizontal === 'right') {
    messageBox.style.left = `${buttonRect.right + margin}px`;
    messageBox.style.right = 'auto';
  } else {
    messageBox.style.right = `${windowWidth - buttonRect.left + margin}px`;
    messageBox.style.left = 'auto';
  }
  
  // Set vertical position with additional safety checks
  if (bestPosition.vertical === 'bottom') {
    const bottomPosition = buttonRect.bottom + margin;
    const maxBottomPosition = windowHeight - messageBoxHeight - margin;
    messageBox.style.top = `${Math.min(bottomPosition, maxBottomPosition)}px`;
    messageBox.style.bottom = 'auto';
  } else {
    const topPosition = buttonRect.top - messageBoxHeight - margin;
    messageBox.style.bottom = `${windowHeight - buttonRect.top + margin}px`;
    messageBox.style.top = 'auto';
  }
  
  // Final position validation
  const finalRect = messageBox.getBoundingClientRect();
  const isFullyVisible = 
    finalRect.top >= 0 &&
    finalRect.bottom <= windowHeight &&
    finalRect.left >= 0 &&
    finalRect.right <= windowWidth;
  
  if (!isFullyVisible) {
    messageBox.style.display = 'none';
    return false;
  }
  
  return true;
}

/**
 * Hide the state message box
 */
function hideStateMessageBox() {
  try {
    // Check for multiple message boxes first and clean them up
    const messageBoxes = document.querySelectorAll('.velocity-state-message-box');
    if (messageBoxes.length > 1) {
      logToBackend('warning', 'Multiple message boxes detected in hideStateMessageBox', {
        count: messageBoxes.length,
        states: Array.from(messageBoxes).map(box => box.getAttribute('data-state')).join(', ')
      });
      
      // Remove all message boxes to ensure a clean state
      messageBoxes.forEach(box => {
        if (box.parentNode) {
          box.style.opacity = '0';
          setTimeout(() => {
            if (box.parentNode) box.parentNode.removeChild(box);
          }, 300);
        }
      });
      
      // Reset state
      window.velocityMessageBoxState.currentBox = null;
      window.velocityMessageBoxState.isVisible = false;
      return;
    }
    
    // Normal single message box handling
    const messageBox = window.velocityMessageBoxState?.currentBox;
    if (!messageBox) {
      if (window._velocityDebug) /* console.log('[Velocity MessageBox] No message box found to hide, initializing.') */;
      initializeMessageBox();
      return;
    }
    if (!window.velocityMessageBoxState) return;
    
    // Check if we're in refining state, if so, don't hide the message box
    if (window.velocityMessageBoxState.isRefining) {
      if (window._velocityDebug) /* console.log('[Velocity MessageBox] Currently refining prompt, not hiding.') */;
      return;
    }
    
    if (window.velocityMessageBoxState.isPersistent) {
      if (window._velocityDebug) /* console.log('[Velocity MessageBox] Persistent mode active, not hiding.') */;
      return;
    }
    // Remove event listeners
    if (messageBox._resizeHandler) {
      window.removeEventListener('resize', messageBox._resizeHandler);
      messageBox._resizeHandler = null;
    }
    if (messageBox._hasHoverListeners) {
      messageBox.removeEventListener('mouseenter', messageBox._hoverEnterHandler);
      messageBox.removeEventListener('mouseleave', messageBox._hoverLeaveHandler);
      messageBox._hasHoverListeners = false;
    }
    window.velocityMessageBoxState.isVisible = false;
    messageBox.style.opacity = '0';
    messageBox.classList.remove('visible');
    clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
    if (window._velocityDebug) /* console.log('[Velocity MessageBox] Hiding message box.') */;
    setTimeout(() => {
      if (messageBox.parentNode) {
        messageBox.parentNode.removeChild(messageBox);
      }
      window.velocityMessageBoxState.currentBox = null;
      window.velocityMessageBoxState.isHovering = false;
    }, MESSAGE_BOX_CONFIG.transitionDelay);
  } catch (error) {
    console.warn('[Velocity MessageBox] Error hiding message box:', error);
  }
}

/**
 * Setup button hover functionality to show/hide the message box
 * @param {HTMLElement} button - The button to add hover functionality to
 */
function setupButtonHover(button) {
  if (!button) {
    console.warn('[Velocity MessageBox] No button provided for hover setup');
    return;
  }
  
  // First, remove any duplicate message boxes that might exist
  removeDuplicateMessageBoxes();
  
  // Reset suggestion state when setting up hover
  window.velocityMessageBoxState = window.velocityMessageBoxState || {};
  window.velocityMessageBoxState.hasFetchedSuggestions = false;

  // Add click event listener to check for empty input
  button.addEventListener('click', (e) => {
    if (checkInputIsEmpty()) {
      e.preventDefault();
      e.stopPropagation();
      showEmptyInputMessage(button);
      return false;
    }
  }, true);

  // Add mouseenter event listener to button
  button.addEventListener('mouseenter', () => {
    window.velocityMessageBoxState.isHovering = true;

    const qualityState = window.velocityQualityState?.currentQuality || 'idle';
    const isAnalyzing = window.velocityQualityState?.isAnalyzing || false;

      // Always show current state and whether we've already fetched suggestions
  // console.log('[Velocity MessageBox] Hover state:', {
  //   currentState: qualityState, 
  //   isAnalyzing, 
  //   hasFetchedSuggestions: window.velocityMessageBoxState.hasFetchedSuggestions,
  //   currentSuggestions: window.velocityMessageBoxState.suggestions?.length || 0
  // });

  // Fetch suggestions on hover in idle state
  if ((qualityState === 'idle' || qualityState === 'suggestion') && !isAnalyzing && !window.velocityMessageBoxState.hasFetchedSuggestions) {
    // console.log('[Velocity MessageBox] Hover - fetching suggestions');
      
      // Only make one API call, not two duplicated calls
      (async function fetchSuggestionsDirectly() {
        // Use the improved fetchAndUpdateSuggestions function instead of duplicating the logic
        await fetchAndUpdateSuggestions(window.velocityMessageBoxState.currentBox);
      })();
    }

    let stateToShow = qualityState;
    if (isAnalyzing) {
      stateToShow = 'analyzing';
    }

    updateStateMessageBox(stateToShow);
    showStateMessageBox(button);
  });

  // Add mouseleave event listener to button
  button.addEventListener('mouseleave', (e) => {
    const messageBox = window.velocityMessageBoxState.currentBox;
    if (messageBox) {
      const messageBoxRect = messageBox.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check if mouse is moving towards the message box
      const isMovingTowardsMessageBox = 
        mouseX >= messageBoxRect.left - 50 && 
        mouseX <= messageBoxRect.right + 50 && 
        mouseY >= messageBoxRect.top - 50 && 
        mouseY <= messageBoxRect.bottom + 50;

      if (isMovingTowardsMessageBox) {
        return;
      }

      // Add mouseenter event listener to message box if not already added
      if (!messageBox._hasHoverListeners) {
        messageBox.addEventListener('mouseenter', () => {
          window.velocityMessageBoxState.isHovering = true;
        });

        messageBox.addEventListener('mouseleave', () => {
          window.velocityMessageBoxState.isHovering = false;
          setTimeout(() => {
            if (!window.velocityMessageBoxState.isHovering) {
              hideStateMessageBox();
            }
          }, MESSAGE_BOX_CONFIG.hideDelay);
        });

        messageBox._hasHoverListeners = true;
      }
    }

    window.velocityMessageBoxState.isHovering = false;
    setTimeout(() => {
      if (!window.velocityMessageBoxState.isHovering) {
        hideStateMessageBox();
      }
    }, MESSAGE_BOX_CONFIG.hideDelay);
  });
}

/**
 * Add input change listeners to hide message box when user makes changes
 * @param {HTMLElement} messageBox - The message box element to add listeners to
 */
function addInputChangeListeners(messageBox) {
  // console.log('[Velocity MessageBox] Adding input change listeners');

  const questionInputs = messageBox.querySelectorAll('.question-input');

  questionInputs.forEach(input => {
    const inputHandler = () => {
      // console.log('[Velocity MessageBox] Input field changed');
      // Don't hide if in persistent mode
      if (!window.velocityMessageBoxState.isPersistent) {
        // console.log('[Velocity MessageBox] Not in persistent mode, hiding message box');
        hideStateMessageBox();
      } else {
        // console.log('[Velocity MessageBox] In persistent mode, not hiding message box');
      }
    };

    input.addEventListener('input', inputHandler);
    input.addEventListener('change', inputHandler);
  });

  // console.log(`[Velocity MessageBox] Added input change listeners to ${questionInputs.length} inputs`);
}

/**
 * Setup injected button listener to hide message box when injected buttons are used
 */
function setupInjectedButtonListener() {
  // console.log('[Velocity MessageBox] Setting up injected button listener');

  // Listen for messages from content script about prompt injection (Chrome API)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "insertHere" && message.prompt) {
      // Hide the message box immediately on inject
      hideStateMessageBox();
      // Reset persistent state when inject button is used
      window.velocityMessageBoxState.isPersistent = false;
      window.velocityMessageBoxState.activeSection = null;
      
      // Track injected button use with Mixpanel
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Injected Button Used",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          injection_method: 'message',
          prompt_length: message.prompt?.length || 0,
          url: window.location.href
        }
      });
    }
  });

  // Also listen for button clicks on injected buttons directly
  document.addEventListener('click', (e) => {
    if (e.target.closest('.custom-injected-button') ||
        e.target.classList.contains('velocity-inject-button') ||
        e.target.closest('.velocity-button-container')) {
      // Hide the message box immediately on inject
      hideStateMessageBox();
      // Reset persistent state when inject button is clicked
      window.velocityMessageBoxState.isPersistent = false;
      window.velocityMessageBoxState.activeSection = null;
      
      // Track injected button click with Mixpanel
      chrome.runtime.sendMessage({
        action: "trackMixpanelEvent",
        eventName: "Injected Button Clicked",
        properties: {
          platform: window.velocityWrapperState?.platform || 'unknown',
          injection_method: 'click',
          button_type: e.target.closest('.custom-injected-button') ? 'custom' : 
                       e.target.classList.contains('velocity-inject-button') ? 'inject' : 'container',
          url: window.location.href
        }
      });
    }
  });

  // Listen for submit/send button clicks to close message box
  document.addEventListener('click', (e) => {
    // Check for various submit/send button patterns across different platforms
    const isSubmitButton =
      // Generic submit/send button patterns
      e.target.type === 'submit' ||
      e.target.classList.contains('send-button') ||
      e.target.classList.contains('submit-button') ||
      e.target.textContent?.toLowerCase().includes('send') ||
      e.target.textContent?.toLowerCase().includes('submit') ||
      e.target.getAttribute('aria-label')?.toLowerCase().includes('send') ||
      e.target.getAttribute('aria-label')?.toLowerCase().includes('submit') ||
      // ChatGPT specific
      e.target.closest('[data-testid="send-button"]') ||
      e.target.closest('button[aria-label*="Send"]') ||
      // Claude specific
      e.target.closest('button[aria-label*="Send Message"]') ||
      // Gemini specific
      e.target.closest('button[aria-label*="Send message"]') ||
      // Perplexity specific
      e.target.closest('button[title*="Submit"]') ||
      // Bolt specific
      e.target.closest('button[type="submit"]') ||
      // Generic patterns
      e.target.closest('button[class*="send"]') ||
      e.target.closest('button[class*="submit"]') ||
      e.target.closest('[role="button"][aria-label*="send"]') ||
      e.target.closest('[role="button"][aria-label*="submit"]');

    if (isSubmitButton) {
      // console.log('[Velocity MessageBox] Submit/Send button clicked, hiding message box');
      // Reset persistent state when submit/send button is clicked
      window.velocityMessageBoxState.isPersistent = false;
      window.velocityMessageBoxState.activeSection = null;
      hideStateMessageBox();
    }
  });

  // Listen for keyboard events to detect Enter key submissions
  document.addEventListener('keydown', (e) => {
    // Check for Enter key press (with or without Shift/Ctrl modifiers depending on platform)
    if (e.key === 'Enter') {
      // Get the current platform to determine submission behavior
      const platform = window.velocityWrapperState?.platform;
      let isSubmission = false;

      // Platform-specific Enter key behavior
      if (platform === 'chatgpt' || platform === 'claude' || platform === 'gemini') {
        // These platforms typically submit on Enter (without Shift)
        isSubmission = !e.shiftKey;
      } else if (platform === 'bolt' || platform === 'vercelv0') {
        // These platforms might use Ctrl+Enter or just Enter
        isSubmission = e.ctrlKey || e.metaKey || !e.shiftKey;
      } else {
        // Generic behavior: Enter without Shift is submission
        isSubmission = !e.shiftKey;
      }

      // Check if the target is an input field (textarea, contenteditable, etc.)
      const isInputField =
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'INPUT' ||
        e.target.hasAttribute('contenteditable') ||
        e.target.closest('[contenteditable="true"]') ||
        e.target.closest('textarea') ||
        e.target.closest('input[type="text"]');

      if (isSubmission && isInputField) {
        // console.log('[Velocity MessageBox] Enter key submission detected, hiding message box');
        // Reset persistent state when Enter key submission is detected
        window.velocityMessageBoxState.isPersistent = false;
        window.velocityMessageBoxState.activeSection = null;
        // Use a small delay to allow the submission to process first
        setTimeout(() => {
          hideStateMessageBox();
        }, 100);
      }
    }
  });

  // console.log('[Velocity MessageBox] Injected button listener setup complete');
}



/**
 * Insert suggestion text into input field
 * @param {string} text - Suggestion text to insert
 */
function insertSuggestionIntoInput(text) {
  if (!text) return;

  try {
    // Log suggestion click
    logToBackend('info', 'Suggestion clicked for insertion', {
      suggestion_length: text.length,
      suggestion_preview: text.substring(0, 50),
      platform: window.velocityWrapperState?.platform || 'unknown'
    });

    // Get platform config
    const platform = window.velocityWrapperState?.platform;
    const platformConfig = window.platforms?.[platform];
    
    if (!platformConfig || !platformConfig.textAreaSelector) {
      console.warn('[Velocity MessageBox] No platform config found for suggestion insertion');
      logToBackend('error', 'No platform config found for suggestion insertion', {
        platform: platform || 'unknown'
      });
      return;
    }
    
    // Find input field
    const inputField = document.querySelector(platformConfig.textAreaSelector);
    if (!inputField) {
      console.warn('[Velocity MessageBox] Input field not found for suggestion insertion');
      logToBackend('error', 'Input field not found for suggestion insertion', {
        platform: platform || 'unknown',
        selector: platformConfig.textAreaSelector
      });
      return;
    }
    
    // Different insertion methods based on input type
    if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
      // Standard textarea/input
      inputField.value = text;
      inputField.focus();
      
      // Trigger input event
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (inputField.hasAttribute('contenteditable') || 
               inputField.classList.contains('ProseMirror') ||
               inputField.classList.contains('ql-editor')) {
      // Contenteditable div (like Claude, Gemini)
      inputField.innerHTML = '';
      inputField.textContent = text;
      inputField.focus();
      
      // Trigger input event
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Track suggestion insertion with Mixpanel
    chrome.runtime.sendMessage({
      action: "trackMixpanelEvent",
      eventName: "Suggestion Inserted",
      properties: {
        platform: platform || 'unknown',
        suggestion_length: text.length,
        url: window.location.href
      }
    });
    
    // Add visual feedback animation
    inputField.classList.add("velocity-suggestion-highlight", "velocity-suggestion-scale");
    setTimeout(() => {
      inputField.classList.remove("velocity-suggestion-highlight", "velocity-suggestion-scale");
    }, 1000);
    
    // Log successful insertion
    logToBackend('info', 'Suggestion successfully inserted into input', {
      platform: window.velocityWrapperState?.platform || 'unknown',
      input_type: inputField.tagName.toLowerCase(),
      is_contenteditable: inputField.hasAttribute('contenteditable')
    });
    
    // Hide message box after insertion
    hideStateMessageBox();
    
    return true;
  } catch (error) {
    console.error('[Velocity MessageBox] Error inserting suggestion:', error);
    
    // Log error
    logToBackend('error', 'Error inserting suggestion', {
      error: error.message,
      platform: window.velocityWrapperState?.platform || 'unknown'
    });
    
    return false;
  }
}

/**
 * Update suggestions in the message box
 * @param {Array} suggestions - Array of suggestion objects
 */
function updateSuggestions(suggestions) {
  // console.log(`[Velocity MessageBox] Updating suggestions: ${suggestions?.length || 0} received`);

  // Store all suggestions in global state
  window.velocityMessageBoxState.allSuggestions = suggestions || [];

  // Reset the current suggestion set
  window.velocityMessageBoxState.currentSuggestionSet = 0;

  // Get the first set of suggestions (up to 3)
  const firstSet = (suggestions || []).slice(0, 3);

  // Store the current set of suggestions
  window.velocityMessageBoxState.suggestions = firstSet;

  // Update the message box if it's visible
  if (window.velocityMessageBoxState.isVisible) {
    // Get the current state
    const currentState = window.velocityMessageBoxState.currentState;
    // console.log('[Velocity MessageBox] Message box is visible, current state:', currentState);

    // Check if we should update based on current quality state
    const qualityState = window.velocityQualityState?.currentQuality || 'idle';
    const isAnalyzing = window.velocityQualityState?.isAnalyzing || false;

    // console.log(`[Velocity MessageBox] Current quality state: ${qualityState}, isAnalyzing: ${isAnalyzing}`);

    // Determine which state to show based on quality analysis
    let stateToShow = qualityState;
    if (isAnalyzing) {
      stateToShow = 'analyzing';
    }

    // IMPORTANT: Only update to suggestions if we're actually in idle or suggestion state
    // Don't override quality states (bad, ok, good) with suggestions
    if ((stateToShow === 'idle' || stateToShow === 'suggestion') && (currentState === 'idle' || currentState === 'suggestion')) {
      // console.log('[Velocity MessageBox] Updating idle/suggestion state with new suggestions');
      // Map suggestion state to idle for message box display
      updateStateMessageBox(stateToShow === 'suggestion' ? 'idle' : stateToShow);
    } else if (stateToShow !== 'idle' && stateToShow !== 'suggestion') {
      // console.log(`[Velocity MessageBox] Not overriding WebSocket state ${stateToShow} with suggestions`);
    }
  } else {
    // console.log('[Velocity MessageBox] Message box not visible, suggestions stored for later');
  }
}

/**
 * Force update the message box state based on current quality analysis
 * This should be called after prompt enhancement/analysis is complete
 */
function forceUpdateMessageBoxState() {
  // console.log('[Velocity MessageBox] Force updating message box state');

  // Only update if message box is visible
  if (!window.velocityMessageBoxState.isVisible) {
    // console.log('[Velocity MessageBox] Message box not visible, skipping force update');
    return;
  }

  // Get current quality state
  const qualityState = window.velocityQualityState?.currentQuality || 'idle';
  const isAnalyzing = window.velocityQualityState?.isAnalyzing || false;

  // console.log(`[Velocity MessageBox] Force update - quality state: ${qualityState}, isAnalyzing: ${isAnalyzing}`);

  // Determine which state to show
  let stateToShow = qualityState;
  if (isAnalyzing) {
    stateToShow = 'analyzing';
  }

  // console.log(`[Velocity MessageBox] Force updating to state: ${stateToShow}`);

  // Update the message box
  updateStateMessageBox(stateToShow);
}

/**
 * Transition from quality state back to suggestions when appropriate
 * This should be called when user starts typing or makes changes
 */
function transitionToSuggestionsIfAppropriate() {
  // console.log('[Velocity MessageBox] Checking if transition to suggestions is appropriate');

  // Only transition if message box is visible
  if (!window.velocityMessageBoxState.isVisible) {
    // console.log('[Velocity MessageBox] Message box not visible, no transition needed');
    return;
  }

  // Get current states
  const currentState = window.velocityMessageBoxState.currentState;
  const qualityState = window.velocityQualityState?.currentQuality || 'idle';
  const isAnalyzing = window.velocityQualityState?.isAnalyzing || false;

  // console.log(`[Velocity MessageBox] Current state: ${currentState}, quality state: ${qualityState}, analyzing: ${isAnalyzing}`);

  // Check if input field is actually empty to determine if we should transition to idle
  const hasContent = checkInputHasContent();
  // console.log(`[Velocity MessageBox] Input has content: ${hasContent}`);

  // Only transition to suggestions if:
  // 1. We're in a quality state (bad/ok/good)
  // 2. The quality system says we're idle or suggestion (meaning no content or analysis complete)
  // 3. We're not currently analyzing
  // 4. The input field is actually empty (this is the key check that was missing)
  if ((currentState === 'bad' || currentState === 'ok' || currentState === 'good') &&
      (qualityState === 'idle' || qualityState === 'suggestion') && !isAnalyzing && !hasContent) {

    // console.log('[Velocity MessageBox] Input is empty and quality is idle/suggestion - transitioning from quality state to suggestions');

    // Check if we have suggestions to show
    if (window.velocityMessageBoxState.suggestions && window.velocityMessageBoxState.suggestions.length > 0) {
      updateStateMessageBox('idle');
    } else {
      // Try to generate suggestions
      if (window.velocitySuggestionEngine && typeof window.velocitySuggestionEngine.generateSuggestions === 'function') {
        // console.log('[Velocity MessageBox] Generating suggestions for transition');
        window.velocitySuggestionEngine.generateSuggestions()
          .then(suggestions => {
            if (suggestions && suggestions.length > 0) {
              window.velocityMessageBoxState.allSuggestions = suggestions;
              window.velocityMessageBoxState.suggestions = suggestions.slice(0, 3);
              window.velocityMessageBoxState.currentSuggestionSet = 0;
              updateStateMessageBox('idle');
            }
          })
          .catch(error => {
            console.error('[Velocity MessageBox] Error generating suggestions for transition:', error);
          });
      }
    }
  } else if (hasContent && qualityState !== 'idle' && qualityState !== 'suggestion') {
    // console.log(`[Velocity MessageBox] Input has content and quality is ${qualityState} - keeping current quality state`);
  } else if (hasContent && (qualityState === 'idle' || qualityState === 'suggestion')) {
    // console.log('[Velocity MessageBox] Input has content but quality is idle/suggestion - this might indicate a timing issue or suggestion state');
  } else {
    // console.log('[Velocity MessageBox] No transition needed - conditions not met for suggestions');
  }
}

/**
 * Show help modal with information about using the extension
 */
function showHelpModal() {
  // console.log('[Velocity MessageBox] Showing help modal');

  // Check if help modal already exists
  let helpModal = document.getElementById('velocity-help-modal');
  if (helpModal) {
    helpModal.style.display = 'flex';
    // Update theme for existing modal
    const isDarkMode = document.body.classList.contains('dark-mode');
    applyMessageBoxDarkMode(isDarkMode);
    return;
  }

  // Create help modal
  helpModal = document.createElement('div');
  helpModal.id = 'velocity-help-modal';
  helpModal.className = 'velocity-help-modal';

  // Apply styles matching extension theme
  Object.assign(helpModal.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '999999',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
  });

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'velocity-help-modal-content';

  // Check if dark mode is active
  const isDarkMode = document.body.classList.contains('dark-mode');

  Object.assign(modalContent.style, {
    backgroundColor: isDarkMode ? '#152a31' : '#F3F4F6',
    color: isDarkMode ? '#FFFFFF' : '#333333',
    border: '2px solid #222',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '550px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none' // IE/Edge
  });

  // Hide scrollbar for webkit browsers
  const style = document.createElement('style');
  style.textContent = `
    .velocity-help-modal-content::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);

  // Add help content with extension theme styling
  const headerColor = isDarkMode ? '#FFFFFF' : '#333333';
  const textColor = isDarkMode ? '#FFFFFF' : '#555555';
  const accentColor = '#00c8ed';
  const tipBgColor = isDarkMode ? '#1f1f1f' : '#CDF6FE';
  const tipTextColor = isDarkMode ? '#FFFFFF' : '#333333';

  modalContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #222; padding-bottom: 16px;">
      <h2 style="margin: 0; color: ${headerColor}; font-size: 24px; font-weight: 600;">🚀 Velocity Help</h2>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="velocity-having-issues" style="
          background-color: #00c8ed;
          color: #000;
          border: 1px solid #000000;
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
          position: relative;
          top: 0;
          left: 0;
          font-weight: 500;
        ">Having Issues?</button>
        <button id="velocity-help-close" style="
          background-color: #f0f0f0;
          color: #000;
          border: 1px solid #000000;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
          position: relative;
          top: 0;
          left: 0;
        ">&times;</button>
      </div>
    </div>

    <div style="color: ${textColor}; line-height: 1.6;">
      <div style="margin-bottom: 20px;">
        <h4 style="color: ${accentColor}; margin-bottom: 10px; font-size: 16px; font-weight: 600;">🔄 How Velocity Works</h4>
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>1. Idle State:</strong> Hover over the Velocity button to see suggested prompts or write your own.</p>
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>2. Quality Analysis:</strong> After using a suggestion, Velocity analyzes your prompt quality and displays a color indicator.</p>
        <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>3. Get Help:</strong> On red state, use the buttons for assistance or analysis.</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: ${accentColor}; margin-bottom: 10px; font-size: 16px; font-weight: 600;">🎯 Quality Colors</h4>
        <div style="margin: 10px 0 0 0;">
          <div style="margin-bottom: 6px; display: flex; align-items: center;">
            <span style="width: 12px; height: 12px; background-color: #52c41a; border-radius: 50%; margin-right: 8px;"></span>
            <span style="font-weight: 500;">Green:</span> Well-written prompt
          </div>
          <div style="margin-bottom: 6px; display: flex; align-items: center;">
            <span style="width: 12px; height: 12px; background-color: #faad14; border-radius: 50%; margin-right: 8px;"></span>
            <span style="font-weight: 500;">Yellow:</span> Getting there
          </div>
          <div style="margin-bottom: 6px; display: flex; align-items: center;">
            <span style="width: 12px; height: 12px; background-color: #ff4d4f; border-radius: 50%; margin-right: 8px;"></span>
            <span style="font-weight: 500;">Red:</span> Needs improvement
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: ${accentColor}; margin-bottom: 10px; font-size: 16px; font-weight: 600;">🆘 Red State Help</h4>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Need Help:</strong> Shows guided questions to clarify your prompt. Answer them and click "Refine Prompt".</p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Suggestions:</strong> Shows detailed metrics and recommendations based on your prompt analysis.</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: ${accentColor}; margin-bottom: 10px; font-size: 16px; font-weight: 600;">🔄 Remix Button</h4>
        <p style="margin: 0 0 8px 0; font-size: 14px;">Click "Remix" in idle state to cycle through different sets of 3 suggestions.</p>
      </div>

      <div style="
        background-color: ${tipBgColor};
        color: ${tipTextColor};
        padding: 14px;
        border-radius: 8px;
        border: 2px solid #222;
        box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
      ">
        <h4 style="color: ${accentColor}; margin-top: 0; margin-bottom: 6px; font-weight: 600;">💡 Quick Tip</h4>
        <p style="margin: 0; font-size: 14px;">Click any suggestion to insert it into your input field. Be specific and detailed for better quality scores!</p>
      </div>
    </div>
  `;

  // Add modal content to modal
  helpModal.appendChild(modalContent);

  // Add close functionality with hover effects
  const closeButton = modalContent.querySelector('#velocity-help-close');
  const havingIssuesButton = modalContent.querySelector('#velocity-having-issues');

  if (closeButton) {
    // Add hover effects for close button
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#e0e0e0';
      closeButton.style.boxShadow = 'none';
      closeButton.style.transform = 'translate(2px, 2px)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = '#f0f0f0';
      closeButton.style.boxShadow = '2px 2px 0px rgba(0, 0, 0, 0.8)';
      closeButton.style.transform = 'translate(0, 0)';
    });

    closeButton.addEventListener('mousedown', () => {
      closeButton.style.transform = 'translateY(2px)';
    });

    closeButton.addEventListener('mouseup', () => {
      closeButton.style.transform = 'translate(2px, 2px)';
    });

    closeButton.addEventListener('click', () => {
      helpModal.remove(); // Remove the modal from DOM instead of just hiding it
    });
  }

  if (havingIssuesButton) {
    // Add hover effects for "Having Issues" button
    havingIssuesButton.addEventListener('mouseenter', () => {
      havingIssuesButton.style.backgroundColor = '#00daff';
      havingIssuesButton.style.boxShadow = 'none';
      havingIssuesButton.style.transform = 'translate(2px, 2px)';
    });

    havingIssuesButton.addEventListener('mouseleave', () => {
      havingIssuesButton.style.backgroundColor = '#00c8ed';
      havingIssuesButton.style.boxShadow = '2px 2px 0px rgba(0, 0, 0, 0.8)';
      havingIssuesButton.style.transform = 'translate(0, 0)';
    });

    havingIssuesButton.addEventListener('mousedown', () => {
      havingIssuesButton.style.transform = 'translateY(2px)';
    });

    havingIssuesButton.addEventListener('mouseup', () => {
      havingIssuesButton.style.transform = 'translate(2px, 2px)';
    });

    havingIssuesButton.addEventListener('click', () => {
      // Open support/issues page
      window.open('https://thinkvelocity.in/reviews', '_blank');
    });
  }

  // Close on background click
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.remove(); // Remove the modal from DOM instead of just hiding it
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.style.display === 'flex') {
      helpModal.remove(); // Remove the modal from DOM instead of just hiding it
    }
  });

  // Add to document
  document.body.appendChild(helpModal);

  // console.log('[Velocity MessageBox] Help modal created and shown');
}

/**
 * Get the next set of suggestions
 */
function getNextSuggestionSet() {
  // console.log('[Velocity MessageBox] Getting next suggestion set');

  // Get all suggestions
  const allSuggestions = window.velocityMessageBoxState.allSuggestions || [];

  if (allSuggestions.length <= 3) {
    // console.log('[Velocity MessageBox] Not enough suggestions to remix');
    return;
  }

  // Increment the current set index
  window.velocityMessageBoxState.currentSuggestionSet++;

  // Calculate how many complete sets we have
  const numCompleteSets = Math.floor(allSuggestions.length / 3);

  // If we've gone past the last complete set, loop back to the first set
  if (window.velocityMessageBoxState.currentSuggestionSet >= numCompleteSets) {
    window.velocityMessageBoxState.currentSuggestionSet = 0;
  }

  // Calculate the start index for the current set
  const startIndex = window.velocityMessageBoxState.currentSuggestionSet * 3;

  // Get the next set of suggestions (up to 3)
  const nextSet = allSuggestions.slice(startIndex, startIndex + 3);

  // console.log(`[Velocity MessageBox] Showing suggestion set ${window.velocityMessageBoxState.currentSuggestionSet + 1} of ${numCompleteSets}:`, nextSet);

  // Update the current suggestions
  window.velocityMessageBoxState.suggestions = nextSet;
}

// Export functions to global scope as specified in MESSAGE_BOX_SYSTEM_OVERVIEW.md
// Initialize if it doesn't exist
window.velocityStateMessageBox = window.velocityStateMessageBox || {};
// Add all the functions to the global object
Object.assign(window.velocityStateMessageBox, {
  create: createStateMessageBox,
  update: updateStateMessageBox,
  show: showStateMessageBox,
  hide: hideStateMessageBox,
  setupButtonHover: setupButtonHover,
  updateSuggestions: updateSuggestions,
  getNextSuggestionSet: getNextSuggestionSet,
  showHelpModal: showHelpModal,
  // Additional utility functions for Chrome-only implementation
  addInputChangeListeners: addInputChangeListeners,
  setupInjectedButtonListener: setupInjectedButtonListener,
  checkInputIsEmpty: checkInputIsEmpty,
  showEmptyInputMessage: showEmptyInputMessage,
  handleFeedbackButtonClick: handleFeedbackButtonClick,
  handleProfileLinkClick: handleProfileLinkClick,
  forceUpdateMessageBoxState: forceUpdateMessageBoxState,
  transitionToSuggestionsIfAppropriate: transitionToSuggestionsIfAppropriate
});

// Observe dark mode class changes on body and log to console
(function observeDarkModeToggle() {
  const body = document.body;
  if (!body || !window.MutationObserver) return;
  let lastDark = body.classList.contains('dark-mode');
  const observer = new MutationObserver(() => {
    const isDark = body.classList.contains('dark-mode');
    if (isDark !== lastDark) {
      // console.log('[Velocity MessageBox] Dark mode toggled:', isDark ? 'ON' : 'OFF');
      lastDark = isDark;
    }
  });
  observer.observe(body, { attributes: true, attributeFilter: ['class'] });
})();

function applyMessageBoxDarkMode(isDark) {
  // console.log(`[Velocity MessageBox] Applying ${isDark ? 'dark' : 'light'} mode to all message box elements`);

  // Update main message box
  const box = document.querySelector('.velocity-state-message-box');
  if (box) {
    if (isDark) {
      box.classList.add('dark-mode');
      // console.log('[Velocity MessageBox] ✓ Main message box set to dark mode');
    } else {
      box.classList.remove('dark-mode');
      // console.log('[Velocity MessageBox] ✓ Main message box set to light mode');
    }
  }

  // Update help modal if it exists
  const helpModal = document.getElementById('velocity-help-modal');
  if (helpModal) {
    const modalContent = helpModal.querySelector('.velocity-help-modal-content');
    if (modalContent) {
      const headerColor = isDark ? '#FFFFFF' : '#333333';
      const textColor = isDark ? '#FFFFFF' : '#555555';
      const tipBgColor = isDark ? '#1f1f1f' : '#CDF6FE';
      const tipTextColor = isDark ? '#FFFFFF' : '#333333';

      // Update modal background and text colors
      modalContent.style.backgroundColor = isDark ? '#152a31' : '#F3F4F6';
      modalContent.style.color = isDark ? '#FFFFFF' : '#333333';

      // Update all text elements
      const headers = modalContent.querySelectorAll('h2, h4');
      headers.forEach(header => {
        if (header.tagName === 'H2') {
          header.style.color = headerColor;
        } else if (header.style.color === '#00c8ed') {
          // Keep accent color unchanged
        } else {
          header.style.color = headerColor;
        }
      });

      const paragraphs = modalContent.querySelectorAll('p');
      paragraphs.forEach(p => {
        p.style.color = textColor;
      });

      // Update tip box
      const tipBox = modalContent.querySelector('div[style*="background-color"]');
      if (tipBox && tipBox.style.backgroundColor) {
        tipBox.style.backgroundColor = tipBgColor;
        tipBox.style.color = tipTextColor;
      }

      // console.log(`[Velocity MessageBox] ✓ Help modal updated to ${isDark ? 'dark' : 'light'} mode`);
    }
  }

  // Diagnose all message box states
  diagnoseMessageBoxStates(isDark);
}

function diagnoseMessageBoxStates(isDark) {
  // console.log(`[Velocity MessageBox] 🔍 DIAGNOSIS - ${isDark ? 'DARK' : 'LIGHT'} MODE ANALYSIS:`);

  const states = ['idle', 'analyzing', 'bad', 'ok', 'good', 'idleWithContent'];

  states.forEach(state => {
    // console.log(`[Velocity MessageBox] 📊 ${state.toUpperCase()} STATE:`);

    // Check if elements exist for this state
    const stateElements = document.querySelectorAll(`[data-state="${state}"]`);
    if (stateElements.length > 0) {
      // console.log(`[Velocity MessageBox]   ✓ Found ${stateElements.length} element(s) in ${state} state`);

      stateElements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element);
        // console.log(`[Velocity MessageBox]   Element ${index + 1}:`);
        // console.log(`[Velocity MessageBox]     Background: ${computedStyle.backgroundColor}`);
        // console.log(`[Velocity MessageBox]     Color: ${computedStyle.color}`);
        // console.log(`[Velocity MessageBox]     Border: ${computedStyle.border}`);

        // Check buttons in this state
        const buttons = element.querySelectorAll('button');
        if (buttons.length > 0) {
          // console.log(`[Velocity MessageBox]     Buttons (${buttons.length}):`);
          buttons.forEach((btn, btnIndex) => {
            const btnStyle = window.getComputedStyle(btn);
            // console.log(`[Velocity MessageBox]       Button ${btnIndex + 1}: bg=${btnStyle.backgroundColor}, color=${btnStyle.color}`);
          });
        }
      });
    } else {
      // console.log(`[Velocity MessageBox]   ⚠️ No elements found in ${state} state`);
    }
  });

  // Check CSS classes applied
  const bodyClasses = document.body.classList;
  // console.log(`[Velocity MessageBox] 🎨 BODY CLASSES: ${Array.from(bodyClasses).join(', ')}`);

  // Check if dark mode CSS is properly loaded
  const darkModeRules = Array.from(document.styleSheets).some(sheet => {
    try {
      return Array.from(sheet.cssRules || []).some(rule =>
        rule.selectorText && rule.selectorText.includes('dark-mode')
      );
    } catch (e) {
      return false;
    }
  });

  // console.log(`[Velocity MessageBox] 📝 Dark mode CSS rules found: ${darkModeRules ? 'YES' : 'NO'}`);
  // console.log(`[Velocity MessageBox] 🔍 DIAGNOSIS COMPLETE`);
}

// Initialize dark mode from Chrome storage
chrome.storage.local.get('darkMode', function(result) {
  const isDark = !!result.darkMode;
  // console.log('[Velocity MessageBox] Fetched dark mode from storage:', isDark ? 'ON' : 'OFF');
  if (isDark) {
    document.body.classList.add('dark-mode');
    // console.log('[Velocity MessageBox] Dark mode is triggered and body class set to dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
    // console.log('[Velocity MessageBox] Light mode is triggered and body class set to default');
  }
  applyMessageBoxDarkMode(isDark);
});

// Listen for dark mode changes in Chrome storage
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'local' && changes.darkMode) {
    const newValue = changes.darkMode.newValue;
    // console.log('[Velocity MessageBox] Dark mode toggled:', newValue ? 'ON' : 'OFF');
    if (newValue) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    applyMessageBoxDarkMode(newValue);
  }
});

// Initialize event listeners as specified in MESSAGE_BOX_SYSTEM_OVERVIEW.md
// console.log('[Velocity MessageBox] Initializing event listeners...');
setupInjectedButtonListener();
// console.log('[Velocity MessageBox] Event listeners initialization complete');



/**
 * Extract quality metrics from WebSocket response and update the bad state metrics
 * @param {Object} response - The WebSocket response object
 */
function extractAndUpdateQualityMetrics(response) {
  // console.log('[Velocity MessageBox] Processing WebSocket response for quality metrics');

  try {

    // Extract quality metrics from the response
    let qualityMetrics = null;

    // Check if response has quality_metrics directly (primary)
    if (response.quality_metrics) {
      qualityMetrics = response.quality_metrics;
      // console.log('[Velocity MessageBox] Found quality_metrics:', qualityMetrics);
    }
    // Check if response has quality_results directly (fallback)
    else if (response.quality_results) {
      qualityMetrics = response.quality_results;
      // console.log('[Velocity MessageBox] Found quality_results:', qualityMetrics);
    }
    // Check if response has nested structure
    else if (response.data && response.data.quality_metrics) {
      qualityMetrics = response.data.quality_metrics;
      // console.log('[Velocity MessageBox] Found nested quality_metrics:', qualityMetrics);
    }
    else if (response.data && response.data.quality_results) {
      qualityMetrics = response.data.quality_results;
      // console.log('[Velocity MessageBox] Found nested quality_results:', qualityMetrics);
    }
    // Check if it's in the response array format
    else if (Array.isArray(response) && response.length > 0) {
      const qualityData = response.find(item => item.quality_metrics || item.quality_results);
      if (qualityData) {
        qualityMetrics = qualityData.quality_metrics || qualityData.quality_results;
        // console.log('[Velocity MessageBox] Found quality metrics in array:', qualityMetrics);
      }
    }

    if (!qualityMetrics) {
      // console.log('[Velocity MessageBox] No quality metrics found in response');
      return;
    }

    // console.log('[Velocity MessageBox] Found quality metrics:', qualityMetrics);

    // Extract the first 4 metric values
    const metrics = {
      clarity: qualityMetrics.clarity_score || qualityMetrics.clarity_score || 0,
      specificity: qualityMetrics.ambiguity_score || qualityMetrics.ambiguity_score || 0,
      intent: qualityMetrics.intent_clarity || qualityMetrics.intent_clarity || 0,
      depth: qualityMetrics.depth_of_prompt || qualityMetrics.depth_of_prompt || 0
    };

    // Console log the extracted metrics (raw 0-1 values and display 0-10 values)
    // console.log('[Velocity MessageBox] Extracted Metrics (0-1 range):');
    // console.log('Clarity:', metrics.clarity, '→ Display:', Math.round(metrics.clarity * 10));
    // console.log('Specificity:', metrics.specificity, '→ Display:', Math.round(metrics.specificity * 10));
    // console.log('Intent:', metrics.intent, '→ Display:', Math.round(metrics.intent * 10));
    // console.log('Depth:', metrics.depth, '→ Display:', Math.round(metrics.depth * 10));

    // Update the bad state metrics in the message content
    updateBadStateMetrics(metrics);

    // If the message box is currently showing bad state, refresh it
    if (window.velocityMessageBoxState.currentState === 'bad') {
      // console.log('[Velocity MessageBox] Refreshing bad state display with new metrics');
      updateStateMessageBox('bad');
    }

  } catch (error) {
    console.error('[Velocity MessageBox] Error extracting quality metrics:', error);
  }
}

/**
 * Update the bad state metrics with new values
 * @param {Object} metrics - Object containing clarity, specificity, intent, depth values
 */
function updateBadStateMetrics(metrics) {
  try {
    // Calculate stroke dash offset for each metric (metrics are in 0-1 range)
    const calculateStrokeDashOffset = (value, maxValue = 1) => {
      const circumference = 113.1; // 2 * π * 18 (radius)
      const percentage = Math.min(value / maxValue, 1);
      return circumference - (circumference * percentage);
    };

    // Determine color based on value (0-1 range)
    const getMetricColor = (value) => {
      if (value >= 0.7) return '#22C55E'; // Green for 0.7-1.0
      if (value >= 0.5) return '#EAB308'; // Yellow for 0.5-0.69
      return '#EF4444'; // Red for 0-0.49
    };

    // Convert metrics to display values (0-10 scale)
    const displayMetrics = {
      clarity: Math.round(metrics.clarity * 10),
      specificity: Math.round(metrics.specificity * 10),
      intent: Math.round(metrics.intent * 10),
      depth: Math.round(metrics.depth * 10)
    };

    // Generate metrics HTML for all states
    const generateMetricsHTML = (state) => {
      return `
        <div class="metrics-indicator-container">
          <div class="metric-indicator-wrapper">
            <div class="metric-indicator" data-metric="clarity">
              <div class="metric-circle-container">
                <svg viewBox="0 0 44 44" class="metric-svg">
                  <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                  <circle cx="22" cy="22" r="18" stroke="${getMetricColor(metrics.clarity)}" stroke-width="4" fill="none" 
                    stroke-dasharray="113.1" stroke-dashoffset="${calculateStrokeDashOffset(metrics.clarity)}" 
                    transform="rotate(-90, 22, 22)" />
                </svg>
                <span class="metric-value" style="color: ${getMetricColor(metrics.clarity)};">${displayMetrics.clarity}</span>
              </div>
              <span class="metric-label">Clarity</span>
            </div>
          </div>
          <div class="metric-indicator-wrapper">
            <div class="metric-indicator" data-metric="specificity">
              <div class="metric-circle-container">
                <svg viewBox="0 0 44 44" class="metric-svg">
                  <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                  <circle cx="22" cy="22" r="18" stroke="${getMetricColor(metrics.specificity)}" stroke-width="4" fill="none" 
                    stroke-dasharray="113.1" stroke-dashoffset="${calculateStrokeDashOffset(metrics.specificity)}" 
                    transform="rotate(-90, 22, 22)" />
                </svg>
                <span class="metric-value" style="color: ${getMetricColor(metrics.specificity)};">${displayMetrics.specificity}</span>
              </div>
              <span class="metric-label">Specificity</span>
            </div>
          </div>
          <div class="metric-indicator-wrapper">
            <div class="metric-indicator" data-metric="intent">
              <div class="metric-circle-container">
                <svg viewBox="0 0 44 44" class="metric-svg">
                  <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                  <circle cx="22" cy="22" r="18" stroke="${getMetricColor(metrics.intent)}" stroke-width="4" fill="none" 
                    stroke-dasharray="113.1" stroke-dashoffset="${calculateStrokeDashOffset(metrics.intent)}" 
                    transform="rotate(-90, 22, 22)" />
                </svg>
                <span class="metric-value" style="color: ${getMetricColor(metrics.intent)};">${displayMetrics.intent}</span>
              </div>
              <span class="metric-label">Intent</span>
            </div>
          </div>
          <div class="metric-indicator-wrapper">
            <div class="metric-indicator" data-metric="depth">
              <div class="metric-circle-container">
                <svg viewBox="0 0 44 44" class="metric-svg">
                  <circle cx="22" cy="22" r="18" stroke="rgba(0, 0, 0, 0.1)" stroke-width="4" fill="none" />
                  <circle cx="22" cy="22" r="18" stroke="${getMetricColor(metrics.depth)}" stroke-width="4" fill="none" 
                    stroke-dasharray="113.1" stroke-dashoffset="${calculateStrokeDashOffset(metrics.depth)}" 
                    transform="rotate(-90, 22, 22)" />
                </svg>
                <span class="metric-value" style="color: ${getMetricColor(metrics.depth)};">${displayMetrics.depth}</span>
              </div>
              <span class="metric-label">Depth</span>
            </div>
          </div>
        </div>
      `;
    };

    // Update content for all states
    const states = ['bad', 'ok', 'good'];
    states.forEach(state => {
      const metricsHTML = generateMetricsHTML(state);
      const stateContent = window.velocityMessageBoxState.messageContent[state];
      if (stateContent) {
        const contentElement = document.createElement('div');
        contentElement.innerHTML = stateContent.content;
        const metricsContainer = contentElement.querySelector('.metrics-indicator-container');
        if (metricsContainer) {
          metricsContainer.outerHTML = metricsHTML;
        }
        window.velocityMessageBoxState.messageContent[state].content = contentElement.innerHTML;
      }
    });

    // If the message box is currently visible, refresh it
    if (window.velocityMessageBoxState.isVisible) {
      const currentState = window.velocityMessageBoxState.currentState;
      if (states.includes(currentState)) {
        updateStateMessageBox(currentState);
      }
    }

  } catch (error) {
    console.error('[Velocity MessageBox] Error updating metrics:', error);
  }
}

// Make the function globally available for WebSocket integration
window.extractAndUpdateQualityMetrics = extractAndUpdateQualityMetrics;

/**
 * Get current prompt text from input field
 * @returns {Promise<string>} Promise that resolves to the current prompt text
 */
function getCurrentPromptText() {
  return new Promise((resolve, reject) => {
    try {
      // Get the current platform and input selector
      const platform = window.velocityWrapperState?.platform;
      if (!platform || !window.platforms || !window.platforms[platform]) {
        console.warn('[Velocity MessageBox] Platform not found for getting prompt text');
        resolve('');
        return;
      }

      const platformConfig = window.platforms[platform];
      const inputSelector = platformConfig.textAreaSelector;

      if (!inputSelector) {
        console.warn('[Velocity MessageBox] No input selector found for platform:', platform);
        resolve('');
        return;
      }

      // Find the input element
      const inputElement = document.querySelector(inputSelector);
      if (!inputElement) {
        console.warn('[Velocity MessageBox] Input element not found with selector:', inputSelector);
        resolve('');
        return;
      }

      // Get text based on element type
      let text = '';
      if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
        text = inputElement.value;
      } else if (inputElement.hasAttribute('contenteditable')) {
        text = inputElement.innerText;
      } else {
        text = inputElement.textContent;
      }

      resolve(text.trim());
    } catch (error) {
      console.error('[Velocity MessageBox] Error getting prompt text:', error);
      reject(error);
    }
  });
}

/**
 * Show loading state in recommendation section
 * @param {HTMLElement} analysisSection - The analysis section element
 */
function showRecommendationLoader(analysisSection) {
  analysisSection.innerHTML = `
    <div class="recommendation-loader" style="text-align: center; padding: 20px;">
      <div class="loader"></div>
      <p style="margin-top: 10px; color: #666;">Getting recommendation...</p>
    </div>
  `;
}

/**
 * Show recommendation content
 * @param {HTMLElement} analysisSection - The analysis section element
 * @param {string} recommendation - The recommendation text
 */
function showRecommendationContent(analysisSection, recommendation) {
  analysisSection.innerHTML = `
    <div class="recommendation-content" style="padding: 15px;">
      <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px; font-weight: 600;">💡 Recommendation</h4>
      <p style="margin: 0; color: #555; font-size: 13px; line-height: 1.4;">${recommendation}</p>
    </div>
  `;
}

/**
 * Show recommendation error
 * @param {HTMLElement} analysisSection - The analysis section element
 * @param {string} errorMessage - The error message
 */
function showRecommendationError(analysisSection, errorMessage) {
  analysisSection.innerHTML = `
    <div class="recommendation-error" style="padding: 15px; text-align: center;">
      <p style="margin: 0; color: #ef4444; font-size: 13px;">❌ ${errorMessage}</p>
    </div>
  `;
}

/**
 * Show loading state in questions section
 * @param {HTMLElement} questionsSection - The questions section element
 */
function showQuestionsLoader(questionsSection) {
  questionsSection.innerHTML = `
    <div class="questions-loader" style="text-align: center; padding: 20px;">
      <div class="loader"></div>
      <p style="margin-top: 10px; color: #666;">Getting clarifying questions...</p>
    </div>
  `;
}

/**
 * Show questions content
 * @param {HTMLElement} questionsSection - The questions section element
 * @param {Array} questions - Array of question strings
 * @param {string} originalPrompt - The original prompt text
 */
function showQuestionsContent(questionsSection, questions, originalPrompt) {
  // Store questions and prompt for later use
  window.velocityMessageBoxState.currentQuestions = questions;
  window.velocityMessageBoxState.currentPrompt = originalPrompt;

  const questionsHTML = questions.map((question, index) => `
    <div class="question-input-field">
      <div class="question-label">${index + 1}. ${question}</div>
      <input type="text" style="border: 1px solid #000000;" class="question-input" placeholder="Your answer here." />
    </div>
  `).join('');

  questionsSection.innerHTML = `
    <div class="questions-input-sections">
      ${questionsHTML}
      <div class="button-container">
        <button class="refine-prompt-button">
          <img src="${chrome.runtime.getURL('assets/refineprompt.png')}" alt="Refine icon" width="18" height="18" style="margin-right: 8px;" />
          Refine Prompt
        </button>
      </div>
    </div>
  `;
}

/**
 * Show questions error
 * @param {HTMLElement} questionsSection - The questions section element
 * @param {string} errorMessage - The error message
 */
function showQuestionsError(questionsSection, errorMessage) {
  questionsSection.innerHTML = `
    <div class="questions-error" style="padding: 15px; text-align: center;">
      <p style="margin: 0; color: #ef4444; font-size: 13px;">❌ ${errorMessage}</p>
    </div>
  `;
}

/**
 * Show refine error on button
 * @param {HTMLElement} button - The refine button element
 * @param {string} errorMessage - The error message
 */
function showRefineError(button, errorMessage) {
  const originalText = button.innerHTML;
  button.innerHTML = '❌ Error';
  button.style.backgroundColor = '#ef4444';
  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.backgroundColor = '#00c8ed';
  }, 3000);
}

/**
 * Check if current prompt matches stored prompt_review_id, if not create new ID
 * @param {string} originalPrompt - The original prompt being refined
 * @param {string} refinedPrompt - The refined prompt to save
 */
function checkAndHandleRefinedPromptSaving(originalPrompt, refinedPrompt) {
  chrome.storage.local.get(['currentPromptReviewId'], (result) => {
    const promptReviewId = result.currentPromptReviewId;

    if (promptReviewId) {
      // If we have an existing ID, use it directly
      saveRefinedPromptToDatabase(promptReviewId, refinedPrompt);
    } else {
      // If no ID exists, create one directly without enhancing
      enhanceCurrentPromptThenSaveRefined(originalPrompt, refinedPrompt);
    }
  });
}

/**
 * Get the current prompt from the input field
 * @returns {string} Current prompt text
 */
function getCurrentInputPrompt() {
  try {
    const platform = window.velocityWrapperState?.platform;
    if (!platform || !window.platforms || !window.platforms[platform]) {
      return null;
    }

    const platformConfig = window.platforms[platform];
    const inputSelector = platformConfig.textAreaSelector;

    if (!inputSelector) {
      return null;
    }

    const inputElement = document.querySelector(inputSelector);
    if (!inputElement) {
      return null;
    }

    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      return inputElement.value.trim();
    } else if (inputElement.hasAttribute('contenteditable')) {
      return inputElement.innerText.trim();
    } else {
      return inputElement.textContent.trim();
    }
  } catch (error) {
    console.error('[Velocity MessageBox] Error getting current input prompt:', error);
    return null;
  }
}

/**
 * Enhance the current prompt first, then save the refined prompt
 * @param {string} originalPrompt - The original prompt
 * @param {string} refinedPrompt - The refined prompt to save
 */
function enhanceCurrentPromptThenSaveRefined(originalPrompt, refinedPrompt) {
  // Instead of enhancing the prompt again, we'll save the refined prompt directly
  // Generate a timestamp-based ID for the refined prompt
  const refinedPromptId = `refined-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Store this ID to be used for any future operations
  chrome.storage.local.set({ 'currentPromptReviewId': refinedPromptId }, () => {
    // Log this operation
    logToBackend('info', 'Created refined prompt ID directly', {
      refined_prompt_id: refinedPromptId,
      original_prompt_length: originalPrompt?.length || 0,
      refined_prompt_length: refinedPrompt?.length || 0
    });
    
    // Save the refined prompt with this ID
    saveRefinedPromptToDatabase(refinedPromptId, refinedPrompt);
  });
}

/**
 * Save refined prompt to database with given prompt_review_id
 * @param {number} promptReviewId - The prompt review ID
 * @param {string} refinedPrompt - The refined prompt to save
 */
function saveRefinedPromptToDatabase(promptReviewId, refinedPrompt) {
  // console.log('[Velocity MessageBox] Saving refined prompt to database with ID:', promptReviewId);

  chrome.runtime.sendMessage({
    action: 'insertRefinedPrompt',
    promptReviewId: promptReviewId,
    refinedPrompt: refinedPrompt
  }, (saveResponse) => {
    if (chrome.runtime.lastError) {
      console.error('[Velocity MessageBox] Error saving refined prompt:', chrome.runtime.lastError);
    } else if (saveResponse && saveResponse.success) {
      // console.log('[Velocity MessageBox] Refined prompt saved successfully:', saveResponse.data);
    } else {
      console.error('[Velocity MessageBox] Failed to save refined prompt:', saveResponse?.error || 'Unknown error');
    }
  });
}

/**
 * Inject refined prompt into input field using the same proven method as content-script.js
 * @param {string} refinedPrompt - The refined prompt text
 */
function injectRefinedPromptIntoInput(refinedPrompt) {
  try {
    // console.log('[Velocity MessageBox] Starting refined prompt injection using content-script method');

    // Use the same input field detection logic as content-script.js
    // let inputField = null;

    // First check if we have an input box in the wrapper state
    if (window.velocityWrapperState && window.velocityWrapperState.inputBox) {
      inputField = window.velocityWrapperState.inputBox;
      // console.log('[Velocity MessageBox] Using input field from velocityWrapperState');
    }
    // If not, try generic selectors (same as content-script.js)
    else {
      const genericSelectors = [
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]',
        '[role="textbox"]',
        '.ProseMirror',
        '.ql-editor',
        'div[class*="editor"]',
        'div[class*="input"]',
        'div[class*="textarea"]'
      ];

      for (const selector of genericSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Find the visible one that's not disabled
          for (const el of elements) {
            if (el.offsetParent !== null && !el.disabled) {
              inputField = el;
              // console.log('[Velocity MessageBox] Found input field with selector:', selector);
              break;
            }
          }
          if (inputField) break;
        }
      }
    }

    if (!inputField) {
      console.error('[Velocity MessageBox] No input field found for refined prompt injection');
      return false;
    }

    // console.log('[Velocity MessageBox] Input field type:', inputField.tagName);
    // console.log('[Velocity MessageBox] Current content before injection:',
                // inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT" ?
                // inputField.value.substring(0, 100) + '...' :
                // inputField.hasAttribute("contenteditable") ? inputBox.innerText.substring(0, 100) + '...' :
                // inputBox.textContent.substring(0, 100) + '...');
    // console.log('[Velocity MessageBox] Refined prompt to inject:', refinedPrompt.substring(0, 100) + '...');

    // Inject the prompt based on input field type (same logic as content-script.js)
    if (inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT") {
      // console.log('[Velocity MessageBox] Injecting into TEXTAREA or INPUT');
      inputField.value = refinedPrompt; // This should completely replace the content
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (inputField.hasAttribute("contenteditable")) {
      // console.log('[Velocity MessageBox] Injecting into contenteditable element');
      inputField.innerHTML = refinedPrompt; // This should completely replace the content
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // console.log('[Velocity MessageBox] Injecting into generic element');
      if (typeof inputField.value !== 'undefined') {
        inputField.value = refinedPrompt;
      } else {
        inputField.textContent = refinedPrompt;
      }
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // console.log('[Velocity MessageBox] Content after injection:',
                // inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT" ?
                // inputField.value.substring(0, 100) + '...' :
                // inputField.innerText.substring(0, 100) + '...');

    // Focus the input element
    inputField.focus();

    // Apply the highlight and scale effects (same as content-script.js)
    inputField.classList.add("velocity-enhanced-highlight", "velocity-enhanced-scale");

    // If the input is in a container, also highlight that
    const inputContainer = inputField.closest('.chat-input-container, .input-container, [role="textbox"]');
    if (inputContainer && inputContainer !== inputField) {
      inputContainer.classList.add("velocity-enhanced-highlight");
    }

    // After animation completes, remove highlight classes
    setTimeout(function() {
      inputField.classList.remove("velocity-enhanced-highlight", "velocity-enhanced-scale");
      if (inputContainer && inputContainer !== inputField) {
        inputContainer.classList.remove("velocity-enhanced-highlight");
      }
    }, 1000);

    // console.log('[Velocity MessageBox] Refined prompt injected successfully using content-script method');
    return true;
  } catch (error) {
    console.error('[Velocity MessageBox] Error injecting refined prompt:', error);
    return false;
  }
}

/**
 * Handle window resize to reposition message box if visible
 */
function handleWindowResize() {
  if (window.velocityMessageBoxState.isVisible && window.velocityMessageBoxState.currentBox) {
    // console.log('[Velocity MessageBox] Window resized, repositioning message box');

    // Find the target element (button) that the message box is positioned relative to
    const targetButton = document.querySelector('.velocity-button-container button, .velocity-inject-button');
    if (targetButton) {
      // Reposition the message box
      showStateMessageBox(targetButton);
    } else {
      console.warn('[Velocity MessageBox] Could not find target button for repositioning after resize');
    }
  }
}

// Add window resize listener for responsive repositioning
let resizeTimeout;
window.addEventListener('resize', () => {
  // Debounce resize events to avoid excessive repositioning
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleWindowResize, 150);
});

// Export the main functions for use by other scripts - merging with existing export
window.velocityStateMessageBox = window.velocityStateMessageBox || {};
Object.assign(window.velocityStateMessageBox, {
  update: updateStateMessageBox,
  show: showStateMessageBox,
  hide: hideStateMessageBox,
  showEmptyInputMessage: showEmptyInputMessage,
  transitionToSuggestionsIfAppropriate: transitionToSuggestionsIfAppropriate,
  updateSuggestions: updateSuggestions,
  handleWindowResize: handleWindowResize
});

/**
 * Clean up message box resources and state
 */
function cleanupMessageBox() {
  try {
    const messageBox = window.velocityMessageBoxState.currentBox;
    if (messageBox && messageBox.parentNode) {
      messageBox.parentNode.removeChild(messageBox);
    }
    clearTimeout(window.velocityMessageBoxState.autoHideTimeout);
    
    // Save the current suggestions and hasFetchedSuggestions flag
    const previousSuggestions = window.velocityMessageBoxState.suggestions || [];
    const previousAllSuggestions = window.velocityMessageBoxState.allSuggestions || [];
    const hasFetchedSuggestions = window.velocityMessageBoxState.hasFetchedSuggestions || false;
    const messageContent = window.velocityMessageBoxState.messageContent;
    
    // Reset state without recreating the whole object
    Object.assign(window.velocityMessageBoxState, {
      currentBox: null,
      isVisible: false,
      currentState: 'idle',
      isHovering: false,
      isPersistent: false,
      activeSection: null,
      // Refining state flag - to prevent hiding the message box during refine
      isRefining: false,
      // Keep the suggestions we already fetched
      suggestions: previousSuggestions,
      allSuggestions: previousAllSuggestions,
      currentSuggestionSet: 0,
      // Preserve the fetch status
      hasFetchedSuggestions: hasFetchedSuggestions
    });
    if (window._velocityDebug) /* console.log('[Velocity MessageBox] Cleaned up message box and state.') */;
  } catch (error) {
    // console.error('[Velocity MessageBox] Error during cleanup:', error);
  }
}

/**
 * Initialize message box system with safety checks
 */
function initializeMessageBox() {
  // Check if we've already initialized to prevent double initialization
  if (window.velocityMessageBoxState._initialized) {
    // console.log('[Velocity MessageBox] Already initialized, skipping duplicate initialization');
    return;
  }
  
  try {
    // Check for any existing message boxes and remove them
    const existingBoxes = document.querySelectorAll('.velocity-state-message-box');
    if (existingBoxes.length > 0) {
      logToBackend('info', 'Removing existing message boxes during initialization', {
        count: existingBoxes.length,
        states: Array.from(existingBoxes).map(box => box.getAttribute('data-state')).join(', ')
      });
      
      existingBoxes.forEach(box => {
        if (box.parentNode) {
          box.parentNode.removeChild(box);
        }
      });
    }
    
    // Clean up any existing instances
    cleanupMessageBox();

    // Initialize additional state properties that weren't in the original definition
    Object.assign(window.velocityMessageBoxState, {
      isFetchingSuggestions: false,
      _initialized: true,
      _initTime: Date.now()
    });

    // Add window resize handler (but only once)
    window.removeEventListener('resize', handleWindowResize); // Remove any existing handlers first
    window.addEventListener('resize', handleWindowResize);
    
    // console.log('[Velocity MessageBox] Initialization complete');
  } catch (error) {
    console.error('[Velocity MessageBox] Error during initialization:', error);
  }
}

/**
 * Remove any duplicate message boxes from the DOM
 * @returns {number} Number of removed message boxes
 */
function removeDuplicateMessageBoxes() {
  try {
    const messageBoxes = document.querySelectorAll('.velocity-state-message-box');
    if (messageBoxes.length <= 1) {
      return 0; // No duplicates
    }
    
    // Log duplicate detection
    logToBackend('warning', 'Removing duplicate message boxes', {
      count: messageBoxes.length - 1,
      states: Array.from(messageBoxes).map(box => box.getAttribute('data-state')).join(', ')
    });
    
    // Keep the first one, remove the rest
    let removedCount = 0;
    for (let i = 1; i < messageBoxes.length; i++) {
      if (messageBoxes[i].parentNode) {
        messageBoxes[i].parentNode.removeChild(messageBoxes[i]);
        removedCount++;
      }
    }
    
    // Set the current box to be the remaining one
    window.velocityMessageBoxState.currentBox = messageBoxes[0];
    
    return removedCount;
  } catch (error) {
    console.error('[Velocity MessageBox] Error removing duplicate message boxes:', error);
    return 0;
  }
}

// Export additional functions
Object.assign(window.velocityStateMessageBox, {
  cleanup: cleanupMessageBox,
  initialize: initializeMessageBox,
  removeDuplicates: removeDuplicateMessageBoxes
});

// Initialize on script load
initializeMessageBox();

// Add debug function to force suggestions with mock data
function debugForceMockSuggestions() {
  // console.log('[Velocity Debug] Forcing mock suggestions for debugging');
  const mockSuggestions = [
    {
      text: "Could you dive deeper into the underlying mechanisms and provide a comprehensive explanation with specific details, examples, and the reasoning behind each component?",
      confidence: 0.9,
      type: 'detail',
      category: 'core',
      source: 'mock'
    },
    {
      text: "I'd love to see this concept applied in practice - could you walk me through 2-3 detailed real-world scenarios with specific use cases, outcomes, and lessons learned?",
      confidence: 0.8,
      type: 'example',
      category: 'core',
      source: 'mock'
    },
    {
      text: "Based on the latest research and developments, how might this evolve in the next 3-5 years? What emerging trends or technologies might impact it?",
      confidence: 0.7,
      type: 'future',
      category: 'core',
      source: 'mock'
    }
  ];

  window.velocityMessageBoxState.suggestions = mockSuggestions;
  window.velocityMessageBoxState.allSuggestions = mockSuggestions;
  window.velocityMessageBoxState.hasFetchedSuggestions = true;

  // Update the UI if the message box is visible
  if (window.velocityMessageBoxState.isVisible && window.velocityMessageBoxState.currentBox) {
    updateStateMessageBox('idle');
  }
  
  return mockSuggestions;
}

// Expose the debug function globally
window.debugForceMockSuggestions = debugForceMockSuggestions;

/**
 * Helper function to use hardcoded suggestions
 */
function useHardcodedSuggestions() {
  // console.log('[Velocity MessageBox] Using hardcoded suggestions');
  const hardcodedSuggestions = getHardcodedSuggestions();
  window.velocityMessageBoxState.allSuggestions = hardcodedSuggestions;
  window.velocityMessageBoxState.suggestions = hardcodedSuggestions;
  window.velocityMessageBoxState.currentSuggestionSet = 0;
  window.velocityMessageBoxState.hasFetchedSuggestions = true;
  
  // Log the suggestion state for debugging
  logSuggestionState();
  
  // Update the state message box if it's visible
  if (window.velocityMessageBoxState.isVisible) {
    updateStateMessageBox('idle');
  }
}

/**
 * Get hardcoded suggestions as fallback
 * @returns {Array} Array of hardcoded suggestion objects
 */
function getHardcodedSuggestions() {
  return [
    {
      text: "Could you dive deeper into the underlying mechanisms and provide a comprehensive explanation with specific details, examples, and the reasoning behind each component?",
      confidence: 0.9,
      type: 'detail',
      category: 'core',
      source: 'hardcoded'
    },
    {
      text: "I'd love to see this concept applied in practice - could you walk me through 2-3 detailed real-world scenarios with specific use cases, outcomes, and lessons learned?",
      confidence: 0.8,
      type: 'example',
      category: 'core',
      source: 'hardcoded'
    },
    {
      text: "Based on the latest research and developments, how might this evolve in the next 3-5 years? What emerging trends or technologies might impact it?",
      confidence: 0.7,
      type: 'future',
      category: 'extended',
      source: 'hardcoded'
    }
  ];
}

// Add this function to debug the current state of suggestions
function logSuggestionState() {
  // console.log('[Velocity MessageBox] Current suggestion state:', {
  //   hasFetchedSuggestions: window.velocityMessageBoxState.hasFetchedSuggestions,
  //   allSuggestionsCount: window.velocityMessageBoxState.allSuggestions?.length || 0,
  //   currentSuggestionsCount: window.velocityMessageBoxState.suggestions?.length || 0,
  //   currentSuggestionSet: window.velocityMessageBoxState.currentSuggestionSet,
  //   firstSuggestion: window.velocityMessageBoxState.suggestions?.[0]?.text || 'none'
  // });
}

logSuggestionState();

/**
 * Fetches suggestions from the API and updates the UI
 * @param {HTMLElement} messageBox - The message box element to update
 * @returns {Promise<void>}
 */
async function fetchAndUpdateSuggestions(messageBox) {
  // Flag to track if we're already fetching suggestions to prevent duplicate calls
  if (window.velocityMessageBoxState.isFetchingSuggestions) {
    // console.log('[Velocity MessageBox] Already fetching suggestions, skipping duplicate call');
    return;
  }
  
  // Set fetching flag
  window.velocityMessageBoxState.isFetchingSuggestions = true;
  
  if (!messageBox) {
    window.velocityMessageBoxState.isFetchingSuggestions = false;
    return;
  }
  
  const contentElement = messageBox.querySelector('.message-content');
  if (!contentElement) {
    window.velocityMessageBoxState.isFetchingSuggestions = false;
    return;
  }

  // Show loading state
  contentElement.innerHTML = `
    <div class="suggestion-boxes">
      <div class="suggestion-box loading">
        <div class="loading-indicator">
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
        </div>
      </div>
      <div class="suggestion-box loading">
        <div class="loading-indicator">
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
        </div>
      </div>
      <div class="suggestion-box loading">
        <div class="loading-indicator">
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
            <div class="loading-bar"></div>
          </div>
        </div>
      </div>
      <div class="action-button-container">
        <button class="action-button remix-button">Retry</button>
        <button class="action-button help-button">Help</button>
      </div>
    </div>
  `;

  try {
    // Log that we're fetching suggestions
    logToBackend('info', 'Fetching suggestions from API', {
      platform: window.velocityWrapperState?.platform || 'unknown'
    });

    // Get user data from chrome.storage
    const userData = await new Promise((resolve) => {
      chrome.storage.local.get(["userId", "token", "apiAuthKey"], (result) => {
        resolve({
          userId: result.userId || "anonymous",
          apiAuthKey: result.apiAuthKey || "a1cacd98586a0e974faad626dd85f3f4b4fe120b710686773300f2d8c51d63bf"
        });
      });
    });

    // Call the API to get suggestions
    const apiUrl = `https://thinkvelocity.in/dev/test/remix-suggestion/${userData.userId}`;
    
    // Send message to background script to make the API call
    let response;
    try {
      response = await new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve({ success: false, status: 'timeout', statusText: 'Request timed out' });
        }, 5000); // 5 second timeout
        
        chrome.runtime.sendMessage({
          action: "fetchSuggestions",
          url: apiUrl,
          token: userData.apiAuthKey
        }, (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        });
      });
    } catch (e) {
      // Handle message sending errors
      console.warn('[Velocity MessageBox] Error sending message to background script:', e);
      throw new Error('Error communicating with background script');
    }

    if (!response || !response.success) {
      logToBackend('error', 'Failed to fetch suggestions', {
        error: `API Error: ${response?.status} ${response?.statusText}`,
        platform: window.velocityWrapperState?.platform || 'unknown'
      });
      throw new Error(`API Error: ${response?.status} ${response?.statusText}`);
    }

    let data;
    try {
      // Parse the response data
      data = JSON.parse(response.data);
    } catch (e) {
      throw new Error('Invalid API response: JSON parse error');
    }
    
    if (!data || !data.suggested_questions || !Array.isArray(data.suggested_questions)) {
      logToBackend('error', 'Invalid suggestions API response format', {
        response_preview: JSON.stringify(data || {}).substring(0, 100),
        platform: window.velocityWrapperState?.platform || 'unknown'
      });
      throw new Error('Invalid API response format');
    }

    // Convert API suggestions to our format
    const suggestions = data.suggested_questions.map((text, index) => ({
      text: text || "No suggestion available", // Ensure we never have null/undefined texts
      confidence: 0.9 - (index * 0.05),
      type: 'api',
      category: 'api',
      source: 'api'
    })).filter(suggestion => suggestion.text.trim().length > 0); // Remove any empty suggestions

    // Verify we actually got some suggestions
    if (!suggestions || suggestions.length === 0) {
      throw new Error('No valid suggestions received');
    }

    // Log successful suggestions fetch
    logToBackend('info', 'Successfully fetched suggestions', {
      suggestions_count: suggestions.length,
      first_suggestion: suggestions[0]?.text.substring(0, 50),
      platform: window.velocityWrapperState?.platform || 'unknown'
    });

    // Update the suggestions in the state
    window.velocityMessageBoxState.allSuggestions = suggestions;
    window.velocityMessageBoxState.suggestions = suggestions.slice(0, 3);
    window.velocityMessageBoxState.currentSuggestionSet = 0;
    window.velocityMessageBoxState.hasFetchedSuggestions = true;

    // Update the UI with new suggestions
    const suggestionsHTML = generateSuggestionsHTML(suggestions);
    contentElement.innerHTML = suggestionsHTML;

  } catch (error) {
    console.error('[Velocity MessageBox] Error fetching suggestions:', error);
    
    // Log error
    logToBackend('error', 'Error fetching suggestions', {
      error: error.message,
      platform: window.velocityWrapperState?.platform || 'unknown'
    });
    
    // Use hardcoded suggestions as fallback
    const hardcodedSuggestions = getHardcodedSuggestions();
    
    // Update state with fallback suggestions
    window.velocityMessageBoxState.allSuggestions = hardcodedSuggestions;
    window.velocityMessageBoxState.suggestions = hardcodedSuggestions.slice(0, 3);
    window.velocityMessageBoxState.currentSuggestionSet = 0;
    window.velocityMessageBoxState.hasFetchedSuggestions = true;
    
    // Update UI with hardcoded suggestions
    const suggestionsHTML = generateSuggestionsHTML(hardcodedSuggestions);
    contentElement.innerHTML = suggestionsHTML;
    
    // Add a small notice that we're using fallback suggestions
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'fallback-notice';
    noticeDiv.textContent = 'Using example suggestions (API unavailable)';
    noticeDiv.style.fontSize = '11px';
    noticeDiv.style.color = '#666';
    noticeDiv.style.textAlign = 'center';
    noticeDiv.style.marginTop = '8px';
    contentElement.appendChild(noticeDiv);
  } finally {
    // Reset fetching flag regardless of success/failure
    window.velocityMessageBoxState.isFetchingSuggestions = false;
  }
}
