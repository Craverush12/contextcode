# Velocity Mixpanel Implementation Plan

This document provides a step-by-step implementation plan for adding Mixpanel event tracking to the Velocity website and extension.

## Phase 1: Core Website Tracking

### Step 1: Add Page Visit Tracking

Update `src/app/layout.js` to track page visits:

```jsx
import EventTracking from '@/utils/eventTracking';
import { useEffect } from 'react';

// Inside the RootLayout component
useEffect(() => {
  // Track page visit on initial load
  EventTracking.trackVisit();
}, []);
```

### Step 2: Update Navbar Component

Update `src/components/layout/Navbar.jsx`:

```jsx
// Replace existing button click handlers
<button 
  onClick={() => {
    EventTracking.trackButtonClick("Get Started", {
      location: "navbar_desktop",
      destination: "register_page"
    });
  }}
  className="..."
>
  Get Started
</button>
```

### Step 3: Update Home Component

Update `src/components/home/index.jsx`:

```jsx
// Replace existing Try for Free button
<a
  href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    EventTracking.trackButtonClick("Try for Free", {
      location: "hero_section",
      destination: "chrome_web_store"
    });
    EventTracking.trackRedirectToWebstore("landing_page");
  }}
  className="..."
>
  Try now for Free
</a>
```

## Phase 2: Authentication Flow Tracking

### Step 1: Update Register Component

Update `src/components/Pages/Register.jsx`:

```jsx
// On form submission
const handleSubmit = async (event) => {
  // Existing code...
  
  // Track redirection to register if coming from another page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source') || 'direct';
    EventTracking.trackRedirectToRegister(source);
  }, []);
  
  // On successful registration
  if (response.ok) {
    EventTracking.trackRegisterSuccess("email", {
      userId: data.userId,
      email: email,
      name: `${firstName} ${lastName}`
    });
    
    // If redirecting to webstore
    EventTracking.trackRedirectToWebstore("post_register");
  }
};
```

### Step 2: Update Login Component

Update `src/components/Pages/Login.jsx`:

```jsx
// On successful login
if (response.ok) {
  // Existing login code...
  
  // Track login event
  Analytics.track("User Login", {
    method: "email",
    timestamp: new Date().toISOString(),
    flow: localStorage.getItem('flow') || 'Flow 1'
  });
  
  // Identify user in Mixpanel
  if (data.userdata.userId) {
    Analytics.identify(data.userdata.userId);
    Analytics.setUserProperties({
      email: data.userdata.userEmail,
      username: data.userdata.userName,
      lastLogin: new Date().toISOString()
    });
  }
}
```

## Phase 3: Extension Tracking

### Step 1: Create Extension Analytics Module

Create `extension/src/utils/analytics.js`:

```javascript
import mixpanel from 'mixpanel-browser';
import EventTracking from './eventTracking';

// Initialize Mixpanel
const MIXPANEL_TOKEN = '48a67766d0bb1b3399a4f956da9c52da';
mixpanel.init(MIXPANEL_TOKEN, {
  debug: false,
  track_pageview: false,
  persistence: 'localStorage'
});

// Export EventTracking for use in extension
export default EventTracking;
```

### Step 2: Track Extension Open Event

In `extension/src/background.js`:

```javascript
import EventTracking from './utils/eventTracking';

// When extension is opened
chrome.runtime.onStartup.addListener(() => {
  EventTracking.trackExtensionOpened({
    extension_version: chrome.runtime.getManifest().version
  });
});

chrome.action.onClicked.addListener(() => {
  EventTracking.trackExtensionOpened({
    extension_version: chrome.runtime.getManifest().version,
    trigger: 'icon_click'
  });
});
```

### Step 3: Track Prompt Typing

In `extension/src/content.js`:

```javascript
import EventTracking from './utils/eventTracking';

// When prompt is typed
const trackPromptInput = (element) => {
  let typingTimer;
  element.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      EventTracking.trackPromptTyped(element.value.length, {
        platform: detectPlatform(),
        prompt_type: 'user_input'
      });
    }, 1000); // Debounce for 1 second
  });
};

// Detect which LLM platform is being used
const detectPlatform = () => {
  if (window.location.hostname.includes('chat.openai.com')) {
    return 'ChatGPT';
  } else if (window.location.hostname.includes('claude.ai')) {
    return 'Claude';
  } else {
    return 'Other';
  }
};
```

