# Mixpanel Analytics Tracking Documentation

This document provides a comprehensive overview of all Mixpanel analytics tracking implementations in the Velocity project.

## Core Analytics Modules

### 1. Analytics Configuration (`src/config/analytics.js`)

This module initializes Mixpanel with the project token and provides basic tracking functions:

- **Initialization**: `mixpanel.init(MIXPANEL_TOKEN, {...})`
- **Core Functions**:
  - `identify(id)`: Identify a user
  - `alias(id)`: Create an alias for a user
  - `track(name, props)`: Track an event
  - `setUserProperties(props)`: Set user properties

### 2. Analytics Utility (`src/lib/analytics.js`)

Enhanced wrapper around Mixpanel with error handling:

- **Core Functions**:
  - `track(event_name, properties)`: Track an event with error handling
  - `identify(userId, userProperties)`: Identify a user with error handling
  - `reset()`: Reset user identification with error handling

## Tracking Utilities

### 1. Button Tracking (`src/utils/buttonTracking.js`)

Specialized utility for tracking button interactions:

- **Functions**:
  - `trackButtonClick(buttonName, additionalProps, callback)`: Track button clicks
  - `createTrackedClickHandler(buttonName, originalOnClick, additionalProps)`: Create a tracked click handler
  - `withButtonTracking(ButtonComponent, buttonName, additionalProps)`: HOC for button tracking

### 2. Event Tracking (`src/utils/eventTracking.js`)

Comprehensive event tracking for various user interactions:

- **Page/Visit Tracking**:
  - `trackVisit(additionalProps)`: Track page visits with referrer information
  
- **Button Tracking**:
  - `trackButtonClick(buttonName, additionalProps)`: Track button clicks
  
- **User Authentication**:
  - `trackUserLogin(method, userId, userData)`: Track user login events
  - `trackUserSignup(method, userId, userData)`: Track user signup events
  - `trackRedirectToRegister(source, additionalProps)`: Track redirects to registration
  - `trackRegisterSuccess(method, additionalProps)`: Track successful registrations
  
- **Extension Tracking**:
  - `trackRedirectToWebstore(source, additionalProps)`: Track redirects to Chrome Web Store
  - `trackDownloadExtension(source, additionalProps)`: Track extension downloads
  - `trackExtensionOpened(additionalProps)`: Track extension opens
  - `trackPromptTyped(promptLength, additionalProps)`: Track prompts typed in extension
  - `trackButtonUsedInLLM(buttonName, llmPlatform, additionalProps)`: Track button usage in LLMs
  
- **Error Tracking**:
  - `trackError(errorType, errorMessage, additionalProps)`: Track error events

### 3. User Properties Tracking (`src/utils/userProperties.js`)

Tracks user-specific properties and preferences:

- **Functions**:
  - `setInitialUserProperties(userId, properties)`: Set initial user properties
  - `updateUserProperties(userId, properties)`: Update user properties
  - `trackUserPreferences(userId, preferences)`: Track user preferences
  - `trackEngagementMetrics(userId, metrics)`: Track user engagement metrics
  - `trackSubscriptionStatus(userId, status, details)`: Track subscription status changes

### 4. Interaction Tracking (`src/utils/interactionTracking.js`)

Tracks general user interactions:

- **Functions**:
  - `trackInteraction(elementType, elementName, location, properties)`: Track element interactions
  - `trackRedirection(fromPage, toPage, reason, properties)`: Track page redirections
  - `trackChromeStoreRedirection(source, properties)`: Track redirections to Chrome Store
  - `trackCtaClick(ctaName, location, properties)`: Track CTA button clicks
  - `withNavigationTracking(navigationFn, fromPage, toPage, reason, properties)`: HOC for navigation tracking

## Enhanced Components

### 1. VerifiableButton (`src/components/common/VerifiableButton.jsx`)

A specialized button component that tracks verification processes:

