document.addEventListener("DOMContentLoaded", function () {
  // Verify Chrome extension context
  if (!chrome || !chrome.storage) {
      // console.error("Chrome storage not available - not running in extension context");
      return;
  }

  // Initialize state manager first to restore any saved state
  if (window.velocityStateManager) {
    // // console.log('[Velocity] Initializing state manager from phase1.js');
    window.velocityStateManager.init().then(stateRestored => {
      // // console.log('[Velocity] State restoration complete, state restored:', stateRestored);
    });
  } else {
    console.warn('[Velocity] State manager not available');
  }

  // Cache DOM elements with safety checks
  const darkModeToggle = document.getElementById("darkModeToggle");
  const toggleButton = document.getElementById("toggleButton");
  const infoButton = document.getElementById("infoButton");
  const settingsButton = document.getElementById("settingsButton");
  const sendButton = document.getElementById("sendButton");
  const body = document.body;

  if (!darkModeToggle || !body || !toggleButton) {
      // console.error("Required DOM elements not found");
      return;
  }

  // Add this right after the DOM element selection to debug
  //// // console.log("Toggle button found:", toggleButton);
  //// // console.log("Toggle slider found:", document.querySelector(".toggle-slider-small"));

  // Save original image sources for dark mode buttons
  saveDarkModeButtonSources();

  // Preload toggle button images to ensure they're available
  const preloadImages = () => {
      const imageUrls = ['./assets/Velocity.png', './assets/velocity_off.png'];
      imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
          img.onerror = () => console.warn(`Failed to load image: ${url}`);
      });
  };

  preloadImages();

  // Add button press animation to all buttons
  const addButtonPressAnimation = (button) => {
      if (!button) return;

      button.addEventListener("click", () => {
          // Add clicked class for animation
          button.classList.add("clicked");

          // Remove the class after animation completes
          setTimeout(() => {
              button.classList.remove("clicked");
          }, 300);
      });
  };

  // Helper to get trackEvent (from window if not in scope)
  const _trackEvent = (typeof trackEvent === 'function') ? trackEvent : (window.trackEvent || (() => {}));
  const getSelectedStyle = () => {
    const selected = document.querySelector('.button-group input[type="radio"]:checked');
    return selected ? selected.id : null;
  };
  const getSelectedPlatform = () => {
    const selected = document.querySelector('.platform-name span');
    return selected ? selected.textContent : 'none';
  };
  // Helper to get user info from chrome.storage.local
  function getUserInfo(callback) {
    chrome.storage && chrome.storage.local.get(["userId", "userName"], (data) => {
      callback({
        user_id: data.userId || "anonymous",
        user_name: data.userName || "anonymous"
      });
    });
  }

  // Apply animation to all buttons
  addButtonPressAnimation(infoButton);
  addButtonPressAnimation(settingsButton);
  addButtonPressAnimation(sendButton);

  // Initialize settings functionality
  initializeSettings();

  // Add click handler to send button to generate and show the enhanced prompt immediately
  if (sendButton) {
    sendButton.addEventListener("click", function() {
      getUserInfo((user) => {
        _trackEvent("Generate Button Clicked (Phase1)", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_generate_button",
          ...user
        });
      });
      // Get the prompt input value
      const promptInput = document.getElementById("promptInput");
      if (!promptInput || !promptInput.value.trim()) {
        return;
      }

      // Get the user's actual input
      const userPrompt = promptInput.value.trim();

      // Generate the enhanced prompt using the user's actual input
      const enhancedPrompt = generateEnhancedPrompt(userPrompt);

      // Store the enhanced prompt as storedResponse
      chrome.storage.local.set({
        "storedResponse": enhancedPrompt,
        "isGeneratingPrompt": false
      });

      // Show the response view immediately
      const mainContent = document.getElementById("mainContent");
      const responsesWrapper = document.getElementById("responsesWrapper");

      if (mainContent && responsesWrapper) {
        mainContent.classList.add("hidden");
        responsesWrapper.classList.remove("hidden");
        responsesWrapper.classList.add("visible");

        // Render the response directly
        updateResponseWithGeneratedPrompt(enhancedPrompt);
      }
    });
  }

  // Initialize dark mode from chrome.storage
  chrome.storage.local.get(["darkMode", "featureEnabled"], function(result) {
      const isDarkMode = result.darkMode === true; // Default to false if undefined
      const isFeatureEnabled = result.featureEnabled === true; // Default to false if undefined

      // Apply initial states
      body.classList.toggle("dark-mode", isDarkMode);
      toggleButton.checked = isFeatureEnabled;
      updateIcon(isDarkMode);

      // Dark mode toggle event listener with debouncing and animation
      let timeoutId;
      darkModeToggle.addEventListener("click", () => {
          // Add clicked class for animation
          darkModeToggle.classList.add("clicked");

          // Remove the class after animation completes
          setTimeout(() => {
              darkModeToggle.classList.remove("clicked");
          }, 300);

          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
              const newDarkMode = body.classList.toggle("dark-mode");

              chrome.storage.local.set({ darkMode: newDarkMode }, () => {
                  updateIcon(newDarkMode);
              });
          }, 100); // 100ms debounce
      });

      // Feature toggle event listener with animation
      const toggleContainer = document.querySelector(".small-toggle");
      toggleButton.addEventListener("change", () => {
          const isEnabled = toggleButton.checked;
          const toggleSlider = document.querySelector(".toggle-slider-small");



          // Apply appropriate animation based on toggle state
          if (isEnabled) {
              toggleSlider.classList.remove("toggle-animation-off");
          } else {
              toggleSlider.classList.add("toggle-animation-off");
              // Remove the class after animation completes
              setTimeout(() => {
                  toggleSlider.classList.remove("toggle-animation-off");
              }, 400);
          }

          chrome.storage.local.set({ featureEnabled: isEnabled });
      });

      // Also add a click handler on the container to ensure the checkbox gets toggled
      toggleContainer.addEventListener("click", (e) => {
          // Prevent default only if clicking directly on the container (not the checkbox)
          if (e.target !== toggleButton) {
              e.preventDefault();
              toggleButton.checked = !toggleButton.checked;

              // Manually trigger the change event
              const changeEvent = new Event('change');
              toggleButton.dispatchEvent(changeEvent);
          }
      });
  });

  function updateIcon(isDarkMode) {
      const icon = darkModeToggle.querySelector("img");
      if (!icon) {
          return;
      }

      // Update icon and accessibility
      const iconPath = isDarkMode ? "./assets/sun.png" : "./assets/moon.png";
      icon.src = iconPath;
      icon.alt = isDarkMode ? "Switch to light mode" : "Switch to dark mode";
      darkModeToggle.setAttribute("aria-label", icon.alt);

      icon.onerror = () => {
          icon.src = isDarkMode ?
              "https://cdn-icons-png.flaticon.com/512/869/869869.png" :
              "https://cdn-icons-png.flaticon.com/512/7699/7699366.png";
      };

      // Update dark mode sensitive buttons
      updateDarkModeButtons(isDarkMode);
  }

  // Function to update buttons that have dark mode variants
  function updateDarkModeButtons(isDarkMode) {
      // Select all buttons with darkmode data attribute
      const darkModeButtons = [
          document.querySelector('.back-arrow-icon'),
          document.querySelector('.copy-icon'),
          document.querySelector('.send-arrow-icon')
      ];

      // Update each button if it exists
      darkModeButtons.forEach(button => {
          if (button) {
              const regularSrc = button.getAttribute('src');
              const darkModeSrc = button.getAttribute('data-darkmode-src');

              if (isDarkMode && darkModeSrc) {
                  button.setAttribute('src', darkModeSrc);
              } else if (!isDarkMode && regularSrc) {
                  // Get the regular source from the path or from the original src
                  const originalPath = button.getAttribute('data-original-src') ||
                                      regularSrc.replace('-darkmode.png', '.png');
                  button.setAttribute('src', originalPath);
              }
          }
      });
  }

  // Function to save original image sources for dark mode buttons
  function saveDarkModeButtonSources() {
      // We need to wait a bit for the DOM to be fully loaded
      setTimeout(() => {
          const darkModeButtons = [
              document.querySelector('.back-arrow-icon'),
              document.querySelector('.copy-icon'),
              document.querySelector('.send-arrow-icon')
          ];

          darkModeButtons.forEach(button => {
              if (button) {
                  // Save the original source to restore it later
                  const originalSrc = button.getAttribute('src');
                  button.setAttribute('data-original-src', originalSrc);
              }
          });

          // Apply current dark mode setting to buttons
          chrome.storage.local.get(["darkMode"], function(result) {
              const isDarkMode = result.darkMode === true;
              if (isDarkMode) {
                  updateDarkModeButtons(true);
              }
          });
      }, 100);
  }

  // Start tutorial directly instead of checking for video
  startTutorialIfNeeded();

  // Check if we're on the response view and hide the info button if needed
  checkAndUpdateInfoButtonVisibility();

  // Restart tutorial when clicking info button
  if (infoButton) {
    // We already added the click animation to this button earlier
    // Just add the tutorial reset functionality
    infoButton.addEventListener("click", function () {
      // Save the current prompt input value before starting tutorial
      const promptInput = document.getElementById("promptInput");
      const userPrompt = promptInput ? promptInput.value : "";

      // Store the user's prompt temporarily
      chrome.storage.local.set({
        lastTutorialStep: 0,
        userSavedPrompt: userPrompt
      }, function () {
        // Directly initialize the tutorial when info button is clicked
        initializeTutorial(true); // Pass true to indicate this is a manual tutorial start
      });
    });
  }

  // Add state handling for toggle button
  if (toggleButton) {
    toggleButton.addEventListener('change', function() {
      handleButtonState('toggleButton', this.checked);
      if (window.velocityStateManager) {
        window.velocityStateManager.saveState();
      }
    });
  }

  // Add state handling for dark mode toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
      getUserInfo((user) => {
        _trackEvent("Dark Mode Button Clicked", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_dark_mode_button",
          new_mode: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
          ...user
        });
      });
    });
  }

  // Add state handling for settings button
  if (settingsButton) {
    settingsButton.addEventListener('click', function() {
      getUserInfo((user) => {
        _trackEvent("Settings Button Clicked", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_settings_button",
          ...user
        });
      });
    });
  }

  // Add state handling for like/dislike buttons
  const likeButton = document.getElementById('likeButton');
  const dislikeButton = document.getElementById('dislikeButton');

  if (likeButton) {
    likeButton.addEventListener('click', function() {
      getUserInfo((user) => {
        _trackEvent("Like Button Clicked", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_like_button",
          ...user
        });
      });
    });
  }

  if (dislikeButton) {
    dislikeButton.addEventListener('click', function() {
      getUserInfo((user) => {
        _trackEvent("Dislike Button Clicked", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_dislike_button",
          ...user
        });
      });
    });
  }

  // Add state handling for page transitions
  const backToInput = document.getElementById('backToInput');
  if (backToInput) {
    backToInput.addEventListener('click', function() {
      getUserInfo((user) => {
        _trackEvent("Back Button Clicked", {
          timestamp: new Date().toISOString(),
          platform: getSelectedPlatform(),
          style: getSelectedStyle(),
          entry_point: "phase1_back_button",
          ...user
        });
      });
    });
  }

  // Initialize state from storage
  if (window.velocityStateManager) {
    window.velocityStateManager.restoreState().then(stateRestored => {
      if (stateRestored) {
        // State was restored, update UI accordingly
        const state = window.velocityStateManager.getCurrentState();
        if (state) {
          // Restore button states
          if (state.buttonStates) {
            Object.entries(state.buttonStates).forEach(([buttonId, isActive]) => {
              handleButtonState(buttonId, isActive);
            });
          }

          // Restore page states
          if (state.pageStates) {
            Object.entries(state.pageStates).forEach(([pageId, isVisible]) => {
              handlePageState(pageId, isVisible);
            });
          }
        }
      }
    });
  }

  initializeAdditionalSettingsDropdowns();
});

