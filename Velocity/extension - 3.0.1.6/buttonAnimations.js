
class AnimationStateMachine {
  constructor() {
    this.states = new Map();
    this.currentState = null;
    this.listeners = new Set();
  }

  addState(name, config) {
    this.states.set(name, {
      enter: config.enter || (() => {}),
      exit: config.exit || (() => {}),
      transitions: config.transitions || new Map(),
      onUpdate: config.onUpdate || (() => {})
    });
  }

  transition(newState, data = {}) {
    if (!this.states.has(newState)) {
      throw new Error(`State ${newState} not found`);
    }

    if (this.currentState) {
      const currentConfig = this.states.get(this.currentState);
      currentConfig.exit(data);
    }

    const newConfig = this.states.get(newState);
    this.currentState = newState;
    newConfig.enter(data);
    this.notifyListeners(newState, data);
  }

  getCurrentState() {
    return this.currentState;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(state, data) {
    this.listeners.forEach(listener => listener(state, data));
  }
}


class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.activeAnimations = new Map();
  }

  registerAnimation(name, animationConfig) {
    this.animations.set(name, {
      start: animationConfig.start,
      stop: animationConfig.stop,
      update: animationConfig.update || (() => {})
    });
  }

  startAnimation(name, element, data = {}) {
    if (!this.animations.has(name)) {
      throw new Error(`Animation ${name} not found`);
    }

    const animation = this.animations.get(name);
    const animationInstance = animation.start(element, data);
    this.activeAnimations.set(name, {instance: animationInstance, element});

    return animationInstance;
  }

  stopAnimation(name) {
    const active = this.activeAnimations.get(name);
    if (active) {
      const animation = this.animations.get(name);
      animation.stop(active.instance, active.element);
      this.activeAnimations.delete(name);
    }
  }

  stopAllAnimations() {
    this.activeAnimations.forEach((active, name) => {
      const animation = this.animations.get(name);
      animation.stop(active.instance, active.element);
    });
    this.activeAnimations.clear();
  }
}


class MessageSystem {
  constructor() {
    this.messages = new Map();
    this.positionStrategies = new Map();
    this.defaultConfig = {
      duration: 4000,
      maxWidth: 220
    };

    this.highPriorityQueue = [];    
    this.mediumPriorityQueue = [];  
    this.lowPriorityQueue = [];     
    this.currentActiveMessage = null;

    
    this.messageDelayActive = false;
    this.delayedMessages = [];

    this.injectMessageStyles();
  }