### Step 4: Track Button Usage in LLM

In `extension/src/content.js`:

```javascript
import EventTracking from './utils/eventTracking';

// When a button is clicked in the LLM interface
const trackButtonClicks = () => {
  document.querySelectorAll('.velocity-button').forEach(button => {
    button.addEventListener('click', () => {
      EventTracking.trackButtonUsedInLLM(
        button.getAttribute('data-button-name'),
        detectPlatform()
      );
    });
  });
};
```

## Phase 4: Trial End Tracking

### Step 1: Create Trial End Component

Create `src/components/TrialEndModal.jsx`:

```jsx
import EventTracking from '@/utils/eventTracking';

const TrialEndModal = ({ daysInTrial, remainingPrompts, onClose }) => {
  useEffect(() => {
    // Track when modal is shown
    EventTracking.trackTrialFinishedPopupShown(daysInTrial, {
      remaining_prompts: remainingPrompts
    });
  }, [daysInTrial, remainingPrompts]);

  const handleRegisterClick = () => {
    // Track redirection to register
    EventTracking.trackRedirectToRegisterFromTrialEnded({
      remaining_prompts: remainingPrompts
    });
    router.push('/register?source=trial_ended');
  };

  return (
    <div className="modal">
      <h2>Your Trial Has Ended</h2>
      <p>Register now to continue using Velocity</p>
      <button onClick={handleRegisterClick}>Register Now</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
};
```

## Phase 5: Mixpanel Dashboard Setup

### Step 1: Create Main Conversion Funnel

In Mixpanel:
1. Go to Funnels
2. Create a new funnel with these steps:
   - Visit Website
   - Click Get Started / Click Try For Free
   - Redirected to Register
   - Register Success
   - Redirected to Webstore
   - Download Extension
   - Extension Opened

### Step 2: Create Extension Usage Funnel

In Mixpanel:
1. Go to Funnels
2. Create a new funnel with these steps:
   - Extension Opened
   - Prompt Typed
   - Button Used in LLM

### Step 3: Create Trial Conversion Funnel

In Mixpanel:
1. Go to Funnels
2. Create a new funnel with these steps:
   - Trial Finished Pop-up Shown
   - Redirected to Register from Trial Ended
   - Register Success

### Step 4: Create Dashboards

Create dashboards for:
1. **Acquisition Metrics**
2. **Engagement Metrics**
3. **Retention Metrics**

## Phase 6: A/B Testing Setup

### Step 1: Create Flow Assignment Logic

In `src/utils/flowAssignment.js`:

```javascript
/**
 * Assigns a user to a flow based on various criteria
 * @returns {string} The assigned flow
 */
export const assignFlow = () => {
  // Check if flow is already assigned
  if (typeof window !== 'undefined') {
    const existingFlow = localStorage.getItem('flow');
    if (existingFlow) return existingFlow;
    
    // Assign flow based on criteria (e.g., random, date, etc.)
    const flows = ['Flow 1', 'Flow 2', 'Flow 3', 'Flow 4'];
    const randomFlow = flows[Math.floor(Math.random() * flows.length)];
    
    localStorage.setItem('flow', randomFlow);
    return randomFlow;
  }
  
  return 'Flow 1'; // Default flow
};
```

### Step 2: Implement Flow Assignment

In `src/app/layout.js`:

```jsx
import { assignFlow } from '@/utils/flowAssignment';
import EventTracking from '@/utils/eventTracking';

// Inside the RootLayout component
useEffect(() => {
  // Assign flow and track page visit
  const flow = assignFlow();
  EventTracking.trackVisit({ flow });
}, []);
```

## Implementation Timeline

1. **Week 1**: Set up core website tracking (Phases 1-2)
2. **Week 2**: Implement extension tracking (Phase 3)
3. **Week 3**: Add trial end tracking (Phase 4)
4. **Week 4**: Set up Mixpanel dashboards and A/B testing (Phases 5-6)

## Testing Plan

1. Test each event by manually triggering the actions
2. Verify events appear in Mixpanel Live View
3. Check that all properties are correctly included
4. Validate user identification works correctly
5. Test funnels with complete user journeys