function renderResponse(responseText) {
  const responsesGrid = document.querySelector('.responses-grid');
  if (!responsesGrid) return;

  // Clear previous responses including any skeleton loaders
  responsesGrid.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'response-card';

  const content = document.createElement('div');
  content.className = 'response-content';
  content.textContent = responseText;

  card.appendChild(content);
  responsesGrid.appendChild(card);

  // Restore the bottom action bar functionality
  const openInPlatformButton = document.getElementById("openInPlatformButton");
  if (openInPlatformButton) {
    openInPlatformButton.disabled = false;
  }

  // Reinitialize platform selector after rendering content
  if (typeof setupPlatformSelector === 'function') {
    setTimeout(() => {
      setupPlatformSelector();
      // Ensure the platform button has a working click handler
      ensurePlatformButtonWorks();
    }, 100); // Small delay to ensure DOM is fully updated
  } else {
    // If setup function isn't available, at least fix the button
    setTimeout(ensurePlatformButtonWorks, 100);
  }
}

// Function to start the tutorial if needed
function startTutorialIfNeeded() {
  chrome.storage.local.get(["tutorialShown", "firstTimeOpened", "isOnResponseView"], function (data) {
    // Only show tutorial if it's the first time opening the extension
    // AND we're not on the response view
    // AND the tutorial hasn't been shown yet
    if (!data.firstTimeOpened && !data.isOnResponseView && !data.tutorialShown) {
      // Mark that the extension has been opened
      chrome.storage.local.set({ firstTimeOpened: true });

      // Initialize the tutorial
      initializeTutorial();
    }
    // Otherwise, don't show the tutorial automatically
  });
}

