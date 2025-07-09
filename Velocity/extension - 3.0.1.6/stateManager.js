/**
 * stateManager.js
 * Handles saving and restoring state for the Velocity extension
 */

// State management object
window.velocityStateManager = {
  // Get current view
  getCurrentView: function() {
    const mainContent = document.getElementById('mainContent');
    const responsesWrapper = document.getElementById('responsesWrapper');
    const settingsWrapper = document.getElementById('settingsWrapper');

    if (responsesWrapper && !responsesWrapper.classList.contains('hidden')) {
      return 'responsesWrapper';
    } else if (settingsWrapper && !settingsWrapper.classList.contains('hidden')) {
      return 'settingsWrapper';
    } else if (mainContent && !mainContent.classList.contains('hidden')) {
      return 'mainContent';
    }
    return 'mainContent'; // Default view
  },

  // Update button visibility based on current view
  updateButtonVisibility: function() {
    const currentView = this.getCurrentView();
    const infoButton = document.getElementById('infoButton');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const settingsButton = document.getElementById('settingsButton');

    // Hide all buttons first
    if (infoButton) {
      infoButton.style.display = 'none';
      infoButton.style.visibility = 'hidden';
    }
    if (darkModeToggle) {
      darkModeToggle.style.display = 'none';
      darkModeToggle.style.visibility = 'hidden';
    }
    if (settingsButton) {
      settingsButton.style.display = 'none';
      settingsButton.style.visibility = 'hidden';
    }

    // Show buttons based on current view
    switch (currentView) {
      case 'mainContent':
        // Show all buttons on main page
        if (infoButton) {
          infoButton.style.display = 'flex';
          infoButton.style.visibility = 'visible';
        }
        if (darkModeToggle) {
          darkModeToggle.style.display = 'flex';
          darkModeToggle.style.visibility = 'visible';
        }
        if (settingsButton) {
          settingsButton.style.display = 'flex';
          settingsButton.style.visibility = 'visible';
        }
        break;
      case 'responsesWrapper':
        // Show only dark mode button on enhance prompt page
        if (darkModeToggle) {
          darkModeToggle.style.display = 'flex';
          darkModeToggle.style.visibility = 'visible';
        }
        break;
      case 'settingsWrapper':
        // Show dark mode and settings button on settings page
        if (darkModeToggle) {
          darkModeToggle.style.display = 'flex';
          darkModeToggle.style.visibility = 'visible';
        }
        if (settingsButton) {
          settingsButton.style.display = 'flex';
          settingsButton.style.visibility = 'visible';
        }
        break;
    }

    // Force a reflow to ensure visibility changes take effect
    document.body.offsetHeight;
  },

  // Save the current state of the extension
  saveState: function() {
    // Get the current view
    const currentView = this.getCurrentView();

    // Check if the response view is visible and has the 'visible' class
    const responsesWrapper = document.getElementById('responsesWrapper');
    const isResponseViewFullyVisible = responsesWrapper &&
                                      !responsesWrapper.classList.contains('hidden') &&
                                      responsesWrapper.classList.contains('visible');

    // Get response content
    let enhancedResponse = '';
    let responseElement = document.querySelector('.response-content');
    if (responseElement) {
      enhancedResponse = responseElement.textContent || '';
    }

    // Get suggested LLM from Chrome storage to include in state
    chrome.storage.local.get(['suggestedLLM'], (result) => {
      // Create the state object
      const state = {
        // Current view (which page is visible)
        currentView: currentView,

        // Response view visibility state
        isResponseViewFullyVisible: isResponseViewFullyVisible,

        // Prompt input text
        promptText: document.getElementById('promptInput')?.value || '',

        // Enhanced response if available
        enhancedResponse: enhancedResponse,

        // Selected style (descriptive, creative, concise, professional)
        selectedStyle: this.getSelectedStyle(),

        // Platform selection
        selectedPlatform: document.querySelector('.platform-name span')?.textContent || 'ChatGPT',

        // Suggested LLM from storage
        suggestedLLM: result.suggestedLLM || null,

        // Settings panel values
        settings: this.getSettingsValues(),

        // Timestamp for when state was saved
        timestamp: Date.now()
      };

      // // console.log('[Velocity] Saving state:', state);

      chrome.storage.local.set({ 'velocityExtensionState': state }, function() {
        // // console.log('[Velocity] State saved successfully');
      });
    });
  },

  // Restore the previously saved state
  restoreState: function() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['velocityExtensionState'], (result) => {
        if (result.velocityExtensionState) {
          const state = result.velocityExtensionState;
          // // console.log('[Velocity] Restoring state:', state);

          // Restore prompt text
          if (state.promptText && document.getElementById('promptInput')) {
            document.getElementById('promptInput').value = state.promptText;
            // Trigger input event to update character count if needed
            document.getElementById('promptInput').dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Restore selected style
          if (state.selectedStyle) {
            this.selectStyle(state.selectedStyle);
          }

          // Special handling for response view
          if (state.currentView === 'responsesWrapper' && state.enhancedResponse) {
            // First make sure all views are hidden
            const views = ['mainContent', 'responsesWrapper', 'settingsPanel'];
            views.forEach(id => {
              const element = document.getElementById(id);
              if (element) {
                element.classList.add('hidden');
                if (id === 'responsesWrapper') {
                  element.classList.remove('visible');
                }
              }
            });

            // Restore the suggested LLM to Chrome storage if it exists in state
            if (state.suggestedLLM) {
              chrome.storage.local.set({ 'suggestedLLM': state.suggestedLLM });
            }

            // Then show and render the response view
            const responsesWrapper = document.getElementById('responsesWrapper');
            if (responsesWrapper) {
              responsesWrapper.classList.remove('hidden');
              this.renderSavedResponse(state.enhancedResponse, state.selectedPlatform);

              // Make sure the response view is fully visible
              if (state.isResponseViewFullyVisible) {
                responsesWrapper.classList.add('visible');
              }
            }
          }
          // For other views, use the standard showView method
          else if (state.currentView && state.currentView !== 'responsesWrapper') {
            this.showView(state.currentView, state);
          }

          // Restore settings if they exist
          if (state.settings) {
            // Commenting out this line as settings.js is not found.
            // this.restoreSettings(state.settings);
          }

          // Update button visibility based on restored view
          this.updateButtonVisibility();

          resolve(true);
        } else {
          // // console.log('[Velocity] No saved state found');
          resolve(false);
        }
      });
    });
  },

  // Get the currently selected style
  getSelectedStyle: function() {
    const styleButtons = document.querySelectorAll('input[name="style"]');
    for (const button of styleButtons) {
      if (button.checked) {
        return button.id;
      }
    }
    return 'descriptive'; // Default
  },

  // Select a style by ID
  selectStyle: function(styleId) {
    const styleButton = document.getElementById(styleId);
    if (styleButton && !styleButton.checked) {
      styleButton.checked = true;
      styleButton.dispatchEvent(new Event('click', { bubbles: true }));
    }
  },

  // Show a specific view and handle any related state
  showView: function(viewId, state) {
    // Hide all views first
    const views = ['mainContent', 'responsesWrapper', 'settingsPanel'];
    views.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add('hidden');
        // Also remove the visible class from responses wrapper
        if (id === 'responsesWrapper') {
          element.classList.remove('visible');
        }
      }
    });

    // Show the requested view
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
      viewToShow.classList.remove('hidden');

      // If showing response view and we have a response, render it
      if (viewId === 'responsesWrapper' && state && state.enhancedResponse) {
        this.renderSavedResponse(state.enhancedResponse, state.selectedPlatform);

        // Make sure the responses wrapper is visible immediately
        viewToShow.classList.add('visible');
      }
    }

    // Update button visibility based on new view
    this.updateButtonVisibility();
  },

  // Render a saved response
  renderSavedResponse: function(responseText, platformName) {
    // Check if we need to create the response structure
    const responsesGrid = document.querySelector('.responses-grid');
    if (responsesGrid) {
      // Check if we need to create the response structure
      let responseContent = document.querySelector('.response-content');
      if (!responseContent) {
        // Create the proper response structure based on the HTML structure in phase1.html
        // This ensures we match the expected DOM structure
        responsesGrid.innerHTML = `
          <li class="response-item">
            <div class="response-content"></div>
          </li>
        `;
        // Re-query the element after it has been added to the DOM
        responseContent = document.querySelector('.response-content');
      }

      // Set the response text
      if (responseContent) {
        responseContent.textContent = responseText;
      }
    }

    // Update the header text
    const responsesHeader = document.querySelector('.responses-header');
    if (responsesHeader) {
      responsesHeader.innerHTML = "<h2>Your prompt is ready!</h2>";
    }

    // Make sure all UI elements in the response view are properly initialized
    const copyButton = document.getElementById('copyResponseButton');
    if (copyButton) {
      // Ensure copy button is properly set up
      copyButton.disabled = false;
    }

    const openInPlatformButton = document.getElementById('openInPlatformButton');
    if (openInPlatformButton) {
      // Ensure platform button is properly set up
      openInPlatformButton.disabled = false;
    }

    // Make sure the feedback buttons are properly set up
    const likeButton = document.getElementById('likeButton');
    if (likeButton) {
      likeButton.disabled = false;
    }

    const dislikeButton = document.getElementById('dislikeButton');
    if (dislikeButton) {
      dislikeButton.disabled = false;
    }

    // Make response wrapper visible immediately
    const responsesWrapper = document.getElementById('responsesWrapper');
    if (responsesWrapper) {
      responsesWrapper.classList.add('visible');
    }

    // CRITICAL: Restore the suggested LLM platform selector
    this.restorePlatformSelector();
  },

  // Restore the platform selector with suggested LLM data
  restorePlatformSelector: function() {
    // console.log('[Velocity StateManager] Restoring platform selector...');

    // Wait for functions to be available, then restore
    const waitForFunctions = () => {
      // Check if we have a suggested LLM in storage
      chrome.storage.local.get(['suggestedLLM'], (result) => {
        const suggestedLLM = result.suggestedLLM;
        // console.log('[Velocity StateManager] Found suggested LLM in storage:', suggestedLLM);

        if (suggestedLLM && typeof window.handleSuggestedLLM === 'function') {
          // Use the handleSuggestedLLM function to properly set up the platform selector
          // console.log('[Velocity StateManager] Calling window.handleSuggestedLLM with:', suggestedLLM);
          window.handleSuggestedLLM(suggestedLLM);
        } else if (suggestedLLM && typeof handleSuggestedLLM === 'function') {
          // Try the global function without window prefix
          // console.log('[Velocity StateManager] Calling global handleSuggestedLLM with:', suggestedLLM);
          handleSuggestedLLM(suggestedLLM);
        } else {
          // Fallback: Set up the default platform selector
          // console.log('[Velocity StateManager] No suggested LLM found or function not available, setting up default platform selector');
          // console.log('[Velocity StateManager] Available functions:', {
          //   handleSuggestedLLM: typeof handleSuggestedLLM,
          //   windowHandleSuggestedLLM: typeof window.handleSuggestedLLM,
          //   setupPlatformSelector: typeof setupPlatformSelector,
          //   windowSetupPlatformSelector: typeof window.setupPlatformSelector
          // });

          if (typeof window.setupPlatformSelector === 'function') {
            window.setupPlatformSelector();
          } else if (typeof setupPlatformSelector === 'function') {
            setupPlatformSelector();
          }
        }

        // Also ensure the prompt injection buttons are set up
        setTimeout(() => {
          if (typeof setupPromptInjectionButtons === 'function') {
            setupPromptInjectionButtons({
              insertButtonId: "insertButton",
              openInPlatformButtonId: "openInPlatformButton",
              trackEvent: typeof trackEvent === 'function' ? trackEvent : null,
              closePopupOnSuccess: true,
              debugMode: true
            });
          } else {
            // console.log('[Velocity StateManager] setupPromptInjectionButtons not available');
          }
        }, 200);
      });
    };

    // Wait a bit for all scripts to load, then try to restore
    setTimeout(waitForFunctions, 300);
  },

  // Get all settings values
  getSettingsValues: function() {
    return {
      wordCount: document.getElementById('wordCountSlider')?.value || 200,
      template: document.getElementById('templateSelector')?.value || '',
      language: document.getElementById('languageSelector')?.value || 'english',
      complexity: document.querySelector('input[name="complexityLevel"]:checked')?.value || 'moderate',
      outputFormat: document.querySelector('input[name="outputFormat"]:checked')?.value || 'paragraphs',
      customMessage: document.getElementById('customMessage')?.value || ''
    };
  },

  // Restore settings values
  restoreSettings: function(settings) {
    // Restore word count
    if (settings.wordCount && document.getElementById('wordCountSlider')) {
      document.getElementById('wordCountSlider').value = settings.wordCount;
      document.getElementById('wordCountValue').textContent = settings.wordCount;
    }

    // Restore template
    if (settings.template && document.getElementById('templateSelector')) {
      document.getElementById('templateSelector').value = settings.template;
    }

    // Restore language
    if (settings.language && document.getElementById('languageSelector')) {
      document.getElementById('languageSelector').value = settings.language;
    }

    // Restore complexity
    if (settings.complexity) {
      const complexityRadio = document.querySelector(`input[name="complexityLevel"][value="${settings.complexity}"]`);
      if (complexityRadio) {
        complexityRadio.checked = true;
      }
    }

    // Restore output format
    if (settings.outputFormat) {
      const formatRadio = document.querySelector(`input[name="outputFormat"][value="${settings.outputFormat}"]`);
      if (formatRadio) {
        formatRadio.checked = true;
      }
    }

    // Restore custom message
    if (settings.customMessage && document.getElementById('customMessage')) {
      document.getElementById('customMessage').value = settings.customMessage;
    }
  },

  // Debounce function to limit how often a function is called
  debounce: function(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  },

  // Initialize state management
  init: function() {
    // // console.log('[Velocity] Initializing state manager');
    this.setupEventListeners();
    return this.restoreState();
  },

  // Set up event listeners for state saving
  setupEventListeners: function() {
    // Save state when typing in prompt input (with debounce)
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
      promptInput.addEventListener('input', this.debounce(() => this.saveState(), 500));
    }

    // Save state on key interactions
    const interactionElements = [
      'sendButton', 'backToInput', 'copyResponseButton',
      'openInPlatformButton', 'insertButton', 'savePreferences'
    ];

    interactionElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', () => {
          this.saveState();
          this.updateButtonVisibility();
        });
      }
    });

    // Save state before popup closes
    window.addEventListener('beforeunload', () => this.saveState());

    // Add MutationObserver to watch for view changes
    const viewElements = ['mainContent', 'responsesWrapper', 'settingsWrapper'];
    viewElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new MutationObserver(() => {
          this.saveState();
          this.updateButtonVisibility();
        });
        observer.observe(element, { attributes: true, attributeFilter: ['class'] });
      }
    });
  },

  // Add getCurrentState to return the current extension state
  getCurrentState: function() {
    const currentView = this.getCurrentView();
    const responsesWrapper = document.getElementById('responsesWrapper');
    const isResponseViewFullyVisible = responsesWrapper &&
      !responsesWrapper.classList.contains('hidden') &&
      responsesWrapper.classList.contains('visible');
    let enhancedResponse = '';
    let responseElement = document.querySelector('.response-content');
    if (responseElement) {
      enhancedResponse = responseElement.textContent || '';
    }
    return {
      currentView: currentView,
      isResponseViewFullyVisible: isResponseViewFullyVisible,
      promptText: document.getElementById('promptInput')?.value || '',
      enhancedResponse: enhancedResponse,
      selectedStyle: this.getSelectedStyle(),
      selectedPlatform: document.querySelector('.platform-name span')?.textContent || 'ChatGPT',
      settings: this.getSettingsValues(),
      timestamp: Date.now()
    };
  }
};

// Export for use in other files
window.velocityStateManager = window.velocityStateManager || {};
