# Current Mixpanel Analytics Implementation

This document provides an overview of the current Mixpanel analytics implementation in the Velocity project, focusing on what's already being tracked.

## Core Analytics Setup

### Mixpanel Initialization

The project initializes Mixpanel in two locations:

1. **src/lib/analytics.js**
```javascript
import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '48a67766d0bb1b3399a4f956da9c52da';
mixpanel.init(MIXPANEL_TOKEN, {
  debug: process.env.NODE_ENV === 'development',
  track_pageview: true,
  persistence: 'localStorage',
});
```

2. **src/config/analytics.js**
```javascript
import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = '48a67766d0bb1b3399a4f956da9c52da';

mixpanel.init(MIXPANEL_TOKEN, {
  debug: process.env.NODE_ENV !== 'production',
  track_pageview: true,
  persistence: 'localStorage'
});
```

### Analytics Wrapper

The project uses a wrapper around Mixpanel for consistent tracking:

```javascript
// src/lib/analytics.js
const Analytics = {
  // Track event with properties
  track: (event_name, properties = {}) => {
    try {
      mixpanel.track(event_name, properties);
    } catch (error) {
      console.error('Mixpanel tracking error:', error);
    }
  },

  // Identify user
  identify: (userId, userProperties = {}) => {
    try {
      mixpanel.identify(userId);
      if (Object.keys(userProperties).length > 0) {
        mixpanel.people.set(userProperties);
      }
    } catch (error) {
      console.error('Mixpanel identify error:', error);
    }
  },

  // Reset user (for logout)
  reset: () => {
    try {
      mixpanel.reset();
    } catch (error) {
      console.error('Mixpanel reset error:', error);
    }
  }
};
```

## Current Tracking Utilities

### 1. Event Tracking (src/utils/eventTracking.js)

This utility handles various event types:

```javascript
const EventTracking = {
  // Track page visits
  trackVisit: (additionalProps = {}) => {
    // Get referrer information
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const referrerDomain = referrer ? new URL(referrer).hostname : '';
    
    // Determine visitor type
    let visitorType = 'First Time Visitor';
    
    if (typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('token');
      const hasVisited = !!localStorage.getItem('hasVisitedBefore');
      
      if (hasToken) {
        visitorType = 'User';
      } else if (hasVisited) {
        visitorType = 'Window Shopper';
      }
      
      // Mark as visited for future visits
      localStorage.setItem('hasVisitedBefore', 'true');
    }
    
    // Get URL parameters for campaign tracking
    const urlParams = typeof window !== 'undefined' ? 
      new URLSearchParams(window.location.search) : new URLSearchParams();
    const utmSource = urlParams.get('utm_source') || '';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';
    
    // Track the event
    Analytics.track('Website Visit', {
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer,
      referrerDomain,
      visitorType,
      timestamp: new Date().toISOString(),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      ...additionalProps
    });
  },
  
  // Track button clicks
  trackButtonClick: (buttonName, additionalProps = {}) => {
    Analytics.track('Button Clicked', {
      buttonName,
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
      ...additionalProps
    });
  },
  
  // Other tracking methods...
}
```

### 2. Button Tracking (src/utils/buttonTracking.js)

Specialized utility for tracking button interactions:

```javascript
const ButtonTracking = {
  // Track button clicks
  trackButtonClick: (buttonName, additionalProps = {}, callback = null) => {
    const eventProps = {
      buttonName,
      location: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
      ...additionalProps
    };
    
    Analytics.track('Button Clicked', eventProps);
    
    if (callback && typeof callback === 'function') {
      callback();
    }
  },
  
  // Create tracked click handler
  createTrackedClickHandler: (buttonName, originalOnClick, additionalProps = {}) => {
    return (e) => {
      ButtonTracking.trackButtonClick(buttonName, additionalProps);
      
      if (originalOnClick && typeof originalOnClick === 'function') {
        originalOnClick(e);
      }
    };
  },
  
  // HOC for button tracking
  withButtonTracking: (ButtonComponent, buttonName, additionalProps = {}) => {
    return (props) => {
      const trackedOnClick = ButtonTracking.createTrackedClickHandler(
        buttonName,
        props.onClick,
        additionalProps
      );
      
      return <ButtonComponent {...props} onClick={trackedOnClick} />;
    };
  }
};
```

### 3. User Properties Tracking (src/utils/userProperties.js)

Tracks user-specific properties:

```javascript
// Track user engagement metrics
export const trackEngagementMetrics = (userId, metrics = {}) => {
  if (!userId) return;
  
  // First identify the user
  Analytics.identify(userId);
  
  // Update engagement metrics
  Analytics.setUserProperties({
    last_active: new Date().toISOString(),
    ...metrics
  });
  
  // Increment numeric metrics if provided
  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === 'number') {
      Analytics.incrementUserProperty(key, value);
    }
  });
};
```

## Currently Tracked Events

### 1. Page/Visit Events

```javascript
// In home component
useEffect(() => {
  // Track the website visit event
  EventTracking.trackVisit({
    page: 'home',
    section: 'landing'
  });
}, []);

// In QR page
useEffect(() => {
  Analytics.track("QR Page View", {
    deviceType: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(
      navigator.userAgent
    )
      ? "mobile"
      : "desktop",
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    userAgent: navigator.userAgent,
    language: navigator.language,
  });
}, []);
```

### 2. Button Click Events

```javascript
// Direct tracking
<button onClick={() => {
  Analytics.track("Button Clicked", {
    buttonName: "Get Started"
  });
}}>
  Get Started
</button>

// Using utility
<button onClick={() => 
  ButtonTracking.trackButtonClick('Sign in', {
    method: 'email',
    page: 'login'
  })
}>
  Sign in
</button>

// Using wrapped handler
<button onClick={ButtonTracking.createTrackedClickHandler(
  'Sign in with Google', 
  handleGoogleSignIn,
  { method: 'google', page: 'login' }
)}>
  Sign in with Google
</button>
```

### 3. User Authentication Events

```javascript
// Track login
EventTracking.trackUserLogin("email", userId, {
  email: userData.email,
  name: userData.name
});

// Track signup
EventTracking.trackUserSignup("email", userId, {
  email: userData.email,
  name: userData.name
});
```

### 4. Payment Events

```javascript
// Track payment completion
Analytics.track("Payment Completed", {
  amount: amount,
  credits: credits,
});

// Track payment failure
Analytics.track("Payment Failed", {
  amount: amount,
  error: error.message
});
```

## Limitations of Current Implementation

1. **No Session Duration Tracking**: The current implementation doesn't track how long users stay on the site, especially without interaction.

2. **Basic Referrer Tracking**: While referrer information is captured, it's not categorized or analyzed in depth.

3. **No Button Verification Tracking**: There's no specific tracking for button verification processes or success rates.

4. **Limited User Engagement Metrics**: The implementation tracks basic engagement but doesn't capture idle time or passive browsing.

5. **No Heartbeat Mechanism**: There's no way to track users who are on the site but not actively interacting.

These limitations are addressed in the Enhanced Analytics Implementation Plan.