function initializeTutorial(isManualStart = false) {
  chrome.storage.local.get(["userEmail", "lastTutorialStep", "token", "userId", "FreeUser", "userSavedPrompt"], function (authData) {
    let lastStep = authData.lastTutorialStep || 0;
    const isLoggedIn = !!(authData.token && authData.userId);
    const isFreeUser = authData.FreeUser === true;
    const userSavedPrompt = authData.userSavedPrompt || "";

    // First three steps are the same for all users - but now with automated actions
    let tutorialSteps = [
      {
        element: "#promptInput",
        intro: "Start by typing your prompt here.",
        position: "bottom",
        action: function() {
          // Auto-fill the prompt input with a default example - don't store it
          const promptInput = document.getElementById("promptInput");
          if (promptInput) {
            // Just set the value directly without storing it
            promptInput.value = "Create a detailed marketing plan for a new fitness app targeting busy professionals.";
          }
        }
      },
      {
        // STYLE BUTTONS - Tutorial step that highlights the Descriptive style button
        element: 'label[for="descriptive"]',
        intro: "Choose a style to shape your response.",
        position: "right",
        action: function() {
          // Auto-select the descriptive style
          const descriptiveRadio = document.getElementById("descriptive");
          if (descriptiveRadio) {
            descriptiveRadio.checked = true;
          }
        }
      },
      {
        element: "#sendButton",
        intro: 'Hit "Generate" to get results.',
        position: "top",
        action: function() {
          // Generate the enhanced prompt directly without delay
          setTimeout(() => {
            const promptInput = document.getElementById("promptInput");
            if (promptInput && promptInput.value.trim()) {
              // Get the user's actual input
              const userPrompt = promptInput.value.trim();

              // Generate the enhanced prompt
              const enhancedPrompt = generateEnhancedPrompt(userPrompt);

              // Store it for later use
              chrome.storage.local.set({
                "storedResponse": enhancedPrompt,
                "isGeneratingPrompt": false
              });
            }
          }, 1000);
        }
      },
      {
        element: "#insertButton",
        intro: "Click 'Insert here' to insert prompt in your current AI platform.",
        position: "bottom"
      },
      {
        element: ".platform-selector-container ",
        intro: "Choose which AI platform to open your prompt in.",
        position: "bottom"
      }
    ];

    // Add the appropriate final step based on login status
    if (isLoggedIn && !isFreeUser) {
      // If logged in and not a free user, show the profile button in the last step
      tutorialSteps.push({
        element: "#signupButton",
        intro: 'Access your profile and settings here.',
        position: "bottom",
      });
    } else if (isFreeUser) {
      // If free trial user, show login button
      tutorialSteps.push({
        element: "#loginStatusIndicator",
        intro: 'Your free trial is active. Click here to upgrade.',
        position: "bottom",
      });
    } else {
      // If not logged in, show the login button in the last step
      tutorialSteps.push({
        element: "#loginStatusIndicator",
        intro: 'Click here to login and get more credits.',
        position: "bottom",
      });
    }

    const tutorial = introJs().setOptions({
      showProgress: false, // Hide progress bar
      showBullets: false,
      exitOnOverlayClick: false,
      exitOnEsc: false,
      nextLabel: "Next",
      prevLabel: "Back", // Changed from "Prev" to "Back" to match the image
      doneLabel: "Finish",
      tooltipClass: "customTooltip",
      showButtons: true,
      positionPrecedence: ["right", "bottom", "top", "left"], // Preferred positioning order
      steps: tutorialSteps,
      // Custom tooltip position function to ensure tooltips are always visible
      positionPrecedence: ["right", "bottom", "top", "left"],
      tooltipPosition: function(targetElement, tooltipElement, position) {
        // Get the position of the target element
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();

        // Calculate available space in each direction
        const spaceAbove = targetRect.top;
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const spaceLeft = targetRect.left;
        const spaceRight = window.innerWidth - targetRect.right;

        // Determine best position based on available space
        if (position === "bottom" && spaceBelow < tooltipRect.height + 10) {
          return "top";
        } else if (position === "top" && spaceAbove < tooltipRect.height + 10) {
          return "bottom";
        } else if (position === "left" && spaceLeft < tooltipRect.width + 10) {
          return "right";
        } else if (position === "right" && spaceRight < tooltipRect.width + 10) {
          return "left";
        }

        return position; // Return original position if it fits
      }
    });

    // Add a beforechange handler to execute actions for each step
    tutorial.onbeforechange(function() {
      // Find the current step
      const currentStepIndex = tutorial._currentStep;
      const currentStep = tutorialSteps[currentStepIndex];

      // Execute the action for this step if it exists
      if (currentStep && typeof currentStep.action === 'function') {
        currentStep.action();
      }

      // Special handling for steps that need to show the response view
      if (currentStepIndex >= 3 && currentStepIndex <= 5) {
        // Check if we're transitioning to the response view steps
        const mainContent = document.getElementById("mainContent");
        const responsesWrapper = document.getElementById("responsesWrapper");

        if (mainContent && responsesWrapper) {
          // Only transition if we're moving forward in the tutorial (not back)
          // and if we're not already in the response view
          if (!responsesWrapper.classList.contains("visible") &&
              (tutorial._direction === "forward" || currentStepIndex === 3)) {

            // Check if we have a stored response
            chrome.storage.local.get(["storedResponse", "isGeneratingPrompt"], function(data) {
              if (data.storedResponse) {
                // We have a stored response, show it
                mainContent.classList.add("hidden");
                responsesWrapper.classList.remove("hidden");
                responsesWrapper.classList.add("visible");

                // Render the response
                renderResponse(data.storedResponse);

                // Make sure the platform selector is set up
                if (typeof setupPlatformSelector === 'function') {
                  setTimeout(setupPlatformSelector, 100);
                }
              } else if (data.isGeneratingPrompt) {
                // Still generating, show skeleton loader
                mainContent.classList.add("hidden");
                responsesWrapper.classList.remove("hidden");
                responsesWrapper.classList.add("visible");

                // Show skeleton loader using the existing implementation
                const responsesGrid = document.querySelector('.responses-grid');
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

                // Set up a check to update when generation completes
                checkForGeneratedPrompt();
              } else {
                // Generate the enhanced prompt directly
                const promptInput = document.getElementById("promptInput");
                if (promptInput && promptInput.value.trim()) {
                  // Use the user's actual input
                  const enhancedPrompt = generateEnhancedPrompt(promptInput.value.trim());

                  // Store it for later use
                  chrome.storage.local.set({
                    "storedResponse": enhancedPrompt,
                    "isGeneratingPrompt": false
                  });

                  // Show the response view
                  mainContent.classList.add("hidden");
                  responsesWrapper.classList.remove("hidden");
                  responsesWrapper.classList.add("visible");

                  // Render the response directly
                  renderResponse(enhancedPrompt);
                } else {
                  // No input, use a default prompt
                  const defaultPrompt = `# Sample Enhanced Prompt

## Key Points
- This is a sample enhanced prompt
- Please enter your own prompt in the input field
- Your prompt will be enhanced with additional structure
- The enhanced prompt will be optimized for your selected AI platform

## Additional Suggestions
1. Be specific about what you want
2. Include relevant context
3. Specify your audience if applicable
4. Ask for the format you prefer

## Ready to Use
Your enhanced prompt is ready to be used with your preferred AI platform.`;

                  // Store the default prompt
                  chrome.storage.local.set({
                    "storedResponse": defaultPrompt,
                    "isGeneratingPrompt": false
                  });

                  // Show the response view
                  mainContent.classList.add("hidden");
                  responsesWrapper.classList.remove("hidden");
                  responsesWrapper.classList.add("visible");

                  // Render the response directly
                  renderResponse(defaultPrompt);
                }
              }
            });
          }
        }
      }
    });

    // Initialize the tutorial with a slight delay to ensure DOM is ready
    setTimeout(() => {
      // Make sure the appropriate buttons are visible during the tutorial
      const loginStatusIndicator = document.getElementById("loginStatusIndicator");
      const signupButton = document.getElementById("signupButton");

      // Check if user is logged in to determine which button to show
      chrome.storage.local.get(["token", "userId"], function(data) {
        const isLoggedIn = !!(data.token && data.userId);

        if (loginStatusIndicator) {
          // Save original display state to restore later if needed
          originalLoginDisplay = loginStatusIndicator.style.display;

          // Show login button only if user is not logged in
          loginStatusIndicator.style.display = isLoggedIn ? "none" : "flex";
        }

        if (signupButton) {
          // Save original display state
          originalSignupDisplay = signupButton.style.display;

          // Make sure profile button is visible if user is logged in
          if (isLoggedIn) {
            signupButton.style.display = "flex";
          }
        }

        // Start the tutorial after ensuring the right buttons are visible
        try {
          tutorial.start();
          
          // Wait a bit for the tutorial to initialize, then go to the specific step
          setTimeout(() => {
            if (tutorial.goToStep && typeof tutorial.goToStep === 'function') {
              tutorial.goToStep(lastStep + 1);
            }
            
            // Initialize step indicator after tutorial starts
            updateTutorialUI(lastStep, tutorialSteps.length);
          }, 100);
        } catch (error) {
          console.error("Error starting tutorial:", error);
          // Fallback: just start the tutorial normally
          tutorial.start();
        }

        // Set up the change handler for the tutorial
        tutorial.onchange(function() {
          handleTutorialChange(tutorial, tutorialSteps);
        });

        // Initialize step indicator after tutorial starts
        updateTutorialUI(lastStep, tutorialSteps.length);
      });

      // Override the onexit handler to also handle button visibility and view state
      tutorial.onexit(function() {
        // Remove the disable class when the tutorial exits
        document.body.classList.remove("disable-pointer-events");
        const activeElement = document.querySelector(".allow-pointer-events");
        if (activeElement) {
          activeElement.classList.remove("allow-pointer-events");
        }

        // If this was a manual tutorial start, restore the user's original prompt
        if (isManualStart && userSavedPrompt) {
          const promptInput = document.getElementById("promptInput");
          if (promptInput) {
            promptInput.value = userSavedPrompt;
          }
          // Clear the saved prompt
          chrome.storage.local.remove(["userSavedPrompt"]);
        }

        // Set tutorialShown to true after the tutorial is completed
        chrome.storage.local.set({ tutorialShown: true }, function() {
          // Add GA4 tracking here:
          if (typeof ga === 'function') {
            ga('send', 'event', 'tutorial', 'watched');
          }

          // Handle button visibility after tutorial completes
          if (!document.querySelector(".introjs-overlay")) {
            // Check user auth state to determine which buttons to show
            chrome.storage.local.get(["token", "userId", "FreeUser"], function(data) {
              const isLoggedIn = !!(data.token && data.userId);
              const isFreeUser = data.FreeUser === true;

              // Get references to both buttons
              const loginStatusIndicator = document.getElementById("loginStatusIndicator");
              const signupButton = document.getElementById("signupButton");

              // Update button visibility based on login status
              if (loginStatusIndicator) {
                if (isLoggedIn && !isFreeUser) {
                  // Hide login button for logged-in paid users
                  loginStatusIndicator.style.display = "none";
                } else if (isFreeUser) {
                  // Show login button for free trial users
                  loginStatusIndicator.style.display = "flex";
                  loginStatusIndicator.querySelector(".status-text").textContent = "Free Trial";
                  loginStatusIndicator.className = "login-status-indicator free-trial";
                } else {
                  // Show login button for free trial ended users or not logged in users
                  loginStatusIndicator.style.display = "flex";
                  loginStatusIndicator.querySelector(".status-text").textContent = "Login";
                  loginStatusIndicator.className = "login-status-indicator logged-out";
                }

                // Remove any highlight effects
                loginStatusIndicator.classList.remove("highlight-pulse");
              }

              if (signupButton) {
                // Show profile button ONLY for logged in paid users
                signupButton.style.display = (isLoggedIn && !isFreeUser) ? "flex" : "none";

                // Remove any highlight effects
                signupButton.classList.remove("highlight-pulse");
              }

              // Reset the UI state if we're in the response view
              const mainContent = document.getElementById("mainContent");
              const responsesWrapper = document.getElementById("responsesWrapper");

              if (mainContent && responsesWrapper && responsesWrapper.classList.contains("visible")) {
                // Go back to the input view
                responsesWrapper.classList.remove("visible");
                setTimeout(() => {
                  responsesWrapper.classList.add("hidden");
                  mainContent.classList.remove("hidden");

                  // Only clear the prompt input if this is not a manual tutorial start
                  // or if we don't have a saved prompt to restore
                  if (!isManualStart || !userSavedPrompt) {
                    const promptInput = document.getElementById("promptInput");
                    if (promptInput) {
                      promptInput.value = "";
                    }
                  }
                }, 300);
              }
            });
          }
        });
      });

// Helper function to update the tutorial UI
function updateTutorialUI(lastStep, totalSteps) {
  const tooltipHeader = document.querySelector('.introjs-tooltip-header');
  if (tooltipHeader) {
    // Set data attributes for step info
    tooltipHeader.setAttribute('data-step', lastStep + 1);
    tooltipHeader.setAttribute('data-total-steps', totalSteps);

    // Create progress bar for header
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'header-progress';
    progressBarContainer.style.width = '65%';
    progressBarContainer.style.height = '6px';
    progressBarContainer.style.background = '#eaeaea';
    progressBarContainer.style.borderRadius = '3px';
    progressBarContainer.style.position = 'relative';
    progressBarContainer.style.marginBottom = '10px';

    // Create progress indicator bar
    const progressBar = document.createElement('div');
    progressBar.className = 'header-progress-bar';
    progressBar.style.height = '6px';
    progressBar.style.background = '#00c8ed';
    progressBar.style.borderRadius = '3px';
    progressBar.style.position = 'absolute';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = `${((lastStep + 1) / totalSteps) * 100}%`;
    progressBar.style.transition = 'width 0.3s ease';

    // Create logo indicator
    const logoIndicator = document.createElement('div');
    logoIndicator.className = 'header-progress-logo';
    logoIndicator.style.width = '24px';
    logoIndicator.style.height = '24px';
    logoIndicator.style.backgroundImage = 'url("./assets/Velocity.png")';
    logoIndicator.style.backgroundSize = 'contain';
    logoIndicator.style.backgroundRepeat = 'no-repeat';
    logoIndicator.style.backgroundPosition = 'center';
    logoIndicator.style.position = 'absolute';
    logoIndicator.style.top = '-9px';
    logoIndicator.style.transform = 'translateX(-50%)';
    logoIndicator.style.left = `${((lastStep + 1) / totalSteps) * 100}%`;
    logoIndicator.style.transition = 'left 0.3s ease';

    // Add progress bar to header
    progressBarContainer.appendChild(progressBar);
    progressBarContainer.appendChild(logoIndicator);
    tooltipHeader.insertBefore(progressBarContainer, tooltipHeader.firstChild);

    // Move the skip button into the header for proper alignment
    const skipButton = document.querySelector('.introjs-skipbutton');
    if (skipButton && !tooltipHeader.contains(skipButton)) {
      tooltipHeader.appendChild(skipButton);
    }
  }

  // Ensure tooltip is within viewport
  const tooltipContainer = document.querySelector('.introjs-tooltip');
  if (tooltipContainer) {
    const rect = tooltipContainer.getBoundingClientRect();
    if (rect.left < 0) {
      tooltipContainer.style.left = '5px';
    } else if (rect.right > window.innerWidth) {
      tooltipContainer.style.left = (window.innerWidth - rect.width - 5) + 'px';
    }

    if (rect.top < 0) {
      tooltipContainer.style.top = '5px';
    } else if (rect.bottom > window.innerHeight) {
      tooltipContainer.style.top = (window.innerHeight - rect.height - 5) + 'px';
    }
  }

  // Add animation to buttons that might already be present
  const buttons = document.querySelectorAll('.introjs-button');
  buttons.forEach(button => {
    if (!button.hasButtonAnimation) {
      button.hasButtonAnimation = true;
      button.addEventListener("click", function() {
        this.classList.add("clicked");
        setTimeout(() => {
          this.classList.remove("clicked");
        }, 300);
      });
    }
  });
}

// Helper function to handle tutorial step changes
function handleTutorialChange(tutorial, tutorialSteps) {
  // This handler runs after onbeforechange
  const currentStep = tutorial._currentStep;
  const totalSteps = tutorialSteps.length - 1;

  // Update the progress bar
  const progressBar = document.querySelector('.header-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${((currentStep + 1) / (totalSteps + 1)) * 100}%`;
  }

  // Update the logo position and add rotation animation
  const logoIndicator = document.querySelector('.header-progress-logo');
  if (logoIndicator) {
    // Remove existing animation before applying new one
    logoIndicator.style.animation = 'none';

    // Force a reflow to restart animation
    void logoIndicator.offsetWidth;

    // Update position and apply animation
    logoIndicator.style.left = `${((currentStep + 1) / (totalSteps + 1)) * 100}%`;
    logoIndicator.style.animation = 'spinProgress 0.5s ease-out';
  }

  // Handle special cases for different steps
  if (currentStep >= 3 && currentStep <= 5) {
    // For steps 4-6 (response view steps), ensure we're in the response view
    const mainContent = document.getElementById("mainContent");
    const responsesWrapper = document.getElementById("responsesWrapper");

    if (mainContent && responsesWrapper) {
      // Make sure we're in the response view
      if (!responsesWrapper.classList.contains("visible")) {
        mainContent.classList.add("hidden");
        responsesWrapper.classList.remove("hidden");
        responsesWrapper.classList.add("visible");
      }
    }
  }

  // Check if we're on the last step to highlight the appropriate button
  if (currentStep === totalSteps) {
    // Determine which button to highlight based on login status
    chrome.storage.local.get(["token", "userId", "FreeUser"], function(data) {
      const isLoggedIn = !!(data.token && data.userId);
      const isFreeUser = data.FreeUser === true;

      if (isLoggedIn && !isFreeUser) {
        // Highlight the profile button if user is logged in and not a free user
        const signupButton = document.getElementById("signupButton");
        if (signupButton) {
          signupButton.classList.add("highlight-pulse");
          // Make sure it's visible
          signupButton.style.display = "flex";
        }
      } else {
        // Highlight the login button for free users or not logged in users
        const loginStatusIndicator = document.getElementById("loginStatusIndicator");
        if (loginStatusIndicator) {
          // Add a pulsing effect to the login button
          loginStatusIndicator.classList.add("highlight-pulse");

          if (isFreeUser) {
            // For free trial users
            loginStatusIndicator.className = "login-status-indicator free-trial highlight-pulse";
            loginStatusIndicator.querySelector(".status-text").textContent = "Free Trial";
          } else {
            // For free trial ended or not logged in users
            loginStatusIndicator.className = "login-status-indicator logged-out blue highlight-pulse";
            loginStatusIndicator.querySelector(".status-text").textContent = "Login";
          }

          // Make sure it's visible
          loginStatusIndicator.style.display = "flex";
        }
      }
    });
  } else {
    // Remove highlight effects from both buttons when not on the last step
    const loginStatusIndicator = document.getElementById("loginStatusIndicator");
    if (loginStatusIndicator) {
      loginStatusIndicator.classList.remove("highlight-pulse");
    }

    const signupButton = document.getElementById("signupButton");
    if (signupButton) {
      signupButton.classList.remove("highlight-pulse");
    }
  }

  // Ensure the tooltip is properly positioned
  const tooltipContainer = document.querySelector('.introjs-tooltip');
  if (tooltipContainer) {
    // Make sure tooltip is within viewport
    const rect = tooltipContainer.getBoundingClientRect();
    if (rect.left < 0) {
      tooltipContainer.style.left = '5px';
    } else if (rect.right > window.innerWidth) {
      tooltipContainer.style.left = (window.innerWidth - rect.width - 5) + 'px';
    }

    if (rect.top < 0) {
      tooltipContainer.style.top = '5px';
    } else if (rect.bottom > window.innerHeight) {
      tooltipContainer.style.top = (window.innerHeight - rect.height - 5) + 'px';
    }
  }
}
    }, 50); // Small delay to ensure DOM is ready
  });
}