  injectMessageStyles() {
    if (document.getElementById('velocity-message-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'velocity-message-styles';
    styleEl.innerHTML = `
      .velocity-message-box {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        animation: fadeIn 0.3s ease-in-out;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        max-width: 220px;
        opacity: 1;
        visibility: visible;
        display: block;
        transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  }

  
  createMessage(config) {
    
    const element = document.createElement('div');
    element.style.display = 'none';

    
    return {
      element,
      config,
      timeoutId: null
    };

   
  }

  applyMessageStyles(element, config) {
    chrome.storage.local.get(['darkMode'], (result) => {
      const isDarkMode = result.darkMode === true;

      if (isDarkMode) {
        // Dark mode styling
        element.style.backgroundColor = 'hsl(197, 40%, 14%)';
        element.style.color = '#ffffff';
        element.style.border = '2px solid rgba(0, 0, 0, 0.85)';

        // Update Enter key icon filter for dark mode
        const enterIcon = element.querySelector('.velocity-enter-icon');
        if (enterIcon) {
          enterIcon.style.filter = 'invert(1)';
        }
      } else {
        // Light mode styling
        element.style.backgroundColor = 'hsl(190, 95%, 90%)';
        element.style.color = '#000000';
        element.style.border = '2px solid rgba(0, 0, 0, 0.85)';

        // Update Enter key icon filter for light mode
        const enterIcon = element.querySelector('.velocity-enter-icon');
        if (enterIcon) {
          enterIcon.style.filter = 'none';
        }
      }

      // Common styling for both modes
      element.style.fontFamily = "'DM Sans', system-ui, -apple-system, sans-serif";
      element.style.fontSize = '13px';
      element.style.fontWeight = '500';
      element.style.padding = '10px 20px';
      element.style.borderRadius = '10px';
      element.style.maxWidth = '280px';
      element.style.position = 'fixed';
      element.style.zIndex = '999999';
      element.style.pointerEvents = 'none';
      element.style.textAlign = 'left';
      element.style.animation = 'fadeIn 0.3s ease-in-out';
      element.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.transform = 'translateZ(0)';
      element.style.whiteSpace = 'pre-line';
    });
  }

      
  updateMessageText(id, newText) {
    const message = this.messages.get(id);
    if (!message) return false;

    
    if (message.config.isHTML) {
      message.element.innerHTML = newText;
      message.config.text = newText;
    } else {
      
      const element = message.element;

      
      if (!(window.velocityHoverBoxState && window.velocityHoverBoxState.isHoverBoxVisible)) {
        
        element.style.transition = 'opacity 0.2s ease-in-out';
        element.style.opacity = '1';

        
        setTimeout(() => {
          if (message.config.isHTML) {
            element.innerHTML = newText;
          } else {
            element.textContent = newText;
          }
          message.config.text = newText;

          
          element.offsetHeight;

          
          element.style.opacity = '1';

          
          setTimeout(() => {
            element.style.transition = '';
          }, 200);

          
        }, 200);
      } else {
        
        if (message.config.isHTML) {
          element.innerHTML = newText;
        } else {
          element.textContent = newText;
        }
        message.config.text = newText;
      }
    }

    return true;
  }

  
  enableMessageDelay(delayMs = 5000) {
    
    this.messageDelayActive = true;

    
    if (this.messageDelayTimeout) {
      clearTimeout(this.messageDelayTimeout);

    }

    
    this.messageDelayTimeout = setTimeout(() => {
      this.messageDelayActive = false;

      
      this.processDelayedMessages();
    }, delayMs);
  }

  
  processDelayedMessages() {
    if (this.delayedMessages.length === 0) {
      
      return;
    }

    

    
    const highPriorityDelayed = this.delayedMessages.filter(m => m.priority === 'high');
    const mediumPriorityDelayed = this.delayedMessages.filter(m => m.priority === 'medium');
    const lowPriorityDelayed = this.delayedMessages.filter(m => m.priority === 'low');

    

    
    highPriorityDelayed.forEach(msg => {
      
      this.showMessageWithPriority(msg.id, msg.config, msg.priority);
    });

    
    mediumPriorityDelayed.forEach(msg => {
      
      this.showMessageWithPriority(msg.id, msg.config, msg.priority);
    });

    
    lowPriorityDelayed.forEach(msg => {
      
      this.showMessageWithPriority(msg.id, msg.config, msg.priority);
    });

    
    this.delayedMessages = [];
    
  }


  enqueueMessage(id, message, priority) {
    

    
    this.highPriorityQueue = this.highPriorityQueue.filter(m => m.id !== id);
    this.mediumPriorityQueue = this.mediumPriorityQueue.filter(m => m.id !== id);
    this.lowPriorityQueue = this.lowPriorityQueue.filter(m => m.id !== id);

    
    if (priority === 'high') {
      this.highPriorityQueue.push({ id, message });
      
    } else if (priority === 'medium') {
      this.mediumPriorityQueue.push({ id, message });
      
    } else {
      this.lowPriorityQueue.push({ id, message });
      
    }

    
    this.processMessageQueue();
  }

  
  processMessageQueue() {
    
    
    if (this.currentActiveMessage) {
      
    }

    let nextMessage = null;
    let nextId = null;
    let nextPriority = null;

    if (this.highPriorityQueue.length > 0) {
      const item = this.highPriorityQueue.shift();
      nextMessage = item.message;
      nextId = item.id;
      nextPriority = 'high';
      
    } else if (this.mediumPriorityQueue.length > 0 &&
               (!this.currentActiveMessage || this.currentActiveMessage.priority !== 'high')) {
      const item = this.mediumPriorityQueue.shift();
      nextMessage = item.message;
      nextId = item.id;
      nextPriority = 'medium';
      
    } else if (this.lowPriorityQueue.length > 0 &&
               (!this.currentActiveMessage ||
                (this.currentActiveMessage.priority !== 'high' &&
                 this.currentActiveMessage.priority !== 'medium'))) {
      const item = this.lowPriorityQueue.shift();
      nextMessage = item.message;
      nextId = item.id;
      nextPriority = 'low';
      
    } else {
      
    }


    if (nextMessage) {
      
      if (this.currentActiveMessage) {
        const currentId = this.currentActiveMessage.id;
        const currentPriority = this.currentActiveMessage.priority;

        if ((currentPriority === 'low' && (nextPriority === 'medium' || nextPriority === 'high')) ||
            (currentPriority === 'medium' && nextPriority === 'high')) {
          this.removeMessage(currentId);
          this.currentActiveMessage = null;
        } else {
          this.enqueueMessage(nextId, nextMessage, nextPriority);
          return;
        }
      }

      this.currentActiveMessage = {
        id: nextId,
        message: nextMessage,
        priority: nextPriority
      };

      nextMessage.element.style.display = 'block';
      nextMessage.element.style.visibility = 'visible';
      nextMessage.element.style.opacity = '1';
      nextMessage.element.style.transform = 'translateZ(0)';

      if (nextMessage.config.duration !== null) {
        if (nextMessage.timeoutId) {
          clearTimeout(nextMessage.timeoutId);
        }

        const duration = nextMessage.config.duration || this.defaultConfig.duration;

        nextMessage.timeoutId = setTimeout(() => {
          this.removeMessage(nextId);
          this.currentActiveMessage = null;
          this.processMessageQueue(); 
        }, duration);
      } else {
      }
    }
  }

  showMessageWithPriority(id, config, priority = 'low') {
    return null;

   
  }

      
  showMessage(id, config, priority = 'low') {
    // Just return null without showing any messages
    return null;

  }

  registerPositionStrategy(name, strategy) {
    this.positionStrategies.set(name, strategy);
  }

  removeMessage(id) {
    
    const message = this.messages.get(id);
    if (message) {
      if (message.timeoutId) {
        clearTimeout(message.timeoutId);
        
      }
      message.element.remove();
      this.messages.delete(id);
      
      
      if (this.currentActiveMessage && this.currentActiveMessage.id === id) {
        
        this.currentActiveMessage = null;

        
        setTimeout(() => this.processMessageQueue(), 0);
      }
    } else {
      
    }

    
    const highBefore = this.highPriorityQueue.length;
    const mediumBefore = this.mediumPriorityQueue.length;
    const lowBefore = this.lowPriorityQueue.length;
    const delayedBefore = this.delayedMessages.length;

    this.highPriorityQueue = this.highPriorityQueue.filter(m => m.id !== id);
    this.mediumPriorityQueue = this.mediumPriorityQueue.filter(m => m.id !== id);
    this.lowPriorityQueue = this.lowPriorityQueue.filter(m => m.id !== id);
    this.delayedMessages = this.delayedMessages.filter(m => m.id !== id);

    const highRemoved = highBefore - this.highPriorityQueue.length;
    const mediumRemoved = mediumBefore - this.mediumPriorityQueue.length;
    const lowRemoved = lowBefore - this.lowPriorityQueue.length;
    const delayedRemoved = delayedBefore - this.delayedMessages.length;

    if (highRemoved + mediumRemoved + lowRemoved + delayedRemoved > 0) {
      
    }
  }

  removeAllMessages() {
    

    
    const messageCount = this.messages.size;
    this.messages.forEach((msg, id) => {
      if (msg.timeoutId) {
        clearTimeout(msg.timeoutId);
      }
      if (msg.element && msg.element.parentNode) {
        msg.element.remove();
      }
    });
    
    
    const untrackedBoxes = document.querySelectorAll('.velocity-message-box');
    untrackedBoxes.forEach(box => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });

    

    this.messages.clear();
    this.highPriorityQueue = [];
    this.mediumPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.delayedMessages = [];
    this.currentActiveMessage = null;

    
    if (this.messageDelayTimeout) {
      clearTimeout(this.messageDelayTimeout);
      this.messageDelayTimeout = null;
     
    }

    
  }

  positionMessage(message, strategyName) {
    const strategy = this.positionStrategies.get(strategyName);
    if (strategy) {
      strategy(message.element, message.config);
    }
  }
}


class EventManager {
  constructor() {
    this.listeners = new Map();
    this.debounceTimers = new Map();
  }

  on(eventName, element, handler, options = {}) {
    if (!element) return;

    const key = `${eventName}-${element.id || Math.random()}`;

    let wrappedHandler = handler;
    if (options.debounce) {
      wrappedHandler = this.debounce(handler, options.debounce);
    }

    element.addEventListener(eventName, wrappedHandler);
    this.listeners.set(key, {element, handler: wrappedHandler, originalHandler: handler});

    return key;
  }

  off(key) {
    const listener = this.listeners.get(key);
    if (listener) {
      const [eventName] = key.split('-');
      listener.element.removeEventListener(eventName, listener.handler);
      this.listeners.delete(key);
    }
  }

  offAll() {
    this.listeners.forEach((listener, key) => {
      this.off(key);
    });
  }

  debounce(func, wait) {
    return (...args) => {
      const key = func.toString();
      clearTimeout(this.debounceTimers.get(key));

      const timer = setTimeout(() => {
        func.apply(this, args);
        this.debounceTimers.delete(key);
      }, wait);

      this.debounceTimers.set(key, timer);
    };
  }
}


class AnimationController {
  constructor(buttonSystem) {
    this.buttonSystem = buttonSystem;
    this.currentState = null;
    this.isPromptInjectionInProgress = false;
    this.isReinitializationInProgress = false;
  }

  
  transitionTo(newState, data) {
    

    
    if (this.isPromptInjectionInProgress) {
      if (newState !== 'successIdle' && newState !== 'successWithReview' && newState !== 'idle') {
        
        return; 
      }
    }

    
    this.currentState = newState;

    
    this.buttonSystem.stateMachine.transition(newState, data);

    
  }

  
  handlePromptInjection(button) {
    
    this.isPromptInjectionInProgress = true;

    
    
    this.buttonSystem.messageSystem.removeAllMessages();

    
    this.buttonSystem.messageSystem.enableMessageDelay();

    
    this.transitionTo('successIdle', { button });

    
    setTimeout(() => {
      this.isPromptInjectionInProgress = false;
      
    }, 2000);
  }

  
  handleButtonReinitialization(button) {
    
    this.isReinitializationInProgress = true;

    
    this.buttonSystem.messageSystem.removeAllMessages();

    
    this.buttonSystem.messageSystem.enableMessageDelay();

    
    this.transitionTo('idle', { button });

    
    setTimeout(() => {
      this.isReinitializationInProgress = false;
      
    }, 1000);
  }

  
  getCurrentState() {
    return this.currentState;
  }
}


class VelocityButtonSystem {
  constructor(config = {}) {
    this.config = {
      typingTimeout: 1000,
      idleTimeout: 0,
      messageDisplayTime: 4000,
      messageReappearTime: 20000,
      userExperienceKey: 'velocityUserExperience',
      maxWidth: 280,
      firstTimeStates: [3, 6, 7],
      loadingRings: 3,
      ringDelay: 500,
      messagePosition: 'relativeToButton',

      emptyInputCheckInterval: 1000
    };

    this.stateMachine = new AnimationStateMachine();
    this.animationManager = new AnimationManager();
    this.messageSystem = new MessageSystem();
    this.eventManager = new EventManager();

    
    this.animationController = new AnimationController(this);

    this.state = {
      isFirstTimeUser: true,
      currentButton: null,
      buttonPosition: null,
      typingTimer: null,
      idleTimer: null,
      idleInterval: null,
      isSuccessState: false,
      loadingHandler: null,
      ringAnimationInterval: null,
      ringElements: [],
      disableAnimations: false,
      
      emptyInputCheckIntervalId: null,
      currentInputElement: null,
      
      promptWasInjected: false
    };

    this.initialize();
  }

  initialize() {
    this.loadUserExperience();
    this.injectAnimationStyles();
    this.setupStates();
    this.setupAnimations();
    this.setupMessagePositionStrategies();
  }

  loadUserExperience() {
    chrome.storage.local.get([this.config.userExperienceKey], (result) => {
      this.state.isFirstTimeUser = !result[this.config.userExperienceKey];
      
    });
  }

  markAsReturningUser() {
    if (this.state.isFirstTimeUser) {
      this.state.isFirstTimeUser = false;
      chrome.storage.local.set({ [this.config.userExperienceKey]: true });
      
    }
  }

  shouldShowMessageForState(stateId) {
    return this.state.isFirstTimeUser || this.config.firstTimeStates.includes(stateId);
  }

  injectAnimationStyles() {
    if (document.getElementById('velocity-animation-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'velocity-animation-styles';
    styleEl.innerHTML = `
      
      @keyframes veloInnerPulseAndBounce {
        0% {
          box-shadow: inset 0 0 5px rgba(0, 136, 255, 0.3), 0 0 10px rgba(0, 136, 255, 0.5);
          transform: scale(1) translateX(0);
          border-radius: 50%;
        }
        50% {
          box-shadow: inset 0 0 15px rgba(0, 136, 255, 0.7), 0 0 10px rgba(0, 136, 255, 0.5);
          transform: scale(1.08) translateX(0px);
          border-radius: 50%;
        }
        100% {
          box-shadow: inset 0 0 5px rgba(0, 136, 255, 0.3), 0 0 10px rgba(0, 136, 255, 0.5);
          transform: scale(1) translateX(0);
          border-radius: 50%;
        }
      }

      @keyframes veloHalfCircleGlow {
        0% {
          background: radial-gradient(
            circle at center,
            rgba(0, 136, 255, 0.9) 0%,
            rgba(0, 136, 255, 0.5) 20%,
            rgba(0, 136, 255, 0.1) 45%,
            transparent 80%
          );
          transform: scale(0.7);
          opacity: 0.6;
        }
        50% {
          background: radial-gradient(
            circle at center,
            rgba(0, 136, 255, 0.9) 0%,
            rgba(0, 136, 255, 0.6) 20%,
            rgba(0, 136, 255, 0.3) 30%,
            rgba(0, 136, 255, 0.1) 45%,
            transparent 80%
          );
          transform: scale(1.0);
          opacity: 0.9;
        }
        100% {
          background: radial-gradient(
            circle at center,
            rgba(0, 136, 255, 0.9) 0%,
            rgba(0, 136, 255, 0.5) 20%,
            rgba(0, 136, 255, 0.1) 45%,
            transparent 80%
          );
          transform: scale(0.7);
          opacity: 0.6;
        }
      }

      @keyframes veloTypingScale {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      @keyframes veloIdleTypingShakeBounce {
        0% {
          transform: translateY(0) scale(1);
          box-shadow: inset 0 0 20px rgba(0, 136, 255, 0.5), 0 0 15px rgba(0, 136, 255, 0.7);
        }
        50% {
          transform: translateY(-4px) scale(1.03);
          box-shadow: inset 0 0 35px rgba(0, 136, 255, 0.55), 0 0 20px rgba(0, 136, 255, 0.7);
        }
        100% {
          transform: translateY(0) scale(1);
          box-shadow: inset 0 0 20px rgba(0, 136, 255, 0.5), 0 0 15px rgba(0, 136, 255, 0.7);
        }
      }

      @keyframes veloSuccessIdleShakeBounce {
        0% {
          transform: translateY(0) scale(1);
          box-shadow: inset 0 0 15px rgba(0, 136, 255, 0.5), 0 0 10px rgba(0, 136, 255, 0.3);
        }
        50% {
          transform: translateY(-4px) scale(1.03);
          box-shadow: inset 0 0 18px rgba(0, 136, 255, 0.55), 0 0 15px rgba(0, 136, 255, 0.4);
        }
        100% {
          transform: translateY(0) scale(1);
          box-shadow: inset 0 0 15px rgba(0, 136, 255, 0.5), 0 0 10px rgba(0, 136, 255, 0.3);
        }
      }

      @keyframes veloMultiRingPulse {
        0% {
          opacity: 1;
          transform: scale(1);
          border-width: 3px;
        }
        100% {
          opacity: 0;
          transform: scale(2);
          border-width: 1px;
        }
      }

      @keyframes veloRotation {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Animation classes */
      .velocity-inner-pulse-bounce {
        animation: veloInnerPulseAndBounce 2s infinite cubic-bezier(.36,.07,.19,.97);
      }

      .velocity-half-circle-glow {
        position: relative !important;
        z-index: 0 !important;
      }

      .velocity-half-circle-glow::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        margin: 0%;
        background-position: center;
        z-index: -1;
        pointer-events: none;
        animation: veloHalfCircleGlow 1.5s infinite cubic-bezier(.25,.1,.25,1);
      }

      .velocity-typing-scale {
        animation: veloTypingScale 1.5s infinite cubic-bezier(.45,.05,.55,.95) !important;
      }

      .velocity-idle-typing-effect {
        animation: veloIdleTypingShakeBounce 2s infinite cubic-bezier(.36,.07,.19,.97);
      }

      .velocity-success-idle-effect {
        animation: veloSuccessIdleShakeBounce 2s infinite cubic-bezier(.36,.07,.19,.97);
      }

      .velocity-multi-ring-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        border-radius: 50%;
        overflow: visible;
        z-index: 10;
      }

      .velocity-multi-ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 3px solid rgba(77, 171, 247, 0.8);
        box-sizing: border-box;
        opacity: 0;
      }

      .velocity-loading-animation {
        background-color: black !important;
        animation: veloRotation 1.5s linear infinite;
      }

      .velocity-message-box {
        position: fixed;
        animation: fadeIn 0.3s ease-in-out;
        z-index: 999999 !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        padding: 10px 20px;
        border-radius: 10px;
        color: var(--message-text-color, #000000);
        background-color: var(--message-bg-color, hsl(190, 95%, 90%));
        pointer-events: none;
        max-width: 280px;
        text-align: left;
        border: 2px solid rgba(0, 0, 0, 0.85);
        white-space: pre-line;
      }

      /* Enter key icon styling */
      :root {
        --enter-key-filter: none;
      }

      .dark-theme, html[data-theme="dark"], .velocity-dark-mode {
        --enter-key-filter: invert(1);
      }

      .velocity-enter-icon {
        display: inline-block;
        vertical-align: middle;
        height: 14px;
        filter: var(--enter-key-filter, none);
      }

      /* Dark mode message box styles */
      .dark-theme .velocity-message-box,
      html[data-theme="dark"] .velocity-message-box,
      .velocity-dark-mode .velocity-message-box {
        background-color: hsl(197, 40%, 14%);
        color: #ffffff;
        border: 2px solid rgba(0, 0, 0, 0.85);
      }

      .dark-theme .velocity-enter-icon,
      html[data-theme="dark"] .velocity-enter-icon,
      .velocity-dark-mode .velocity-enter-icon {
        filter: invert(1);
      }

      /* Light mode message box styles */
      .light-theme .velocity-message-box,
      html[data-theme="light"] .velocity-message-box,
      .velocity-light-mode .velocity-message-box {
        background-color: hsl(190, 95%, 90%);
        color: #000000;
        border: 2px solid rgba(0, 0, 0, 0.85);
      }

      .light-theme .velocity-enter-icon,
      html[data-theme="light"] .velocity-enter-icon,
      .velocity-light-mode .velocity-enter-icon {
        filter: none;
      }
    `;
    document.head.appendChild(styleEl);
  }

  setupStates() {
    // States config will be loaded from animationConfig.js
  }

  setupAnimations() {
    // Animation registrations will be loaded from animationConfig.js
  }

  setupMessagePositionStrategies() {
    this.messageSystem.registerPositionStrategy('relativeToButton', (element, config) => {
      const button = config.button || this.state.currentButton;
      if (!button) {
        console.error('[Velocity] No button available for message positioning');
        return;
      }

      const buttonContainer = button.closest('.velocity-button-container');
      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const messageWidth = this.config.maxWidth;

      // Get existing styles to maintain them
      const styleProps = {
        backgroundColor: element.style.backgroundColor,
        color: element.style.color,
        border: element.style.border
      };

      // Common CSS for all positions
      const commonCss = `
        background-color: ${styleProps.backgroundColor || 'hsl(190, 95%, 90%)'};
        color: ${styleProps.color || '#000000'};
        border: ${styleProps.border || '2px solid rgba(0, 0, 0, 0.85)'};
        padding: 10px 20px;
        border-radius: 10px;
        font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        max-width: ${messageWidth}px;
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        text-align: left;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transform: translateZ(0);
        white-space: pre-line;
      `;

      
      let buttonPosition = 'right';
      if (buttonContainer && buttonContainer.dataset.anchorPosition) {
        const anchorPosition = buttonContainer.dataset.anchorPosition;
        buttonPosition = anchorPosition.includes('left') ? 'left' : 'right';
      }

      
      const isPromptReview = element.dataset && element.dataset.state === 'promptReview';

      
      if (isPromptReview) {
        if (buttonPosition === 'left' && rect.left > messageWidth + 20) {
          
          element.style.cssText = `
            ${commonCss}
            left: ${rect.left - messageWidth - 8}px;
            top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
          `;
        } else {
          
          element.style.cssText = `
            ${commonCss}
            left: ${rect.right + 15}px;
            top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
          `;

          
          if (rect.right + messageWidth + 20 >= viewportWidth) {
            element.style.cssText = `
              ${commonCss}
              left: ${rect.left - messageWidth - 8}px;
              top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
            `;
          }
        }
        return; 
      }

      
      if (buttonPosition === 'left') {
        
        if (rect.left > messageWidth + 20) {
          
          element.style.cssText = `
            ${commonCss}
            left: ${rect.left - messageWidth - 8}px;
            top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
          `;
        } else if (rect.right + messageWidth + 20 < viewportWidth) {
          
          element.style.cssText = `
          ${commonCss}
          left: ${rect.right + 15}px;
          top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
        `;
      } else if (rect.top > 80) {
        
        element.style.cssText = `
          ${commonCss}
          left: ${Math.max(10, Math.min(viewportWidth - messageWidth - 10, rect.left + (rect.width / 2) - (messageWidth / 2)))}px;
          top: ${rect.top - 60}px;
        `;
      } else {
        
        element.style.cssText = `
          ${commonCss}
          left: ${Math.max(10, Math.min(viewportWidth - messageWidth - 10, rect.left + (rect.width / 2) - (messageWidth / 2)))}px;
          top: ${rect.bottom + 10}px;
        `;
      }
    } else {

      if (rect.right + messageWidth + 20 < viewportWidth) {
        
        element.style.cssText = `
          ${commonCss}
          left: ${rect.right + 15}px;
          top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
        `;
      } else if (rect.left > messageWidth + 20) {
        
        element.style.cssText = `
          ${commonCss}
          left: ${rect.left - messageWidth - 8}px;
          top: ${Math.max(10, Math.min(viewportHeight - 70, rect.top))}px;
        `;
      } else if (rect.top > 80) {
        
        element.style.cssText = `
          ${commonCss}
          left: ${Math.max(10, Math.min(viewportWidth - messageWidth - 10, rect.left + (rect.width / 2) - (messageWidth / 2)))}px;
          top: ${rect.top - 60}px;
        `;
      } else {
        
        element.style.cssText = `
          ${commonCss}
          left: ${Math.max(10, Math.min(viewportWidth - messageWidth - 10, rect.left + (rect.width / 2) - (messageWidth / 2)))}px;
          top: ${rect.bottom + 10}px;
        `;
      }
    }

    
    element.offsetHeight;
  });
}

findButton(platformConfig) {
  const observer = new MutationObserver(() => {
    const button = document.querySelector('.custom-injected-button button');
    if (!button || button === this.state.currentButton) return;

    this.state.currentButton = button;

    const buttonContainer = button.closest('.velocity-button-container');
    if (buttonContainer) {
      this.storeButtonPosition(buttonContainer);
    }

    const inputBox = document.querySelector(platformConfig.textAreaSelector);

    if (button && inputBox) {
      

      this.setupEventListeners(inputBox, button);
      observer.disconnect();

      
      this.state.currentInputElement = inputBox;

      
      this.startEmptyInputCheck(inputBox, button);

      setTimeout(() => {
        if (this.shouldShowMessageForState(1)) {
          this.showWelcomeMessage(button);
        } else {
          this.stateMachine.transition('idle', { button });
        }
      }, 1000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


startEmptyInputCheck(inputElement, button) {
  if (this.state.emptyInputCheckIntervalId) {
    clearInterval(this.state.emptyInputCheckIntervalId);
  }

  this.state.emptyInputCheckIntervalId = setInterval(() => {
    this.checkAndHandleEmptyInput(inputElement, button);
  }, this.config.emptyInputCheckInterval);

  
}


checkAndHandleEmptyInput(inputElement, button) {
  if (!inputElement || !button) return;

  const hasContent = this.checkInputHasContent();
  const currentState = this.stateMachine.getCurrentState();

  
  if (!hasContent && currentState !== 'idle') {
    

    
    if (this.state.isSuccessState) {
      this.state.isSuccessState = false;
    }


    this.stateMachine.transition('idle', { button });
  }
  
  else if (hasContent && currentState === 'idle' && this.state.hasStartedTyping) {
    
    this.stateMachine.transition('typingStopped', { button });
  }
}

setupEventListeners(inputElement, button) {
  if (!inputElement || !button) return;

  
  const handleInput = () => {
    
    this.state.hasStartedTyping = true;

    
    clearTimeout(this.state.typingTimer);
    clearTimeout(this.state.idleTimer);
    clearInterval(this.state.idleInterval);

    
    const hasContent = this.checkInputHasContent();

    
    if (this.state.isSuccessState && !hasContent) {
      
      this.state.isSuccessState = false;
      this.stateMachine.transition('idle', { button });
      return;
    }

    
    if (this.state.isSuccessState) return;

    
    if (!hasContent) {
      this.stateMachine.transition('idle', { button });
      return;
    }

    
    this.stateMachine.transition('typing', { button });

    
    this.state.typingTimer = setTimeout(() => {
      if (this.state.isSuccessState) return;

      
      if (this.checkInputHasContent()) {
        this.stateMachine.transition('typingStopped', { button });
      } else {
        this.stateMachine.transition('idle', { button });
      }
    }, this.config.typingTimeout);
  };

  
  this.eventManager.on('input', inputElement, handleInput);
  this.eventManager.on('keyup', inputElement, handleInput);


  const handleDelete = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      
      setTimeout(() => {
        const hasContent = this.checkInputHasContent();
        if (!hasContent && this.stateMachine.getCurrentState() !== 'idle') {
          

          
          if (this.state.isSuccessState) {
            this.state.isSuccessState = false;
          }

          this.stateMachine.transition('idle', { button });
        }
      }, 50);
    }
  };

  this.eventManager.on('keydown', inputElement, handleDelete);

  
  let pressTimer = null;
  let isDragging = false;

  this.eventManager.on('mousedown', button, () => {
    pressTimer = setTimeout(() => isDragging = true, 200);
  });

  this.eventManager.on('mouseup', button, () => {
    clearTimeout(pressTimer);
    if (!isDragging) {
      this.handleButtonClick(button);
    }
    isDragging = false;
  });

  this.eventManager.on('click', button, (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  
  window.markPromptSuccess = (promptReviewBoxVisible = false) => {
    
    if (!this.checkInputHasContent()) {
      
      this.state.isSuccessState = false;
      this.stateMachine.transition('idle', { button });
    } else {
      this.handleSuccessState(button, false); 
    }
  };

  
  
}

handleButtonClick(button) {
  if (!this.checkInputHasContent()) {
    this.messageSystem.showMessage('warning', {
      text: 'Please enter some text before enhancing!',
      type: 'warning',
      button,
      positionStrategy: 'relativeToButton',
      duration: 3000
    }, 'high'); 
    return;
  }

  this.markAsReturningUser();

  
  this.animationController.transitionTo('loading', { button });
}


handleSuccessState(button, promptReviewBoxVisible = false) {
  
  if (!this.checkInputHasContent()) {
    
    this.state.isSuccessState = false;
    this.animationController.transitionTo('idle', { button });
    return;
  }

  this.state.isSuccessState = true;

  
  this.cleanupLoadingAnimation(button);
  this.animationManager.stopAnimation('loading');

  
  button.classList.remove('velocity-loading-animation');

  
  const state = promptReviewBoxVisible ? 'successWithReview' : 'successIdle';

  if (promptReviewBoxVisible) {
    
    this.messageSystem.removeMessage('successWithReview');
    this.messageSystem.removeMessage('successIdle');
    this.messageSystem.removeMessage('loading');

    
    this.state.isSuccessState = true;
    this.animationManager.startAnimation(state, button);
  } else {
    
    this.animationController.transitionTo(state, { button });

    
    if (this.shouldShowMessageForState(7)) {
      this.messageSystem.showMessage('successIdle', {
        text: '<div style="font-size: 14px; font-weight: 600; color: var(--velocity-text-color, var(--dark-mode) ? "#ffffff" : "#000");">Prompt enhanced!</div><div style="font-size: 13px; color: var(--velocity-secondary-text-color, var(--dark-mode) ? "#9CA3AF" : "#0B0B0Bb7");">Hit <img src="' + chrome.runtime.getURL("assets/enterkey.png") + '" class="velocity-enter-icon" style="height: 20px; vertical-align: middle; filter: var(--enter-key-filter, none);"> if you are satisfied</div>',
        type: 'success',
        button,
        positionStrategy: 'relativeToButton',
        isHTML: true,
        customStyle: 'border: 1px solid var(--velocity-border-color, rgba(0, 0, 0, 0.1)); box-shadow: 4px 2px 10px var(--velocity-shadow-color, rgba(0, 0, 0, 0.6)); border-radius: 8px; background-color: var(--velocity-background-color, #fff);'
      }, 'medium');
    }
  }

 
}


handlePromptInjection(button) {
  
  this.animationController.handlePromptInjection(button);

  
  this.state.promptWasInjected = true;

  
  setTimeout(() => {
    if (this.shouldShowMessageForState(7)) {
      this.messageSystem.showMessage('promptInjected', {
        text: 'Prompt successfully injected!',
        type: 'success',
        button,
        positionStrategy: 'relativeToButton',
        duration: 3000
      }, 'medium');
    }
  }, 2000);
}


updatePromptReviewStatus(isVisible) {
  
  if (!this.checkInputHasContent()) {
   
    this.state.isSuccessState = false;
    this.animationController.transitionTo('idle', { button: this.state.currentButton });
    return;
  }

  if (this.state.isSuccessState) {
    const state = isVisible ? 'successWithReview' : 'successIdle';

    
    if (!isVisible) {
      this.animationController.transitionTo(state, { button: this.state.currentButton });

      
      if (this.shouldShowMessageForState(7)) {
        this.messageSystem.showMessage('successIdle', {
          text: '<div style="font-size: 14px; font-weight: 600; color: var(--velocity-text-color, var(--dark-mode) ? "#ffffff" : "#000");">Prompt enhanced!</div><div style="font-size: 13px; color: var(--velocity-secondary-text-color, var(--dark-mode) ? "#9CA3AF" : "#0B0B0Bb7");">Hit <img src="' + chrome.runtime.getURL("assets/enterkey.png") + '" class="velocity-enter-icon" style="height: 20px; vertical-align: middle; filter: var(--enter-key-filter, none);"> if you are satisfied</div>',
          type: 'success',
          button: this.state.currentButton,
          positionStrategy: 'relativeToButton',
          isHTML: true,
          customStyle: 'border: 1px solid var(--velocity-border-color, rgba(0, 0, 0, 0.1)); box-shadow: 4px 2px 10px var(--velocity-shadow-color, rgba(0, 0, 0, 0.6)); border-radius: 8px; background-color: var(--velocity-background-color, #fff);'
        }, 'medium');
      }
    } else {
      
      this.messageSystem.removeAllMessages();

      
      this.state.isSuccessState = true;
      this.animationManager.startAnimation(state, this.state.currentButton);
    }
  }
}

checkInputHasContent() {
  try {
    const possibleInputs = document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]');

    for (const inputBox of possibleInputs) {
      let content = "";

      if (inputBox.tagName === "TEXTAREA") {
        content = inputBox.value.trim();
      } else if (inputBox.hasAttribute("contenteditable")) {
        content = inputBox.innerText.trim();
      } else {
        content = (inputBox.value || inputBox.innerText || inputBox.textContent || "").trim();
      }

      if (content.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[Velocity] Error checking input content:", error);
    return true;
  }
}

storeButtonPosition(buttonContainer) {
  if (!buttonContainer) return;

  this.state.buttonPosition = {
    top: buttonContainer.style.top,
    left: buttonContainer.style.left,
    right: buttonContainer.style.right,
    bottom: buttonContainer.style.bottom,
    transform: buttonContainer.style.transform,
    anchorPosition: buttonContainer.dataset.anchorPosition
  };
}

restoreButtonPosition(buttonContainer) {
  if (!buttonContainer || !this.state.buttonPosition) return;

  Object.assign(buttonContainer.style, this.state.buttonPosition);

  if (this.state.buttonPosition.anchorPosition) {
    buttonContainer.dataset.anchorPosition = this.state.buttonPosition.anchorPosition;
  }
}

showWelcomeMessage(button) {
  this.messageSystem.showMessage('welcome', {
    text: "Hey I'm Velocity! I can help you to enhance your prompt.",
    type: 'info',
    button,
    positionStrategy: 'relativeToButton',
    duration: 6000
  });
}

createMultiRingAnimation(button) {
  this.cleanupLoadingAnimation(button);

  let ringContainer = button.querySelector('.velocity-multi-ring-container');
  if (!ringContainer) {
    ringContainer = document.createElement('div');
    ringContainer.className = 'velocity-multi-ring-container';
    button.appendChild(ringContainer);
  }

  for (let i = 0; i < this.config.loadingRings; i++) {
    const ring = document.createElement('div');
    ring.className = 'velocity-multi-ring';
    ring.style.animation = `veloMultiRingPulse 2s ease-out ${i * this.config.ringDelay}ms infinite`;
    ringContainer.appendChild(ring);
    this.state.ringElements.push(ring);
  }

  this.startRingAnimationCycle(button);
}

startRingAnimationCycle(button) {
  
  if (this.state.ringAnimationInterval) {
    clearInterval(this.state.ringAnimationInterval);
  }

  this.state.ringAnimationInterval = setInterval(() => {
    // Continue animation until explicitly stopped, regardless of state
    const ringContainer = button.querySelector('.velocity-multi-ring-container');
    if (ringContainer) {
      const ring = document.createElement('div');
      ring.className = 'velocity-multi-ring';
      ring.style.animation = 'veloMultiRingPulse 2s ease-out 0ms forwards';
      ringContainer.appendChild(ring);

      setTimeout(() => {
        if (ring.parentNode) {
          ring.parentNode.removeChild(ring);
        }
      }, 2100);
    }
  }, 800);
}

cleanupLoadingAnimation(button) {
  if (this.state.ringAnimationInterval) {
    clearInterval(this.state.ringAnimationInterval);
    this.state.ringAnimationInterval = null;
  }

  const existingContainer = button.querySelector('.velocity-multi-ring-container');
  if (existingContainer) {
    button.removeChild(existingContainer);
  }

  this.state.ringElements = [];
}

// Public API
init(platformConfig) {
  this.findButton(platformConfig);
}

reset() {
  this.state.isSuccessState = false;
  this.animationManager.stopAllAnimations();
  this.messageSystem.removeAllMessages();
  this.eventManager.offAll();

  clearTimeout(this.state.typingTimer);
  clearTimeout(this.state.idleTimer);
  clearInterval(this.state.idleInterval);

  if (this.state.loadingHandler) {
    this.state.loadingHandler.clear();
    this.state.loadingHandler = null;
  }

  if (this.state.currentButton) {
    this.cleanupLoadingAnimation(this.state.currentButton);
  }

  // Also clear the empty input check interval
  if (this.state.emptyInputCheckIntervalId) {
    clearInterval(this.state.emptyInputCheckIntervalId);
    this.state.emptyInputCheckIntervalId = null;
  }

  this.stateMachine.transition('idle', { button: this.state.currentButton });
}

disableAnimations() {
  this.state.disableAnimations = true;
  this.animationManager.stopAllAnimations();
  this.messageSystem.removeAllMessages();

  if (this.state.currentButton) {
    this.state.currentButton.classList.remove(
      'velocity-loading-animation',
      'velocity-half-circle-glow',
      'velocity-inner-pulse-bounce',
      'velocity-idle-typing-effect',
      'velocity-success-idle-effect'
    );
  }
}

enableAnimations() {
  this.state.disableAnimations = false;
}
}

// Export the system
window.VelocityButtonSystem = VelocityButtonSystem;