- **Features**:
  - Tracks verification start, completion, and abandonment
  - Provides visual feedback during verification
  - Supports custom verification types
  - Tracks additional properties

## Implementation in Components

### 1. Login Component (`src/components/Pages/Login.jsx`)

- **Tracking Implementations**:
  - Login button with verification tracking
  - Google sign-in button with verification tracking
  - User login events with `trackUserLogin`

```jsx
<VerifiableButton
  className="w-full bg-[#00C2FF] text-black font-medium py-2 rounded-full hover:bg-[#00B3F0] transition-colors duration-300 text-base"
  type="submit"
  disabled={isLoading}
  buttonName="Login"
  verificationType="credentials"
  onClick={handleSubmit}
  loadingText="Signing in..."
  additionalProps={{
    email_provided: !!email,
    password_provided: !!password
  }}
>
  Log In
</VerifiableButton>
```

### 2. Navbar Component (`src/components/layout/Navbar.jsx`)

- **Tracking Implementations**:
  - "Get Started" button click tracking
  - Profile button click tracking
  - Navigation tracking

```jsx
<button
  className="rounded-full bg-[#00C8F0] text-white py-1.5 px-3 text-sm"
  onClick={() => {
    EventTracking.trackButtonClick("Get Started", {
      location: "navbar_mobile",
      destination: "login_page",
      source_origin: "navbar"
    });
    EventTracking.trackRedirectToRegister("navbar_mobile", {
      button: "Get Started"
    });
  }}
>
  Get Started
</button>
```

### 3. Home Component (`src/components/home/index.jsx`)

- **Tracking Implementations**:
  - Page visit tracking
  - Extension download button tracking

```jsx
// Track page visit when component mounts
useEffect(() => {
  EventTracking.trackVisit({
    page: 'home',
    section: 'landing'
  });
}, []);

// Extension download button
<a
  href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    EventTracking.trackButtonClick("Get Extension", {
      location: "hero_section",
      destination: "chrome_web_store",
      source_origin: "landing_page"
    });
    EventTracking.trackRedirectToWebstore("landing_page", {
      button: "Try For Free",
      location: "hero_section"
    });
  }}
>
  Try now for Free
</a>
```

### 4. Launchlist Component (`src/components/Launchlist2.jsx`)

- **Tracking Implementations**:
  - "Get Notified" button click tracking

```jsx
Analytics.track("Button Clicked", { buttonName: "Get Notified" });
```

### 5. Analytics Layout (`src/components/layout/AnalyticsLayout.jsx`)

- **Tracking Implementations**:
  - Session tracking initialization
  - Session heartbeat tracking

```jsx
useEffect(() => {
  // Initialize session tracking when component mounts
  SessionTracking.initSession();
  SessionTracking.startHeartbeat();
  
  // Clean up when component unmounts
  return () => {
    SessionTracking.endSession();
    SessionTracking.stopHeartbeat();
  };
}, []);
```

## Events Tracked

### 1. Page/Visit Events
- `Page View` - When a user visits a page
- `Session Started` - When a user session begins
- `Session Ended` - When a user session ends
- `Heartbeat` - Regular updates on user presence
- `User Idle` - When a user becomes inactive
- `User Returned` - When a user returns from being idle

### 2. Button Events
- `Button Clicked` - When a user clicks a button
- `Verification Started` - When a verification process begins
- `Verification Completed` - When a verification process completes
- `Verification Abandoned` - When a verification process is abandoned

### 3. User Authentication Events
- `User Login` - When a user logs in
- `User Signup` - When a user signs up
- `Redirect to Register` - When a user is redirected to registration

### 4. Extension Events
- `Redirect to Webstore` - When a user is redirected to Chrome Web Store
- `Download Extension` - When a user downloads the extension
- `Extension Opened` - When the extension is opened
- `Prompt Typed` - When a user types a prompt in the extension
- `Button Used in LLM` - When a button is used in an LLM

### 5. Error Events
- `Error Occurred` - When an error occurs