// Handle platform selection dropdown
function setupPlatformSelector() {
  const platformSelector = document.querySelector('.platform-selector');
  const platformName = document.querySelector('.platform-name');
  const copyResponseButton = document.getElementById('copyResponseButton');
  const openInPlatformButton = document.getElementById('openInPlatformButton');

  // Check if elements exist
  if (!platformSelector || !platformName || !openInPlatformButton) {
    //// // console.log("[Velocity] Platform selector elements not found");
    //// // console.log("[Velocity Debug] platformSelector:", platformSelector);
    //// // console.log("[Velocity Debug] platformName:", platformName);
    //// // console.log("[Velocity Debug] openInPlatformButton:", openInPlatformButton);
    return;
  }

  // Clear any existing click handlers from the platform button before cloning
  if (typeof clearButtonClickHandlers === 'function') {
    clearButtonClickHandlers('openInPlatformButton', true);
  }

  // Remove any existing event listeners to prevent duplicates
  const newPlatformSelector = platformSelector.cloneNode(true);
  platformSelector.parentNode.replaceChild(newPlatformSelector, platformSelector);

  // Re-query elements after DOM updates
  const updatedPlatformName = document.querySelector('.platform-name');
  const updatedOpenInPlatformButton = document.getElementById('openInPlatformButton');


  // Platform options
  const platforms = [
    { name: 'Chat GPT', icon: './assets/Chatgpt-icon.png', url: 'https://chat.openai.com', key: 'openai' },
    { name: 'Claude', icon: './assets/Claude-icon.png', url: 'https://claude.ai/new', key: 'anthropic' },
    { name: 'Gemini', icon: './assets/Gemini-icon.png', url: 'https://gemini.google.com', key: 'google' },
    { name: 'Perplexity', icon: './assets/Perplexity-icon.png', url: 'https://www.perplexity.ai', key: 'perplexity' },
    { name: 'Grok', icon: './assets/Grok-icon.png', url: 'https://grok.com', key: 'grok' },
    { name: 'Gamma', icon: './assets/Gamma-icon.png', url: 'https://gamma.app/create/generate', key: 'gamma' },
    { name: 'Vercel V0', icon: './assets/VercelV0-icon.png', url: 'https://v0.dev', key: 'vercel' },
    { name: 'Bolt', icon: './assets/Bolt-icon.png', url: 'https://bolt.new', key: 'bolt' },
    { name: 'Mistral', icon: './assets/Mistral-icon.png', url: 'https://chat.mistral.ai/chat', key: 'mistral' },
    { name: 'Lovable', icon: './assets/Lovable-icon.png', url: 'https://lovable.dev', key: 'lovable' },
    { name: 'Replit', icon: './assets/Replit-icon.png', url: 'https://replit.com', key: 'replit' },
    { name: 'Suno', icon: './assets/Suno-icon.png', url: 'https://suno.com', key: 'suno' }
  ];

  // Try to get the selected platform from the UI or Chrome storage
  let selectedPlatform = platforms[0];

  // Check if there's a suggested platform in Chrome storage
  chrome.storage.local.get(["suggestedLLM"], function(data) {
    if (data.suggestedLLM) {
      // // console.log("[DEBUG] Found suggested LLM in Chrome storage:", data.suggestedLLM);

      // Normalize the suggested LLM name to match our platform keys
      const normalizedLLM = data.suggestedLLM.toLowerCase().trim();

      // Find the matching platform
      const matchedPlatform = platforms.find(p => p.key === normalizedLLM);

      if (matchedPlatform) {
        // // console.log("[DEBUG] Matched suggested LLM to platform:", matchedPlatform.name);
        selectedPlatform = matchedPlatform;

        // Update the UI to show the suggested platform
        if (updatedPlatformName) {
          updatedPlatformName.innerHTML = `
            <img src="${selectedPlatform.icon}" alt="${selectedPlatform.name}" class="platform-icon">
            <span>${selectedPlatform.name}</span>
            <img src="./assets/downarrow.png" alt="Open LLM selection" class="dropdown-arrow">
          `;
        }

        // Update the button's dataset
        if (updatedOpenInPlatformButton) {
          updatedOpenInPlatformButton.dataset.platformUrl = selectedPlatform.url;
          updatedOpenInPlatformButton.dataset.platformName = selectedPlatform.name;
          updatedOpenInPlatformButton.dataset.platformKey = selectedPlatform.key;
        }
      }
    } else {
      // If no suggested platform in storage, try to get it from the UI
      if (updatedPlatformName && updatedPlatformName.querySelector('img')) {
        const platformIcon = updatedPlatformName.querySelector('img').getAttribute('src');
        const matchedPlatform = platforms.find(p => p.icon === platformIcon);
        if (matchedPlatform) {
          selectedPlatform = matchedPlatform;
        }
      }
    }
  });

  // Initialize platform URL and name in button's dataset if not already set
  if (updatedOpenInPlatformButton) {
    // Always set the platform data to ensure it's current
    updatedOpenInPlatformButton.dataset.platformUrl = selectedPlatform.url;
    updatedOpenInPlatformButton.dataset.platformName = selectedPlatform.name;
    updatedOpenInPlatformButton.dataset.platformKey = selectedPlatform.key;

    // Make sure the button is enabled
    updatedOpenInPlatformButton.disabled = false;
  }

  // Create dropdown for platform selection
  newPlatformSelector.addEventListener('click', function(event) {
    // Ignore clicks on the send button
    if (event.target === updatedOpenInPlatformButton ||
        (updatedOpenInPlatformButton && updatedOpenInPlatformButton.contains(event.target))) {
      return;
    }

    // Check if dropdown already exists
    const existingDropdown = document.querySelector('.platform-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'platform-dropdown';

    // Position the dropdown ABOVE the selector instead of below it
    const rect = newPlatformSelector.getBoundingClientRect();
    // Position the dropdown at the top of the selector
    dropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';

    // Add platform options
    platforms.forEach(platform => {
      const option = document.createElement('div');
      option.className = 'llm-option';

      option.innerHTML = `
        <img src="${platform.icon}" alt="${platform.name}">
        <span>${platform.name}</span>
      `;

      option.addEventListener('click', function() {
        selectedPlatform = platform;

        // Update platform display in selector
        updatedPlatformName.innerHTML = `
          <img src="${platform.icon}" alt="${platform.name}" class="platform-icon">
          <span>${platform.name}</span>
          <img src="./assets/downarrow.png" alt="Open LLM selection" class="dropdown-arrow">
        `;

        // Store platform details in the button's dataset for use in click handler
        if (updatedOpenInPlatformButton) {
          updatedOpenInPlatformButton.dataset.platformUrl = platform.url;
          updatedOpenInPlatformButton.dataset.platformName = platform.name;
          updatedOpenInPlatformButton.dataset.platformKey = platform.key;

          // Log for debugging
          // // console.log(`[DEBUG] Platform selected: ${platform.name}, URL: ${platform.url}, Key: ${platform.key}`);

          // Track the event if mixpanel is available
          if (typeof trackEvent === "function") {
            trackEvent("LLM Selected From Dropdown", {
              llm_provider: platform.name,
              url: platform.url
            });
          }
        }

        dropdown.remove();
      });

      dropdown.appendChild(option);
    });

    document.body.appendChild(dropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
      if (!newPlatformSelector.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  });

  // Handle copy button click
  if (copyResponseButton) {
    // Remove existing event listeners to avoid duplicates
    const newCopyButton = copyResponseButton.cloneNode(true);
    copyResponseButton.parentNode.replaceChild(newCopyButton, copyResponseButton);

    newCopyButton.addEventListener('click', function() {
      const responseContent = document.querySelector('.response-content');
      if (responseContent) {
        navigator.clipboard.writeText(responseContent.textContent)
          .then(() => {
            // Show copied feedback using the copy-button styles
            this.classList.add("copied");

            setTimeout(() => {
              this.classList.remove("copied");
            }, 2000);

            // Track the copy event if mixpanel is available
            if (typeof trackEvent === "function") {
              trackEvent("Copied Prompt", {
                type: "Enhanced",
                prompt_length: responseContent.textContent.length,
                platform: selectedPlatform ? selectedPlatform.name : 'none'
              });
            }
          })
      }
    });
  }

  //// // console.log('[Velocity] Platform selector setup complete');

  // Ensure the platform button has a working click handler
  ensurePlatformButtonWorks();
}

// Export the function for use in popup.js if needed
if (typeof window !== 'undefined') {
  window.setupPlatformSelector = setupPlatformSelector;
  window.ensurePlatformButtonWorks = ensurePlatformButtonWorks;
}

// Call ensurePlatformButtonWorks when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
  // // console.log("[DEBUG] DOMContentLoaded event fired in phase1.js at:", new Date().toISOString());

  // Set a short delay to ensure the DOM is ready
  setTimeout(() => {
    // // console.log("[DEBUG] Calling ensurePlatformButtonWorks from DOMContentLoaded timeout");
    ensurePlatformButtonWorks();
  }, 500);
});

// Function to check and fix the platform button click handler
function ensurePlatformButtonWorks() {
  // // console.log("[DEBUG] ensurePlatformButtonWorks called at:", new Date().toISOString());

  const openInPlatformButton = document.getElementById("openInPlatformButton");

  if (!openInPlatformButton) {
    // console.error("[DEBUG] Platform button not found");
    return;
  }

  // // console.log("[DEBUG] Button found, checking if it needs click handler setup");

  // Check if the button already has the prompt injection click handler
  if (openInPlatformButton._hasPromptInjectionClickHandler) {
    // console.log("[DEBUG] Platform button already has prompt injection click handler, skipping setup");
    return;
  }

  // Let the promptInjectionManager handle the click events
  // Don't interfere with the button setup
  if (typeof setupOpenInPlatformButton === 'function') {
    // console.log("[DEBUG] Setting up platform button click handler from phase1.js");
    setupOpenInPlatformButton("openInPlatformButton", {
      trackEvent: typeof trackEvent === 'function' ? trackEvent : null,
      debugMode: true
    });
  } else {
    // console.log("[DEBUG] Platform button setup skipped - setupOpenInPlatformButton function not available");
  }
}

// Function to simulate the generate response for the tutorial
function simulateGenerateResponse() {
  // Get the main content and responses wrapper elements
  const mainContent = document.getElementById("mainContent");
  const responsesWrapper = document.getElementById("responsesWrapper");

  if (!mainContent || !responsesWrapper) {
    // console.error("[Tutorial] Could not find main content or responses wrapper elements");
    return;
  }

  // Get the user's input
  const promptInput = document.getElementById("promptInput");
  let enhancedPrompt;

  if (promptInput && promptInput.value.trim()) {
    // Generate an enhanced prompt based on the user's input
    enhancedPrompt = generateEnhancedPrompt(promptInput.value.trim());
  } else {
    // Fallback to a default prompt if no user input is available
    enhancedPrompt = `# Sample Enhanced Prompt

## Key Points
- This is a sample enhanced prompt
- Please enter your own prompt in the input field
- Your prompt will be enhanced with additional structure
- The enhanced prompt will be optimized for your selected AI platform

## Additional Suggestions
1. Be specific about what you want
2. Include relevant context
3. Specify your audience if applicable
4. Ask for the format you prefer

## Ready to Use
Your enhanced prompt is ready to be used with your preferred AI platform.`;
  }

  // Store the enhanced prompt directly as storedResponse
  chrome.storage.local.set({
    "storedResponse": enhancedPrompt
  });

  // Set the response header
  const responsesHeader = document.querySelector(".responses-header");
  if (responsesHeader) {
    responsesHeader.innerHTML = "<h2>Your prompt is ready!</h2>";
  }

  // Render the response
  renderResponse(enhancedPrompt);

  // Transition to the response view
  mainContent.classList.add("hidden");
  responsesWrapper.classList.remove("hidden");
  responsesWrapper.classList.add("visible");

  // Set up the platform selector
  if (typeof setupPlatformSelector === 'function') {
    setTimeout(setupPlatformSelector, 100);
  }
}

// Function to start background generation of enhanced prompt (legacy function, kept for compatibility)
function startBackgroundGeneration() {
  // // console.log("[Velocity] Starting background generation of enhanced prompt");

  // Get the prompt input value
  const promptInput = document.getElementById("promptInput");
  if (!promptInput || !promptInput.value.trim()) {
    // console.error("[Velocity] No prompt input found or empty prompt");
    return;
  }

  // Store that we're generating in the background
  chrome.storage.local.set({
    "isGeneratingPrompt": true
  });

  // Get the user's actual input
  const userPrompt = promptInput.value.trim();

  // Generate the enhanced prompt using the user's actual input
  const enhancedPrompt = generateEnhancedPrompt(userPrompt);

  chrome.storage.local.set({
    "storedResponse": enhancedPrompt,
    "isGeneratingPrompt": false
  });

  // Check if we're already on the response page and update it if needed
  const responsesWrapper = document.getElementById("responsesWrapper");
  if (responsesWrapper && responsesWrapper.classList.contains("visible")) {
    // If we're already on the response page, update it with the generated content
    updateResponseWithGeneratedPrompt(enhancedPrompt);
  }
}

// Function to generate an enhanced prompt based on user input
function generateEnhancedPrompt(userPrompt) {
  // This is a simple implementation that formats the user's input
  // In a real implementation, this would call an API

  // Extract a title from the prompt (first 5-7 words)
  const words = userPrompt.split(' ');
  const titleWords = words.slice(0, Math.min(7, words.length));
  const title = titleWords.join(' ');

  // Create a formatted enhanced prompt
  return `# ${title.charAt(0).toUpperCase() + title.slice(1)}

## Key Points
- ${userPrompt}
- Enhanced with additional structure and formatting
- Organized for better readability
- Optimized for your selected AI platform

## Additional Suggestions
1. Consider adding specific examples
2. Include relevant context
3. Ask for the format you prefer
4. Specify your audience if applicable

## Ready to Use
Your enhanced prompt is ready to be used with your preferred AI platform.`;
}

// Function to update the response view with the generated prompt
function updateResponseWithGeneratedPrompt(enhancedPrompt) {
  // If enhancedPrompt is provided directly, use it
  if (enhancedPrompt) {
    // Set the response header
    const responsesHeader = document.querySelector(".responses-header");
    if (responsesHeader) {
      responsesHeader.innerHTML = "<h2>Your prompt is ready!</h2>";
    }

    // Render the response
    renderResponse(enhancedPrompt);

    // Set up the platform selector
    if (typeof setupPlatformSelector === 'function') {
      setTimeout(setupPlatformSelector, 100);
    }
  } else {
    // Fallback to checking storedResponse if no prompt is provided directly
    chrome.storage.local.get(["storedResponse"], function(data) {
      if (data.storedResponse) {
        // Set the response header
        const responsesHeader = document.querySelector(".responses-header");
        if (responsesHeader) {
          responsesHeader.innerHTML = "<h2>Your prompt is ready!</h2>";
        }

        // Render the response
        renderResponse(data.storedResponse);

        // Set up the platform selector
        if (typeof setupPlatformSelector === 'function') {
          setTimeout(setupPlatformSelector, 100);
        }
      } else {
        // If no prompt is available, show a message
        const responsesGrid = document.querySelector('.responses-grid');
        if (responsesGrid) {
          responsesGrid.innerHTML = '<div class="response-card"><div class="response-content">No prompt available. Please try again.</div></div>';
        }
      }
    });
  }
}

// Function to initialize settings functionality
function initializeSettings() {
  // Get DOM elements
  const settingsButton = document.getElementById("settingsButton");
  const settingsWrapper = document.getElementById("settingsWrapper");
  const mainContent = document.getElementById("mainContent");
  const responsesWrapper = document.getElementById("responsesWrapper");
  const wordCountSlider = document.getElementById("wordCountSlider");
  const wordCountDisplay = document.querySelector(".word-count-display");
  const applySettingsButton = document.getElementById("applySettingsButton");
  const additionalSettingButton = document.getElementById("additionalSettingButton");
  const additionalSettingsSection = document.getElementById("additionalSettingsSection");
  const backFromAdditionalSettings = document.getElementById("backFromAdditionalSettings");

  // Load saved settings
  loadSettings();

  // Add event listener to settings button
  if (settingsButton) {
    settingsButton.addEventListener("click", function() {
      const isSettingsVisible = settingsWrapper.classList.contains("visible") ||
                               !settingsWrapper.classList.contains("hidden");

      if (isSettingsVisible) {
        // If settings are visible, hide them and show main content
        settingsWrapper.classList.remove("visible");

        // Make sure additional settings are hidden
        if (additionalSettingsSection) {
          additionalSettingsSection.classList.remove("visible");
          additionalSettingsSection.classList.add("hidden");

          // Reset the additionalSettingButton text
          if (additionalSettingButton) {
            additionalSettingButton.textContent = "Additional Setting";
          }

          // Remove margin-bottom from settings-actions
          const settingsActions = document.querySelector(".settings-actions");
          if (settingsActions) {
            settingsActions.style.marginBottom = "";
          }
        }

        setTimeout(() => {
          settingsWrapper.classList.add("hidden");

          // Show main content
          mainContent.classList.remove("hidden");

          // Update info button visibility
          checkAndUpdateInfoButtonVisibility();

          // Save state using the state manager
          if (window.velocityStateManager) {
            window.velocityStateManager.saveState();
          }

          // Save settings view state to chrome.storage
          saveSettingsViewState(false, false);
        }, 300);
      } else {
        // If settings are not visible, hide main content and responses wrapper
        mainContent.classList.add("hidden");
        responsesWrapper.classList.add("hidden");

        // Show settings wrapper
        settingsWrapper.classList.remove("hidden");
        settingsWrapper.classList.add("visible");

        // Make sure additional settings are hidden initially
        if (additionalSettingsSection) {
          additionalSettingsSection.classList.remove("visible");
          additionalSettingsSection.classList.add("hidden");
        }

        // Update info button visibility
        checkAndUpdateInfoButtonVisibility();

        // Save state using the state manager
        if (window.velocityStateManager) {
          window.velocityStateManager.saveState();
        }

        // Save settings view state to chrome.storage
        saveSettingsViewState(true, false);
      }
    });
  }

  // Add event listener to additional settings button
  if (additionalSettingButton && additionalSettingsSection) {
    additionalSettingButton.addEventListener("click", function() {
      // Check if additional settings are already visible
      const isAdditionalSettingsVisible = additionalSettingsSection.classList.contains("visible");

      if (isAdditionalSettingsVisible) {
        // If visible, act as a back button
        hideAdditionalSettings();
        // Change button text back to "Additional Setting"
        additionalSettingButton.textContent = "Additional Setting";

        // Save the state to chrome.storage
        saveSettingsViewState(true, false);
      } else {
        // If hidden, show additional settings
        // Show additional settings section
        additionalSettingsSection.classList.remove("hidden");

        // Get the settings wrapper element
        const settingsWrapper = document.getElementById("settingsWrapper");

        // Add margin-bottom to settings-actions
        const settingsActions = document.querySelector(".settings-actions");
        if (settingsActions) {
          settingsActions.style.marginBottom = "25px";
        }

        // Use setTimeout to allow the display:none to be removed before animating
        setTimeout(() => {
          additionalSettingsSection.classList.add("visible");

          // Scroll to the additional settings section after it becomes visible
          setTimeout(() => {
            // Scroll the entire settings wrapper to show the additional settings
            if (settingsWrapper) {
              const headerHeight = document.querySelector(".settings-header").offsetHeight;
              const additionalSettingsTop = additionalSettingsSection.offsetTop;
              settingsWrapper.scrollTo({
                top: additionalSettingsTop - headerHeight - 20,
                behavior: 'smooth'
              });
            }
          }, 100);

          // Change button text to "Back"
          additionalSettingButton.textContent = "Back";

          // Save the state to chrome.storage
          saveSettingsViewState(true, true);
        }, 10);
      }
    });
  }

  // Function to hide additional settings
  function hideAdditionalSettings() {
    // Hide additional settings section
    additionalSettingsSection.classList.remove("visible");

    // Get the settings wrapper element
    const settingsWrapper = document.getElementById("settingsWrapper");

    // Remove margin-bottom from settings-actions
    const settingsActions = document.querySelector(".settings-actions");
    if (settingsActions) {
      settingsActions.style.marginBottom = "";
    }

    // Scroll back to the top of the settings
    if (settingsWrapper) {
      settingsWrapper.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    // Use setTimeout to allow the animation to complete before adding display:none
    setTimeout(() => {
      additionalSettingsSection.classList.add("hidden");

      // Save the state to chrome.storage
      saveSettingsViewState(true, false);
    }, 300);
  }

  // Helper function to save settings view state
  function saveSettingsViewState(isSettingsVisible, isAdditionalSettingsVisible) {
    chrome.storage.local.get(["settings"], function(result) {
      const settings = result.settings || {};

      // Update view state
      settings.isSettingsVisible = isSettingsVisible;
      settings.isAdditionalSettingsVisible = isAdditionalSettingsVisible;

      // Save updated settings
      chrome.storage.local.set({ settings: settings });
    });
  }

  // Add event listener to back button in additional settings
  if (backFromAdditionalSettings && additionalSettingsSection) {
    backFromAdditionalSettings.addEventListener("click", function() {
      // Hide additional settings
      hideAdditionalSettings();

      // Also reset the additionalSettingButton text
      if (additionalSettingButton) {
        additionalSettingButton.textContent = "Additional Setting";
      }

      // Save settings view state to chrome.storage
      saveSettingsViewState(true, false);
    });
  }

  // Add event listener to word count slider
  if (wordCountSlider && wordCountDisplay) {
    wordCountSlider.addEventListener("input", function() {
      wordCountDisplay.textContent = this.value + " words";
    });
  }

  // Add event listener to apply button
  if (applySettingsButton) {
    applySettingsButton.addEventListener("click", async function() {
      // console.log('[Velocity Apply] 🔄 Apply button clicked - saving settings locally and to server');

      // Save settings locally first
      saveSettings();

      // Also save preferences to server (non-blocking)
      try {
        await savePreferencesToServerSilently();
      } catch (error) {
        console.error('[Velocity Apply] ❌ Failed to save preferences to server:', error);
        // Show error notification but don't block the UI
        showPreferenceNotification('Failed to sync settings to cloud', 'error');
      }

      // Remove margin-bottom from settings-actions
      const settingsActions = document.querySelector(".settings-actions");
      if (settingsActions) {
        settingsActions.style.marginBottom = "";
      }

      // Hide settings wrapper
      settingsWrapper.classList.remove("visible");

      // Make sure additional settings are hidden
      if (additionalSettingsSection) {
        additionalSettingsSection.classList.remove("visible");
        additionalSettingsSection.classList.add("hidden");

        // Reset the additionalSettingButton text
        if (additionalSettingButton) {
          additionalSettingButton.textContent = "Additional Setting";
        }
      }

      setTimeout(() => {
        settingsWrapper.classList.add("hidden");

        // Show main content
        mainContent.classList.remove("hidden");

        // Update info button visibility
        checkAndUpdateInfoButtonVisibility();

        // Save state using the state manager
        if (window.velocityStateManager) {
          window.velocityStateManager.saveState();
        }

        // Save settings view state to chrome.storage
        saveSettingsViewState(false, false);
      }, 300);
    });
  }
}

// Function to save settings
function saveSettings() {
  const wordCountSlider = document.getElementById("wordCountSlider");
  const customInstructions = document.getElementById("customInstructions");
  const templateSelector = document.getElementById("templateSelector");
  const languageSelector = document.getElementById("languageSelector");
  const additionalSettingsSection = document.getElementById("additionalSettingsSection");
  const settingsWrapper = document.getElementById("settingsWrapper");

  // Get complexity level
  let complexityLevel = "expert"; // Default
  const complexityOptions = document.querySelectorAll('input[name="complexity"]');
  complexityOptions.forEach(option => {
    if (option.checked) {
      complexityLevel = option.value;
    }
  });

  // Get output format
  let outputFormat = "table"; // Default
  const outputFormatOptions = document.querySelectorAll('input[name="outputFormat"]');
  outputFormatOptions.forEach(option => {
    if (option.checked) {
      outputFormat = option.value;
    }
  });

  // Check if settings view and additional settings are visible
  const isSettingsVisible = settingsWrapper && (
    settingsWrapper.classList.contains("visible") ||
    !settingsWrapper.classList.contains("hidden")
  );

  const isAdditionalSettingsVisible = additionalSettingsSection &&
    additionalSettingsSection.classList.contains("visible");

  // Create settings object
  const settings = {
    wordCount: wordCountSlider ? wordCountSlider.value : 50,
    customInstructions: customInstructions ? customInstructions.value : "",
    // Only save template if it's not the default empty value
    template: (templateSelector && templateSelector.value) ? templateSelector.value : "",
    language: languageSelector ? languageSelector.value : "english",
    complexityLevel: complexityLevel,
    outputFormat: outputFormat,
    // Store view state
    isSettingsVisible: isSettingsVisible,
    isAdditionalSettingsVisible: isAdditionalSettingsVisible
  };

  // Save settings to chrome.storage
  chrome.storage.local.set({ settings: settings });
}

// Function to load settings
function loadSettings() {
  chrome.storage.local.get(["settings"], function(result) {
    if (result.settings) {
      const settings = result.settings;

      // Update UI with saved settings
      const wordCountSlider = document.getElementById("wordCountSlider");
      const wordCountDisplay = document.querySelector(".word-count-display");
      const customInstructions = document.getElementById("customInstructions");
      const templateSelector = document.getElementById("templateSelector");
      const languageSelector = document.getElementById("languageSelector");
      const settingsWrapper = document.getElementById("settingsWrapper");
      const mainContent = document.getElementById("mainContent");
      const responsesWrapper = document.getElementById("responsesWrapper");
      const additionalSettingsSection = document.getElementById("additionalSettingsSection");
      const additionalSettingButton = document.getElementById("additionalSettingButton");

      if (wordCountSlider && settings.wordCount) {
        wordCountSlider.value = settings.wordCount;
      }

      if (wordCountDisplay && settings.wordCount) {
        wordCountDisplay.textContent = settings.wordCount + " words";
      }

      if (customInstructions && settings.customInstructions) {
        customInstructions.value = settings.customInstructions;
      }

      // Handle template selection
      if (templateSelector) {
        // If this is the first time (no settings.template), keep the default "Select templates..." option
        if (settings.template) {
          templateSelector.value = settings.template;
        }
      }

      if (languageSelector && settings.language) {
        languageSelector.value = settings.language;
      }

      // Set complexity level
      if (settings.complexityLevel) {
        const complexityOption = document.querySelector(`input[name="complexity"][value="${settings.complexityLevel}"]`);
        if (complexityOption) {
          complexityOption.checked = true;
        }
      }

      // Set output format
      if (settings.outputFormat) {
        const outputFormatOption = document.querySelector(`input[name="outputFormat"][value="${settings.outputFormat}"]`);
        if (outputFormatOption) {
          outputFormatOption.checked = true;
        }
      }

      // Restore settings view state if needed
      if (settings.isSettingsVisible && settingsWrapper && mainContent && responsesWrapper) {
        // Show settings view
        mainContent.classList.add("hidden");
        responsesWrapper.classList.add("hidden");
        settingsWrapper.classList.remove("hidden");
        settingsWrapper.classList.add("visible");

        // Update info button visibility
        checkAndUpdateInfoButtonVisibility();

        // Restore additional settings state if needed
        if (settings.isAdditionalSettingsVisible && additionalSettingsSection && additionalSettingButton) {
          // Show additional settings
          additionalSettingsSection.classList.remove("hidden");
          additionalSettingsSection.classList.add("visible");

          // Change button text to "Back"
          additionalSettingButton.textContent = "Back";

          // Add margin-bottom to settings-actions
          const settingsActions = document.querySelector(".settings-actions");
          if (settingsActions) {
            settingsActions.style.marginBottom = "25px";
          }

          // Scroll to the additional settings section
          setTimeout(() => {
            if (settingsWrapper) {
              const headerHeight = document.querySelector(".settings-header")?.offsetHeight || 0;
              const additionalSettingsTop = additionalSettingsSection.offsetTop;
              settingsWrapper.scrollTo({
                top: additionalSettingsTop - headerHeight - 20,
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      }
    }
  });

  // Note: Removed separate save/load buttons - now integrated into Apply button
}

// Silent save function for Apply button (no UI blocking)
async function savePreferencesToServerSilently() {
  // console.log('[Velocity Apply] 🔄 Starting silent save preferences to server');

  try {
    const storage = await chrome.storage.local.get(["userId"]);
    const userId = storage.userId;
    // console.log('[Velocity Apply] 👤 User ID from storage:', userId);

    if (!userId) {
      // console.log('[Velocity Apply] ⚠️ User not logged in - skipping server save');
      return; // Silently skip if user not logged in
    }

    // console.log('[Velocity Apply] 🎛️ Getting current settings from UI');
    const currentSettings = getCurrentSettingsFromUI();
    // console.log('[Velocity Apply] 📋 Current settings:', currentSettings);

    const preferences = {
      user_id: userId, // Keep as string as API expects
      word_count: parseInt(currentSettings.wordCount) || 150,
      custom_instructions: currentSettings.customInstructions || "",
      template: currentSettings.template ? [{ [currentSettings.template]: `${currentSettings.template} template` }] : [],
      language: currentSettings.language || "english",
      complexity: currentSettings.complexityLevel || "expert",
      output_format: currentSettings.outputFormat || "table"
    };

    // console.log('[Velocity Apply] 📤 Formatted preferences for API:', preferences);

    // Validate required fields
    if (!preferences.user_id) {
      throw new Error('user_id is required but missing');
    }
    if (typeof preferences.word_count !== 'number' || preferences.word_count < 1) {
      throw new Error(`Invalid word_count: ${preferences.word_count}`);
    }
    if (!preferences.language) {
      throw new Error('language is required but missing');
    }
    if (!preferences.complexity) {
      throw new Error('complexity is required but missing');
    }
    if (!preferences.output_format) {
      throw new Error('output_format is required but missing');
    }

    // console.log('[Velocity Apply] ✅ Validation passed for preferences');

    // console.log('[Velocity Apply] 📡 Calling saveUserPreference API');
    const { saveUserPreference } = await import('./api.js');
    const result = await saveUserPreference(preferences);
    // console.log('[Velocity Apply] ✅ API call result:', result);

    if (result.success) {
      // console.log('[Velocity Apply] ✅ Save successful');
      // console.log('[Velocity Apply] 💾 Storing preference ID:', result.preference_id);
      chrome.storage.local.set({ preferenceId: result.preference_id });

      // Show success notification
      showPreferenceNotification('Settings synced to cloud', 'success');
    } else {
      console.error('[Velocity Apply] ❌ Save failed:', result.message);
      throw new Error(result.message || "Failed to save preferences");
    }
  } catch (error) {
    console.error('[Velocity Apply] ❌ Error in savePreferencesToServerSilently:', error);
    throw error; // Re-throw to be handled by caller
  }
}

// Function to show preference notifications
function showPreferenceNotification(message, type = 'success') {
  // console.log('[Velocity Apply] 📢 Showing notification:', message, type);

  // Remove any existing notifications
  const existingNotification = document.querySelector('.preference-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `preference-notification ${type}`;
  notification.innerHTML = `
    <span class="status-icon"></span>
    <span class="status-message">${message}</span>
  `;

  // Add to document
  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';

      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Note: Old savePreferencesToServer function removed - functionality integrated into Apply button

// Note: Old loadPreferencesFromServer function removed - load functionality can be added later if needed

function getCurrentSettingsFromUI() {
  // console.log('[Velocity Preferences] 🎛️ Getting current settings from UI elements');

  const wordCountSlider = document.getElementById("wordCountSlider");
  const customInstructions = document.getElementById("customInstructions");
  const templateSelector = document.getElementById("templateSelector");
  const languageSelector = document.getElementById("languageSelector");

  // console.log('[Velocity Preferences] 🔍 UI elements found:', {
  //   wordCountSlider: !!wordCountSlider,
  //   customInstructions: !!customInstructions,
  //   templateSelector: !!templateSelector,
  //   languageSelector: !!languageSelector
  // });

  let complexityLevel = "expert";
  const complexityOptions = document.querySelectorAll('input[name="complexity"]');
  complexityOptions.forEach(option => {
    if (option.checked) {
      complexityLevel = option.value;
    }
  });

  let outputFormat = "table";
  const outputFormatOptions = document.querySelectorAll('input[name="outputFormat"]');
  outputFormatOptions.forEach(option => {
    if (option.checked) {
      outputFormat = option.value;
    }
  });

  // Debug template selector
  if (templateSelector) {
    // console.log('[Velocity Preferences] 🔍 Template selector debug:', {
    //   element: templateSelector,
    //   value: templateSelector.value,
    //   selectedIndex: templateSelector.selectedIndex,
    //   selectedOption: templateSelector.options[templateSelector.selectedIndex]?.text,
    //   allOptions: Array.from(templateSelector.options).map(opt => ({value: opt.value, text: opt.text}))
    // });
  }

  const settings = {
    wordCount: wordCountSlider ? wordCountSlider.value : 150,
    customInstructions: customInstructions ? customInstructions.value : "",
    template: (templateSelector && templateSelector.value) ? templateSelector.value : "",
    language: languageSelector ? languageSelector.value : "english",
    complexityLevel: complexityLevel,
    outputFormat: outputFormat
  };

  // console.log('[Velocity Preferences] 📋 Extracted settings:', settings);
  return settings;
}

function updateUIWithPreferences(preferences) {
  // console.log('[Velocity Preferences] 🎛️ Updating UI with preferences:', preferences);

  const wordCountSlider = document.getElementById("wordCountSlider");
  const wordCountDisplay = document.querySelector(".word-count-display");
  const customInstructions = document.getElementById("customInstructions");
  const templateSelector = document.getElementById("templateSelector");
  const languageSelector = document.getElementById("languageSelector");

  // console.log('[Velocity Preferences] 🔍 UI elements found for update:', {
  //   wordCountSlider: !!wordCountSlider,
  //   wordCountDisplay: !!wordCountDisplay,
  //   customInstructions: !!customInstructions,
  //   templateSelector: !!templateSelector,
  //   languageSelector: !!languageSelector
  // });

  if (wordCountSlider && preferences.word_count) {
    // console.log('[Velocity Preferences] 📊 Setting word count:', preferences.word_count);
    wordCountSlider.value = preferences.word_count;
  }
  if (wordCountDisplay && preferences.word_count) {
    // console.log('[Velocity Preferences] 📊 Updating word count display:', preferences.word_count);
    wordCountDisplay.textContent = preferences.word_count + " words";
  }

  if (customInstructions && preferences.custom_instructions) {
    // console.log('[Velocity Preferences] 📝 Setting custom instructions:', preferences.custom_instructions);
    customInstructions.value = preferences.custom_instructions;
  }

  if (templateSelector && preferences.template) {
    const templateValue = extractTemplateFromArray(preferences.template);
    // console.log('[Velocity Preferences] 📋 Setting template:', templateValue);
    if (templateValue) {
      templateSelector.value = templateValue;
    }
  }

  if (languageSelector && preferences.language) {
    // console.log('[Velocity Preferences] 🌐 Setting language:', preferences.language);
    languageSelector.value = preferences.language;
  }

  if (preferences.complexity) {
    // console.log('[Velocity Preferences] 🎯 Setting complexity:', preferences.complexity);
    const complexityOption = document.querySelector(`input[name="complexity"][value="${preferences.complexity}"]`);
    if (complexityOption) {
      complexityOption.checked = true;
    }
  }

  if (preferences.output_format) {
    // console.log('[Velocity Preferences] 📄 Setting output format:', preferences.output_format);
    const outputFormatOption = document.querySelector(`input[name="outputFormat"][value="${preferences.output_format}"]`);
    if (outputFormatOption) {
      outputFormatOption.checked = true;
    }
  }

  // console.log('[Velocity Preferences] ✅ UI update completed');
}

function extractTemplateFromArray(templateArray) {
  // console.log('[Velocity Preferences] 🔍 Extracting template from array:', templateArray);

  if (!templateArray || !Array.isArray(templateArray) || templateArray.length === 0) {
    // console.log('[Velocity Preferences] ⚠️ Template array is empty or invalid');
    return "";
  }

  for (const templateObj of templateArray) {
    // console.log('[Velocity Preferences] 🔍 Processing template object:', templateObj);
    const keys = Object.keys(templateObj);
    for (const key of keys) {
      if (key !== "prompt") {
        // console.log('[Velocity Preferences] ✅ Found template key:', key);
        return key;
      }
    }
  }

  // console.log('[Velocity Preferences] ⚠️ No valid template key found');
  return "";
}

// Function to check and update the visibility of the info button and settings button based on current view
function checkAndUpdateInfoButtonVisibility() {
  const infoButton = document.getElementById("infoButton");
  const settingsButton = document.getElementById("settingsButton");
  const responsesWrapper = document.getElementById("responsesWrapper");
  const settingsWrapper = document.getElementById("settingsWrapper");

  if (!infoButton || !responsesWrapper) return;

  // Check if we're on the response view or settings view
  const isResponseView = responsesWrapper.classList.contains("visible") ||
                         !responsesWrapper.classList.contains("hidden");
  const isSettingsView = settingsWrapper && (settingsWrapper.classList.contains("visible") ||
                         !settingsWrapper.classList.contains("hidden"));

  // Store the current view state
  chrome.storage.local.set({
    "isOnResponseView": isResponseView,
    "isOnSettingsView": isSettingsView
  }, function() {
    // Hide info button on response view or settings view
    if (isResponseView || isSettingsView) {
      infoButton.style.display = "none";
    } else {
      infoButton.style.display = "flex";
    }

    // Hide settings button on response view, show it otherwise
    if (settingsButton) {
      if (isResponseView) {
        settingsButton.style.display = "none";
      } else {
        settingsButton.style.display = "flex";
      }
    }

    // Remove any existing click listeners
    const newInfoButton = infoButton.cloneNode(true);
    infoButton.parentNode.replaceChild(newInfoButton, infoButton);

    // Add button press animation
    newInfoButton.addEventListener("click", () => {
      // Add clicked class for animation
      newInfoButton.classList.add("clicked");

      // Remove the class after animation completes
      setTimeout(() => {
        newInfoButton.classList.remove("clicked");
      }, 300);
    });

    if (isResponseView) {
      // On response view, add a click handler that first navigates back to the input view
      newInfoButton.addEventListener("click", function() {
        // First navigate back to the input view
        const mainContent = document.getElementById("mainContent");
        const responsesWrapper = document.getElementById("responsesWrapper");

        // Hide responses
        responsesWrapper.classList.remove("visible");

        setTimeout(() => {
          // Add hidden class after transition
          responsesWrapper.classList.add("hidden");

          // Show main content
          mainContent.classList.remove("hidden");

          // Save the current prompt input value before starting tutorial
          const promptInput = document.getElementById("promptInput");
          const userPrompt = promptInput ? promptInput.value : "";

          // Store the user's prompt temporarily and reset tutorial
          chrome.storage.local.set({
            lastTutorialStep: 0,
            userSavedPrompt: userPrompt,
            isOnResponseView: false
          }, function() {
            // Start the tutorial after a short delay to ensure the view transition is complete
            setTimeout(function() {
              initializeTutorial(true); // Pass true to indicate this is a manual tutorial start
            }, 300);
          });
        }, 300);
      });
    } else {
      // On input view, add the normal click handler
      newInfoButton.addEventListener("click", function() {
        // Save the current prompt input value before starting tutorial
        const promptInput = document.getElementById("promptInput");
        const userPrompt = promptInput ? promptInput.value : "";

        // Store the user's prompt temporarily
        chrome.storage.local.set({
          lastTutorialStep: 0,
          userSavedPrompt: userPrompt
        }, function() {
          // Directly initialize the tutorial when info button is clicked
          initializeTutorial(true); // Pass true to indicate this is a manual tutorial start
        });
      });
    }
  });
}

// Add event listeners for view transitions to update info button visibility
function setupViewTransitionListeners() {
  const backButton = document.getElementById("backToInput");
  const applySettingsButton = document.getElementById("applySettingsButton");
  const sendButton = document.getElementById("sendButton");
  const settingsButton = document.getElementById("settingsButton");

  if (backButton) {
    backButton.addEventListener("click", function() {
      // When going back to input view, show the info button and settings button
      setTimeout(() => {
        checkAndUpdateInfoButtonVisibility();

        // Store that we're no longer on the response view
        chrome.storage.local.set({
          "isOnResponseView": false
        });
      }, 350); // After transition
    });
  }

  if (applySettingsButton) {
    applySettingsButton.addEventListener("click", function() {
      // When applying settings and going back to input view, update the info button
      setTimeout(checkAndUpdateInfoButtonVisibility, 350); // After transition
    });
  }

  if (sendButton) {
    sendButton.addEventListener("click", function() {
      // When transitioning to response view, update the info button and hide settings button
      setTimeout(() => {
        checkAndUpdateInfoButtonVisibility();

        // Store that we're on the response view
        chrome.storage.local.set({
          "isOnResponseView": true
        });
      }, 350); // After transition
    });
  }

  if (settingsButton) {
    settingsButton.addEventListener("click", function() {
      // When toggling settings view, update the info button
      setTimeout(checkAndUpdateInfoButtonVisibility, 350); // After transition
    });
  }

  // Check on initial load
  chrome.storage.local.get(["isOnResponseView", "isOnSettingsView"], function(data) {
    if (data.isOnResponseView || data.isOnSettingsView) {
      // If we were on the response view or settings view when the popup was closed,
      // update the info button visibility and click handler
      checkAndUpdateInfoButtonVisibility();
    }
  });
}

// Call this function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
  setupViewTransitionListeners();

  // Export the checkAndUpdateInfoButtonVisibility function for use in popup.js
  window.checkAndUpdateInfoButtonVisibility = checkAndUpdateInfoButtonVisibility;
});

// Function to periodically check if the prompt generation is complete
function checkForGeneratedPrompt() {
  let checkInterval;
  let checkCount = 0;
  const MAX_CHECKS = 20; // Maximum number of checks (10 seconds at 500ms intervals)

  // Clear any existing interval
  if (window.promptCheckInterval) {
    clearInterval(window.promptCheckInterval);
  }

  // Set up the interval to check for the generated prompt
  checkInterval = setInterval(() => {
    checkCount++;

    // Check if we've reached the maximum number of checks
    if (checkCount > MAX_CHECKS) {
      clearInterval(checkInterval);

      // Show error message if we've waited too long
      const responsesGrid = document.querySelector('.responses-grid');
      if (responsesGrid) {
        responsesGrid.innerHTML = '<div class="response-card"><div class="response-content">Generation is taking longer than expected. Please try again.</div></div>';
      }
      return;
    }

    // Check if the prompt has been generated
    chrome.storage.local.get(["storedResponse", "isGeneratingPrompt"], function(data) {
      if (data.storedResponse && !data.isGeneratingPrompt) {
        // Prompt is ready, update the UI
        clearInterval(checkInterval);
        updateResponseWithGeneratedPrompt();
      }
    });
  }, 500); // Check every 500ms

  // Store the interval ID so we can clear it later if needed
  window.promptCheckInterval = checkInterval;
}

// Add a function to log all event listeners on the button
window.debugButtonListeners = function() {
  const button = document.getElementById("openInPlatformButton");
  if (!button) {
    // // console.log("[DEBUG] Button not found for debugging");
    return;
  }

  // // console.log("[DEBUG] Button properties:", {
  //   id: button.id,
  //   hasClickListener: button._hasClickListener,
  //   clickListeners: button._clickListeners,
  //   dataset: button.dataset,
  //   parent: button.parentNode?.tagName,
  //   clone: button._isClone
  // });

  // Clone and replace to see if it affects the issue
  const newButton = button.cloneNode(true);
  newButton._isClone = true;
  button.parentNode.replaceChild(newButton, button);
  // // console.log("[DEBUG] Button cloned and replaced");
};

// Add button state handling
function handleButtonState(buttonId, isActive) {
  const button = document.getElementById(buttonId);
  if (button) {
    if (button.type === 'checkbox') {
      button.checked = isActive;
    } else {
      if (isActive) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }
}

// Add page state handling
function handlePageState(pageId, isVisible) {
  const page = document.getElementById(pageId);
  if (page) {
    if (isVisible) {
      page.classList.remove('hidden');
    } else {
      page.classList.add('hidden');
    }
  }
}

function initializeAdditionalSettingsDropdowns() {
  const complexitySelector = document.getElementById('complexitySelector');
  const formatSelector = document.getElementById('formatSelector');

  // Load saved selections
  const savedComplexity = localStorage.getItem('selectedComplexity');
  const savedFormat = localStorage.getItem('selectedFormat');

  if (savedComplexity) {
    complexitySelector.value = savedComplexity;
  }

  if (savedFormat) {
    formatSelector.value = savedFormat;
  }

  // Handle complexity selection
  complexitySelector.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value) {
      localStorage.setItem('selectedComplexity', value);
    }
  });

  // Handle format selection
  formatSelector.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value) {
      localStorage.setItem('selectedFormat', value);
    }
  });
}

// Add this to your existing DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function () {
  initializeAdditionalSettingsDropdowns();
});








