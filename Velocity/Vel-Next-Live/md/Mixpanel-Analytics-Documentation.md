# Mixpanel Analytics Documentation

This document provides a comprehensive overview of all Mixpanel analytics implementations in the Velocity project.

## Table of Contents

1. [Analytics Configuration](#analytics-configuration)
2. [Tracking Utilities](#tracking-utilities)
3. [Event Types](#event-types)
4. [Button Tracking](#button-tracking)
5. [User Identification](#user-identification)
6. [Page Tracking](#page-tracking)
7. [Error Tracking](#error-tracking)
8. [Extension Tracking](#extension-tracking)

## Analytics Configuration

### Mixpanel Initialization

The project initializes Mixpanel in two locations:

1. **src/lib/analytics.js**

```javascript
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN =
  process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "48a67766d0bb1b3399a4f956da9c52da";
mixpanel.init(MIXPANEL_TOKEN, {
  debug: process.env.NODE_ENV === "development",
  track_pageview: true,
  persistence: "localStorage",
});
```

2. **src/config/analytics.js**

```javascript
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "48a67766d0bb1b3399a4f956da9c52da";

mixpanel.init(MIXPANEL_TOKEN, {
  debug: process.env.NODE_ENV !== "production",
  track_pageview: true,
  persistence: "localStorage",
});
```

## Tracking Utilities

The project uses several utility files to standardize tracking:

### 1. Analytics Wrapper (src/lib/analytics.js)

```javascript
const Analytics = {
  // Track event with properties
  track: (event_name, properties = {}) => {
    try {
      mixpanel.track(event_name, properties);
    } catch (error) {
      console.error("Mixpanel tracking error:", error);
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
      console.error("Mixpanel identify error:", error);
    }
  },

  // Reset user (for logout)
  reset: () => {
    try {
      mixpanel.reset();
    } catch (error) {
      console.error("Mixpanel reset error:", error);
    }
  },
};
```

### 2. Button Tracking (src/utils/buttonTracking.js)

```javascript
const ButtonTracking = {
  trackButtonClick: (buttonName, additionalProps = {}, callback = null) => {
    const eventProps = {
      buttonName,
      location: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
      ...additionalProps,
    };

    Analytics.track("Button Clicked", eventProps);

    if (callback && typeof callback === "function") {
      callback();
    }
  },

  createTrackedClickHandler: (
    buttonName,
    originalOnClick,
    additionalProps = {}
  ) => {
    return (e) => {
      ButtonTracking.trackButtonClick(buttonName, additionalProps);
      if (originalOnClick && typeof originalOnClick === "function") {
        originalOnClick(e);
      }
    };
  },

  withButtonTracking: (ButtonComponent, buttonName, additionalProps = {}) => {
    return (props) => {
      const trackedOnClick = ButtonTracking.createTrackedClickHandler(
        buttonName,
        props.onClick,
        additionalProps
      );
      return <ButtonComponent {...props} onClick={trackedOnClick} />;
    };
  },
};
```

### 3. Event Tracking (src/utils/eventTracking.js)

A comprehensive utility that handles various event types:

```javascript
const EventTracking = {
  trackVisit: (additionalProps = {}) => {
    /* ... */
  },
  trackButtonClick: (buttonName, additionalProps = {}) => {
    /* ... */
  },
  trackRedirectToRegister: (source, additionalProps = {}) => {
    /* ... */
  },
  trackRegisterSuccess: (method, userData = {}) => {
    /* ... */
  },
  trackRedirectToWebstore: (source, additionalProps = {}) => {
    /* ... */
  },
  trackDownloadExtension: (additionalProps = {}) => {
    /* ... */
  },
  trackExtensionOpened: (additionalProps = {}) => {
    /* ... */
  },
  trackPromptTyped: (promptLength, additionalProps = {}) => {
    /* ... */
  },
  trackButtonUsedInLLM: (buttonName, llmPlatform, additionalProps = {}) => {
    /* ... */
  },
  trackUserLogin: (method, userId, userData = {}) => {
    /* ... */
  },
  trackUserSignup: (method, userId, userData = {}) => {
    /* ... */
  },
  trackError: (errorType, errorMessage, additionalProps = {}) => {
    /* ... */
  },
};
```

## Event Types

The project tracks the following event types:

### 1. Page/Visit Events

- `Page View` - Automatic page view tracking
- `Website Visit` - Custom tracking for specific page visits

### 2. Button Events

- `Button Clicked` - Generic button click tracking
- `Get Started` - Tracking for CTA buttons
- `Try for Free` - Tracking for free trial buttons

### 3. User Events

- `User Login` - When a user logs in
- `User Signup` - When a user signs up
- `Register Success` - When registration is successful

### 4. Extension Events

- `Extension Opened` - When the browser extension is opened
- `Prompt Typed` - When a user types in the extension
- `Button Used in LLM` - When buttons are used in LLM platforms

### 5. Payment Events

- `Payment Completed` - When a payment is successfully processed
- `Payment Failed` - When a payment fails

### 6. Error Events

- `Error Occurred` - Generic error tracking

## Button Tracking

Buttons are tracked using several approaches:

### 1. Direct Analytics Call

```javascript
<button
  onClick={() => {
    Analytics.track("Button Clicked", {
      buttonName: "Get Started",
    });
  }}
>
  Get Started
</button>
```

### 2. Using ButtonTracking Utility

```javascript
<button
  onClick={() =>
    ButtonTracking.trackButtonClick("Sign in", {
      method: "email",
      page: "login",
    })
  }
>
  Sign in
</button>
```

### 3. Using Wrapped Click Handler

```javascript
<button
  onClick={ButtonTracking.createTrackedClickHandler(
    "Sign in with Google",
    handleGoogleSignIn,
    { method: "google", page: "login" }
  )}
>
  Sign in with Google
</button>
```

## User Identification

Users are identified in login and signup flows:

```javascript
// On successful login
Analytics.identify(userId);
Analytics.setUserProperties({
  last_login: new Date().toISOString(),
  login_method: method,
  ...userData,
});

// On successful signup
Analytics.identify(userId);
Analytics.setUserProperties({
  signup_date: new Date().toISOString(),
  signup_method: method,
  ...userData,
});
```

## Page Tracking

Pages are tracked when components mount:

```javascript
// In home component
useEffect(() => {
  // Track the website visit event
  EventTracking.trackVisit({
    page: "home",
    section: "landing",
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

## Error Tracking

Errors are tracked using a dedicated utility:

```javascript
// Track specific errors
EventTracking.trackError("api_error", "Failed to fetch user data", {
  endpoint: "/api/user",
  status: 500,
});

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
  Analytics.trackError("javascript_error", message, {
    source: source,
    line: lineno,
    column: colno,
    stack: error?.stack || "No stack trace available",
    user_agent: navigator.userAgent,
    url: window.location.href,
  });
};
```

## Extension Tracking

The browser extension tracks various events:

```javascript
// When extension is opened
EventTracking.trackExtensionOpened({
  extension_version: chrome.runtime.getManifest().version,
});

// When prompt is typed
EventTracking.trackPromptTyped(promptLength, {
  platform: "chatgpt",
});

// When button is used in LLM
EventTracking.trackButtonUsedInLLM("Enhance Prompt", "ChatGPT");
```

## Component-Specific Implementations

### Home Component (src/components/home/index.jsx)

```javascript
// Track page visit when component mounts
useEffect(() => {
  // Track the website visit event
  EventTracking.trackVisit({
    page: "home",
    section: "landing",
  });
}, []);

// Track "Try Now" button click
const handleTryNow = (e) => {
  if (localStorage.getItem("verifiedUserEmail")) {
    window.location.href = "/login";
    return;
  }
  e.preventDefault();
  Analytics.track("Button Clicked", {
    buttonName: "Try for Free",
  });

  // Scroll to the PromptBox
  const promptBox = document.getElementById("promptarea");
  if (promptBox) {
    promptBox.scrollIntoView({ behavior: "smooth" });
  }
};
```

### Profile Page (src/components/Pages/ProfilePage.jsx)

```javascript
// Track "Get More Credits" button click
<button
  onClick={() => {
    Analytics.track("Button Clicked", {
      buttonName: "GetMoreCredits",
    });
    setIsTopUpModalOpen(true);
  }}
  className="w-full bg-[#00C8F0] font-medium py-2.5 px-4 rounded-full
           hover:bg-gray-300 transition-colors duration-200 border-2 border-black"
>
  <span className="text-black font-medium">Get More Credits</span>
</button>;

// Track payment completion
Analytics.track("Payment Completed", {
  amount: amount,
  credits: credits,
});

// Track payment failure
Analytics.track("Payment Failed", {
  amount: amount,
  error: error.message,
});
```

### QR Page (src/components/Pages/QR.jsx)

```javascript
// Track page view
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

// Track download button click
const handleDownloadClick = () => {
  Analytics.track("Download Button Clicked", {
    location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
    timestamp: new Date().toISOString(),
  });
};

// Track social link clicks
const handleSocialClick = (platform) => {
  Analytics.track("Social Link Clicked", {
    platform,
    location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
  });
};

// Track "Try Now" button click
const handleTryNow = (e) => {
  e.preventDefault();
  Analytics.track("Button Clicked", {
    buttonName: "Try for Free",
    location: window.innerWidth >= 768 ? "desktop_view" : "mobile_view",
  });
  window.open(
    "https://chromewebstore.google.com/detail/velocity/ggiecgdncaiedmdnbmgjhpfniflebfpa",
    "_blank"
  );
};
```

### Launchlist Modal (src/components/Launchlist2.jsx)

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setFeedback({ type: "", message: "" });

  Analytics.track("Button Clicked", { buttonName: "Get Notified" });

  // Rest of submission logic...
};
```

## User Properties

The project tracks various user properties using Mixpanel's user profile functionality:

### Basic User Properties

```javascript
Analytics.setUserProperties({
  email: userData.email,
  name: userData.name,
  signup_date: new Date().toISOString(),
  signup_method: method,
});
```

### Login Properties

```javascript
Analytics.setUserProperties({
  last_login: new Date().toISOString(),
  login_method: method,
});
```

### Engagement Metrics

```javascript
// From src/utils/userProperties.js
export const trackEngagementMetrics = (userId, metrics = {}) => {
  if (!userId) return;

  // First identify the user
  Analytics.identify(userId);

  // Update engagement metrics
  Analytics.setUserProperties({
    last_active: new Date().toISOString(),
    ...metrics,
  });

  // Increment numeric metrics if provided
  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === "number") {
      Analytics.incrementUserProperty(key, value);
    }
  });
};
```

### User Preferences

```javascript
// From src/utils/userProperties.js
export const trackUserPreferences = (userId, preferences = {}) => {
  if (!userId) return;

  // First identify the user
  Analytics.identify(userId);

  // Create a properties object with prefixed keys
  const prefProperties = Object.entries(preferences).reduce(
    (acc, [key, value]) => {
      acc[`pref_${key}`] = value;
      return acc;
    },
    {}
  );

  // Update user properties with preferences
  Analytics.setUserProperties(prefProperties);
};
```

## Complete List of Tracked Events

| Event Name                | Description                              | Key Properties                        |
| ------------------------- | ---------------------------------------- | ------------------------------------- |
| `Button Clicked`          | Generic button click tracking            | `buttonName`, `location`, `timestamp` |
| `Website Visit`           | Tracks page visits                       | `page`, `section`, `referrer`         |
| `User Login`              | When a user logs in                      | `method`, `timestamp`, `flow`         |
| `User Signup`             | When a user signs up                     | `method`, `timestamp`, `flow`         |
| `Register Success`        | When registration is successful          | `method`, `userId`, `email`           |
| `Extension Opened`        | When the browser extension is opened     | `extension_version`, `registered`     |
| `Prompt Typed`            | When a user types in the extension       | `promptLength`, `registered`          |
| `Button Used in LLM`      | When buttons are used in LLM platforms   | `buttonName`, `llmPlatform`           |
| `Payment Completed`       | When a payment is successfully processed | `amount`, `credits`                   |
| `Payment Failed`          | When a payment fails                     | `amount`, `error`                     |
| `Error Occurred`          | Generic error tracking                   | `error_type`, `error_message`         |
| `QR Page View`            | When QR page is viewed                   | `deviceType`, `screenResolution`      |
| `Download Button Clicked` | When download button is clicked          | `location`, `timestamp`               |
| `Social Link Clicked`     | When social media link is clicked        | `platform`, `location`                |
| `Get Notified`            | When user joins launchlist               | `email`                               |

## Implementation Patterns

The project uses several patterns for implementing Mixpanel tracking:

### 1. Direct Component Tracking

```javascript
// In component render
<button
  onClick={() => {
    Analytics.track("Button Clicked", {
      buttonName: "Get Started",
    });
  }}
>
  Get Started
</button>
```

### 2. useEffect for Page Views

```javascript
// In component
useEffect(() => {
  Analytics.track("Page View", {
    page: "profile",
    timestamp: new Date().toISOString(),
  });
}, []);
```

### 3. Utility Functions

```javascript
// In event handler
const handleSignup = async (userData) => {
  // Process signup...

  // Track the event
  EventTracking.trackUserSignup("email", userData.userId, {
    email: userData.email,
    name: userData.name,
  });
};
```

### 4. Higher-Order Components

```javascript
// Create tracked button
const TrackedButton = ButtonTracking.withButtonTracking(Button, "Submit Form", {
  formType: "contact",
});

// Use in component
<TrackedButton onClick={handleSubmit}>Submit</TrackedButton>;
```

## Conclusion and Recommendations

The Velocity project has implemented a comprehensive Mixpanel analytics system that tracks user behavior across the website and browser extension. The implementation follows best practices by:

1. **Standardizing tracking** through utility functions
2. **Consistent event naming** across the application
3. **Detailed properties** for each event type
4. **User identification** for personalized tracking
5. **Error handling** in tracking calls

### Recommendations for Enhancement

1. **Event Naming Standardization**: Some events use different naming conventions (camelCase vs. space-separated). Consider standardizing all event names.

2. **Property Consistency**: Ensure consistent property names across similar events (e.g., always use `buttonName` instead of mixing with `button_name`).

3. **Funnel Tracking**: Implement more explicit funnel tracking for key user journeys like signup-to-payment.

4. **Automated Testing**: Add automated tests for analytics implementation to ensure tracking calls are made correctly.

5. **Documentation Updates**: Keep this documentation updated as new tracking is added to the application.

6. **Data Validation**: Implement validation for tracked properties to ensure data quality.

7. **Privacy Compliance**: Ensure all tracking complies with privacy regulations like GDPR and CCPA.

By following these recommendations, the Velocity team can further enhance their analytics implementation and gain even more valuable insights from user behavior data.
