/**
 * animationConfig.js - Configuration for the modular button animation system
 * Defines states, animations, and behaviors for the Velocity button
 * Enhanced with empty input box detection
 *
 * ANIMATION MESSAGE BOX FUNCTIONALITY COMMENTED OUT
 */

window.VelocityAnimationConfig = {
  states: {
    // Idle state - no input
    idle: {
      enter: (system, data) => {
        system.animationManager.startAnimation('idle', data.button);

        /* MESSAGE BOX FUNCTIONALITY COMMENTED OUT
        if (system.shouldShowMessageForState(1)) {
          system.messageSystem.showMessage('idle', {
            text: 'Have a question? I can help optimize your prompt!',
            type: 'info',
            button: data.button,
            positionStrategy: 'relativeToButton'
          });
        }
        */

        // Reset success state if we're transitioning to idle
        system.state.isSuccessState = false;

        // Setup recurring idle messages
        clearInterval(system.state.idleInterval);
        system.state.idleInterval = setInterval(() => {
          // Don't show messages if we're not in idle state anymore
          if (system.stateMachine.getCurrentState() !== 'idle') {
            return;
          }

          /* MESSAGE BOX FUNCTIONALITY COMMENTED OUT
          // Check if input is still empty - continue showing idle message only if empty
          if (!system.checkInputHasContent() && system.shouldShowMessageForState(1)) {
            system.messageSystem.showMessage('idle', {
              text: 'Have a question? I can help optimize your prompt!',
              type: 'info',
              button: data.button,
              positionStrategy: 'relativeToButton',
              updateTextOnly: true // Use existing message box
            });
          }
          */

          // If input now has content, go to typingStopped state
          if (system.checkInputHasContent() && system.state.hasStartedTyping) {
            clearInterval(system.state.idleInterval);
            system.stateMachine.transition('typingStopped', { button: data.button });
          }
        }, system.config.messageReappearTime);
      },
      exit: (system) => {
        system.animationManager.stopAnimation('idle');
        system.messageSystem.removeMessage('idle');
        clearInterval(system.state.idleInterval);
      }
    },

    // Typing state - user is typing
    typing: {
      enter: (system, data) => {
        // If the input is empty, go back to idle
        if (!system.checkInputHasContent()) {
          system.stateMachine.transition('idle', { button: data.button });
          return;
        }

        system.animationManager.startAnimation('typing', data.button);
        const innerDiv = data.button.querySelector('div');
        if (innerDiv) {
          innerDiv.classList.add('velocity-typing-scale');
        }
      },
      exit: (system, data) => {
        system.animationManager.stopAnimation('typing');
        const innerDiv = data.button.querySelector('div');
        if (innerDiv) {
          innerDiv.classList.remove('velocity-typing-scale');
        }
      }
    },

    // Typing stopped - ready to enhance
    typingStopped: {
      enter: (system, data) => {
        // If the input is empty, go back to idle
        if (!system.checkInputHasContent()) {
          system.stateMachine.transition('idle', { button: data.button });
          return;
        }

        system.animationManager.startAnimation('typingStopped', data.button);

        /* MESSAGE BOX FUNCTIONALITY COMMENTED OUT
        if (system.shouldShowMessageForState(3)) {
          system.messageSystem.showMessage('typingStopped', {
            text: "Here I'm ready to enhance your prompt!",
            type: 'info',
            button: data.button,
            positionStrategy: 'relativeToButton'
          });
        }
        */
      },
      exit: (system) => {
        system.animationManager.stopAnimation('typingStopped');
        system.messageSystem.removeMessage('typingStopped');
      }
    },

    // Loading state - processing request
    loading: {
      enter: (system, data) => {
        // If the input is empty, go back to idle
        if (!system.checkInputHasContent()) {
          system.stateMachine.transition('idle', { button: data.button });
          return;
        }

        system.animationManager.startAnimation('loading', data.button);
        system.createMultiRingAnimation(data.button);

        // We're removing all loading messages as requested
        if (system.state.loadingHandler) {
          clearInterval(system.state.loadingHandler);
          system.state.loadingHandler = null;
        }

        system.messageSystem.removeMessage('loading');
      },
      exit: (system, data) => {
        // Only clean up the message interval but leave animations running until explicitly stopped
        if (system.state.loadingHandler) {
          clearInterval(system.state.loadingHandler);
          system.state.loadingHandler = null;
        }

        system.messageSystem.removeMessage('loading');
      }
    },

    // Success with review state
    successWithReview: {
      enter: (system, data) => {
        // If the input is empty, go back to idle instead of success
        if (!system.checkInputHasContent()) {
          system.state.isSuccessState = false;
          system.stateMachine.transition('idle', { button: data.button });
          return;
        }

        system.state.isSuccessState = true;
        system.animationManager.startAnimation('successWithReview', data.button);

        // Don't show messages when prompt review box is open
        system.messageSystem.removeMessage('successWithReview');
        system.messageSystem.removeMessage('successIdle');

        // Clear any existing intervals
        clearInterval(system.state.idleInterval);

        // Start periodic check for empty input to revert to idle if needed
        system.state.successStateTimer = setInterval(() => {
          if (!system.checkInputHasContent()) {
            // Input is now empty and we're in success state - go back to idle
            //console.log('[Velocity] Input became empty in success state, reverting to idle');
            clearInterval(system.state.successStateTimer);
            system.state.isSuccessState = false;
            system.stateMachine.transition('idle', { button: data.button });
          }
        }, 1000);
      },
      exit: (system) => {
        system.animationManager.stopAnimation('successWithReview');
        system.messageSystem.removeMessage('successWithReview');
        clearInterval(system.state.idleInterval);

        // Clear success state check timer
        if (system.state.successStateTimer) {
          clearInterval(system.state.successStateTimer);
          system.state.successStateTimer = null;
        }
      }
    },

    // Success idle state
    successIdle: {
      enter: (system, data) => {
        // If the input is empty, go back to idle instead of success
        if (!system.checkInputHasContent()) {
          system.state.isSuccessState = false;
          system.stateMachine.transition('idle', { button: data.button });
          return;
        }

        system.state.isSuccessState = true;
        system.animationManager.startAnimation('successIdle', data.button);

        /* MESSAGE BOX FUNCTIONALITY COMMENTED OUT
        if (system.shouldShowMessageForState(7)) {
          system.messageSystem.showMessage('successIdle', {
            text: '<div style="font-size: 14px; font-weight: 600; color: var(--velocity-text-color, var(--dark-mode) ? "#ffffff" : "#000");">Prompt enhanced!</div><div style="font-size: 13px; color: var(--velocity-secondary-text-color, var(--dark-mode) ? "#9CA3AF" : "#0B0B0Bb7");">Hit <img src="' + chrome.runtime.getURL("assets/enterkey.png") + '" class="velocity-enter-icon" style="height: 20px; vertical-align: middle; filter: var(--enter-key-filter, none);"> if you are satisfied</div>',
            type: 'success',
            button: data.button,
            positionStrategy: 'relativeToButton',
            isHTML: true,
            customStyle: 'border: 1px solid var(--velocity-border-color, rgba(0, 0, 0, 0.1)); box-shadow: 4px 2px 10px var(--velocity-shadow-color, rgba(0, 0, 0, 0.6)); border-radius: 8px; background-color: var(--velocity-background-color, #fff);'
          });
        }
        */

        // Clear any existing intervals
        clearInterval(system.state.idleInterval);

        // Setup recurring messages for success state
        system.state.idleInterval = setInterval(() => {
          // First check if input is still not empty
          if (!system.checkInputHasContent()) {
            // Input is now empty and we're in success state - go back to idle
            //console.log('[Velocity] Input became empty in success state, reverting to idle');
            clearInterval(system.state.idleInterval);
            system.state.isSuccessState = false;
            system.stateMachine.transition('idle', { button: data.button });
            return;
          }

          /* MESSAGE BOX FUNCTIONALITY COMMENTED OUT
          if (system.shouldShowMessageForState(7)) {
            system.messageSystem.showMessage('successIdle', {
              text: '<div style="font-size: 14px; font-weight: 600; color: var(--velocity-text-color, var(--dark-mode) ? "#ffffff" : "#000");">Prompt enhanced!</div><div style="font-size: 13px; color: var(--velocity-secondary-text-color, var(--dark-mode) ? "#9CA3AF" : "#0B0B0Bb7");">Hit <img src="' + chrome.runtime.getURL("assets/enterkey.png") + '" class="velocity-enter-icon" style="height: 20px; vertical-align: middle; filter: var(--enter-key-filter, none);"> if you are satisfied</div>',
              type: 'success',
              button: data.button,
              positionStrategy: 'relativeToButton',
              updateTextOnly: true,
              isHTML: true,
              customStyle: 'border: 1px solid var(--velocity-border-color, rgba(0, 0, 0, 0.1)); box-shadow: 4px 2px 10px var(--velocity-shadow-color, rgba(0, 0, 0, 0.6)); border-radius: 8px; background-color: var(--velocity-background-color, #fff);'
            });
          }
          */
        }, system.config.messageReappearTime);
      },
      exit: (system) => {
        system.animationManager.stopAnimation('successIdle');
        system.messageSystem.removeMessage('successIdle');
        clearInterval(system.state.idleInterval);
      }
    }
  },

  animations: {
    idle: {
      start: (element) => {
        element.classList.add('velocity-inner-pulse-bounce');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-inner-pulse-bounce');
      }
    },

    typing: {
      start: (element) => {
        element.classList.add('velocity-half-circle-glow');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-half-circle-glow');
      }
    },

    typingStopped: {
      start: (element) => {
        element.classList.add('velocity-idle-typing-effect');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-idle-typing-effect');
      }
    },

    loading: {
      start: (element) => {
        element.classList.add('velocity-loading-animation');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-loading-animation');
      }
    },

    successWithReview: {
      start: (element) => {
        element.classList.add('velocity-success-idle-effect');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-success-idle-effect');
      }
    },

    successIdle: {
      start: (element) => {
        element.classList.add('velocity-success-idle-effect');
        return { element };
      },
      stop: (instance) => {
        instance.element.classList.remove('velocity-success-idle-effect');
      }
    }
  },

  // Helper to initialize the button system with all configurations
  initializeSystem: function(system) {
    // Register all states
    Object.entries(this.states).forEach(([name, config]) => {
      system.stateMachine.addState(name, {
        enter: (data) => config.enter(system, data),
        exit: (data) => config.exit(system, data)
      });
    });

    // Register all animations
    Object.entries(this.animations).forEach(([name, config]) => {
      system.animationManager.registerAnimation(name, config);
    });

    // Ensure message styles are injected
    if (system.messageSystem.injectMessageStyles) {
      system.messageSystem.injectMessageStyles();
      }
    }
  };

  // Helper function to create and initialize the button system
  window.createVelocityButtonSystem = function(platformConfig) {
    const system = new VelocityButtonSystem();
    VelocityAnimationConfig.initializeSystem(system);
    system.init(platformConfig);
    return system;
  };

  // Enhanced helper to handle empty input states efficiently
  window.initVelocityEmptyStateDetection = function(system) {
    // Log for debugging
    //console.log('[Velocity] Initializing empty state detection');

    // Functions to help with checking input state
    const checkInputState = () => {
      const hasContent = system.checkInputHasContent();
      const currentState = system.stateMachine.getCurrentState();
      const button = system.state.currentButton;

      if (!hasContent && currentState !== 'idle') {
        //console.log('[Velocity] Input detected as empty, transitioning to idle');

        // Reset success state flag if needed
        if (system.state.isSuccessState) {
          system.state.isSuccessState = false;
        }

        // Transition to idle state
        system.stateMachine.transition('idle', { button });
        return true;
      }
      return false;
    };

    // Observe DOM for changes to input elements
    const setupInputObservers = () => {
      const possibleInputs = document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]');

      possibleInputs.forEach(inputElement => {
        // Skip if already observed
        if (inputElement.dataset.velocityObserved) return;

        // Mark as observed
        inputElement.dataset.velocityObserved = 'true';

        // Set up mutation observer for contenteditable divs
        if (inputElement.hasAttribute('contenteditable')) {
          const observer = new MutationObserver((mutations) => {
            // Check after content mutation
            setTimeout(checkInputState, 50);
          });

          observer.observe(inputElement, {
            childList: true,
            characterData: true,
            subtree: true
          });

          //console.log('[Velocity] Added mutation observer to contenteditable element');
        }

        // Listen for input events
        inputElement.addEventListener('input', () => {
          setTimeout(checkInputState, 50);
        });

        // Special handling for cut/paste/delete actions
        inputElement.addEventListener('cut', () => {
          setTimeout(checkInputState, 50);
        });

        inputElement.addEventListener('paste', () => {
          setTimeout(checkInputState, 50);
        });

        // Listen for key events - especially useful for detecting deletion
        inputElement.addEventListener('keyup', (e) => {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            setTimeout(checkInputState, 50);
          }
        });

        //console.log('[Velocity] Added event listeners to input element');
      });
    };

    // Initial setup
    setupInputObservers();

    // Set up a periodic check for input elements and their content
    const observerInterval = setInterval(() => {
      setupInputObservers();

      // Perform periodic check for empty input across states
      checkInputState();
    }, 1000);

    // Add global cut/copy/paste detection for document level operations
    document.addEventListener('cut', () => {
      setTimeout(checkInputState, 100);
    });

    document.addEventListener('paste', () => {
      setTimeout(checkInputState, 100);
    });

    // Store the interval ID for cleanup if needed
    system.state.emptyStateObserverInterval = observerInterval;

    return {
      stop: () => {
        clearInterval(observerInterval);
        if (system.state.emptyStateObserverInterval) {
          clearInterval(system.state.emptyStateObserverInterval);
          system.state.emptyStateObserverInterval = null;
        }
      }
    };
  };

  // Additional extension to improve state transitions based on input content
  window.VelocityInputTracker = {
    initialize: function(system) {
      // Add enhanced tracking to reset to idle when input becomes empty after any state

      // Override the original checkInputHasContent to add logging
      const originalCheckMethod = system.checkInputHasContent;
      system.checkInputHasContent = function() {
        const result = originalCheckMethod.call(system);
        return result;
      };

      // Create a more robust input change detection system
      const enhancedInputTracking = () => {
        // Get all potential input elements
        const textAreas = document.querySelectorAll('textarea');
        const contentEditables = document.querySelectorAll('[contenteditable="true"]');
        const textboxRoles = document.querySelectorAll('[role="textbox"]');

        // Monitor all textarea elements
        textAreas.forEach(textarea => {
          if (!textarea.dataset.velocityTracked) {
            textarea.dataset.velocityTracked = 'true';

            // Create input event listener with debouncing
            let inputTimer;
            textarea.addEventListener('input', () => {
              clearTimeout(inputTimer);
              inputTimer = setTimeout(() => {
                const isEmpty = textarea.value.trim() === '';

                if (isEmpty && system.stateMachine.getCurrentState() !== 'idle') {
                  //console.log('[Velocity] Textarea detected as empty, reverting to idle state');
                  system.state.isSuccessState = false;
                  system.stateMachine.transition('idle', { button: system.state.currentButton });
                }
              }, 100);
            });

            // Handle special key events separately for better responsiveness
            textarea.addEventListener('keydown', (e) => {
              if ((e.key === 'Backspace' || e.key === 'Delete') && textarea.value.trim().length <= 1) {
                // Will likely be empty after this keypress
                setTimeout(() => {
                  if (textarea.value.trim() === '' && system.stateMachine.getCurrentState() !== 'idle') {
                    //console.log('[Velocity] Textarea emptied via keypress, reverting to idle state');
                    system.state.isSuccessState = false;
                    system.stateMachine.transition('idle', { button: system.state.currentButton });
                  }
                }, 10);
              }
            });

            //console.log('[Velocity] Enhanced tracking added to textarea element');
          }
        });

        // Similar approach for contenteditable elements
        contentEditables.forEach(element => {
          if (!element.dataset.velocityTracked) {
            element.dataset.velocityTracked = 'true';

            // Use MutationObserver for content changes
            const observer = new MutationObserver(() => {
              const isEmpty = element.innerText.trim() === '';

              if (isEmpty && system.stateMachine.getCurrentState() !== 'idle') {
                //console.log('[Velocity] Contenteditable detected as empty, reverting to idle state');
                system.state.isSuccessState = false;
                system.stateMachine.transition('idle', { button: system.state.currentButton });
              }
            });

            observer.observe(element, {
              childList: true,
              characterData: true,
              subtree: true
            });

            //console.log('[Velocity] Enhanced tracking added to contenteditable element');
          }
        });

        // And for elements with role="textbox"
        textboxRoles.forEach(element => {
          if (!element.dataset.velocityTracked) {
            element.dataset.velocityTracked = 'true';

            // Use input event or MutationObserver depending on element type
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
              element.addEventListener('input', () => {
                const isEmpty = element.value.trim() === '';

                if (isEmpty && system.stateMachine.getCurrentState() !== 'idle') {
                  //console.log('[Velocity] Textbox role detected as empty, reverting to idle state');
                  system.state.isSuccessState = false;
                  system.stateMachine.transition('idle', { button: system.state.currentButton });
                }
              });
            } else {
              const observer = new MutationObserver(() => {
                const isEmpty = (element.innerText || element.textContent || '').trim() === '';

                if (isEmpty && system.stateMachine.getCurrentState() !== 'idle') {
                  //console.log('[Velocity] Textbox role detected as empty, reverting to idle state');
                  system.state.isSuccessState = false;
                  system.stateMachine.transition('idle', { button: system.state.currentButton });
                }
              });

              observer.observe(element, {
                childList: true,
                characterData: true,
                subtree: true
              });
            }

            //console.log('[Velocity] Enhanced tracking added to textbox role element');
          }
        });
      };

      // Run the enhanced tracking setup immediately
      enhancedInputTracking();

      // And also set up an interval to catch dynamically added elements
      const trackerInterval = setInterval(enhancedInputTracking, 2000);

      // Store for cleanup
      system.state.enhancedInputTrackerInterval = trackerInterval;

      return {
        stop: () => {
          clearInterval(trackerInterval);
        }
      };
    }
  };
