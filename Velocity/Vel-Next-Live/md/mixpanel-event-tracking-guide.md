# Velocity Mixpanel Event Tracking Guide

This document outlines the comprehensive event tracking implementation for the Velocity website and extension using Mixpanel.

## Core Events Overview

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| Visit Website | Fired when user lands on the site | source_origin, flow, visitor_type |
| Click Get Started | User clicks the Get Started button in navbar | location, destination, flow |
| Click Try For Free | User clicks the Try for Free button on landing page | location, destination, flow |
| Redirected to Register | User reaches registration page | source, flow |
| Register Success | Registration completed | method, flow |
| Redirected to Webstore | User redirected to Chrome Web Store | source, registered |
| Download Extension | Download from Web Store | download_origin, registered |
| Extension Opened | Extension is opened | registered |
| Prompt Typed | Input typed into extension | prompt_length, registered |
| Button Used in LLM | Clicked button in LLM | button_name, llm_platform |
| Trial Finished Pop-up Shown | Trial ended notification shown | days_in_trial |
| Redirected to Register from Trial Ended | User redirected to register after trial ends | source |

## Event Properties

Each event includes standard properties plus event-specific properties:

### Standard Properties (included in all events)
- `timestamp`: ISO timestamp of the event
- `flow`: Flow identifier (Flow 1, Flow 2, etc.)
- `registered`: Boolean indicating if user is registered
- `visitor_type`: Visitor, Window Shopper, or User

### Event-Specific Properties

#### Visit Website
- `page`: Current page path
- `referrer`: Full referrer URL
- `referrer_domain`: Domain of referrer
- `utm_source`, `utm_medium`, `utm_campaign`: UTM parameters

#### Click Get Started / Click Try For Free
- `button_name`: Name of the button
- `location`: Where the button is located (navbar, hero, etc.)
- `destination`: Where the button leads to

#### Redirected to Register
- `source`: Source of the redirection (navbar, trial_ended, etc.)

#### Register Success
- `method`: Registration method (email, google, etc.)
- User properties are also set: email, name, registration_method, registration_date

#### Redirected to Webstore
- `source`: Source of the redirection (post_register, landing_page, etc.)

#### Download Extension
- `download_origin`: Origin of download (Chrome Webstore, Redirect from Lander)

#### Extension Opened
- `extension_version`: Version of the extension

#### Prompt Typed
- `prompt_length`: Length of the prompt in characters
- `platform`: Platform where prompt was typed

#### Button Used in LLM
- `button_name`: Name of the button used
- `llm_platform`: LLM platform (ChatGPT, Claude, etc.)

#### Trial Finished Pop-up Shown
- `days_in_trial`: Number of days user was in trial

#### Redirected to Register from Trial Ended
- `remaining_prompts`: Number of prompts remaining (if any)

## Implementation Guide

### 1. Website Page Load Tracking

Add to `_app.js` or layout components:

```jsx
import { useEffect } from 'react';
import EventTracking from '../utils/eventTracking';

// In component
useEffect(() => {
  // Track page visit on initial load
  EventTracking.trackVisit();
}, []);
```

### 2. Button Click Tracking

Replace existing button click handlers:

```jsx
// Before
<button onClick={() => {
  Analytics.track("Button Clicked", {
    buttonName: "Get Started"
  });
}}>
  Get Started
</button>

// After
<button onClick={() => {
  EventTracking.trackButtonClick("Get Started", {
    location: "navbar",
    destination: "register_page"
  });
}}>
  Get Started
</button>
```

### 3. Registration Flow Tracking

In registration component:

```jsx
// On successful registration
EventTracking.trackRegisterSuccess("email", {
  userId: data.userId,
  email: data.email,
  name: data.name
});

// Redirect to Web Store
EventTracking.trackRedirectToWebstore("post_register");
```

### 4. Extension Tracking

In extension code:

```javascript
// When extension is opened
EventTracking.trackExtensionOpened({
  extension_version: chrome.runtime.getManifest().version
});

// When prompt is typed
textarea.addEventListener('input', () => {
  EventTracking.trackPromptTyped(textarea.value.length, {
    platform: "chatgpt"
  });
});

// When button is clicked in LLM
button.addEventListener('click', () => {
  EventTracking.trackButtonUsedInLLM("Enhance Prompt", "ChatGPT");
});
```

### 5. Trial End Tracking

In trial end notification component:

```jsx
// When showing trial end popup
EventTracking.trackTrialFinishedPopupShown(30);

// When user clicks to register
handleRegisterClick = () => {
  EventTracking.trackRedirectToRegisterFromTrialEnded({
    remaining_prompts: 0
  });
  router.push('/register');
};
```

## User Identification

When a user registers or logs in, identify them in Mixpanel:

```javascript
// On login/registration success
Analytics.identify(userId);
Analytics.setUserProperties({
  email: userEmail,
  name: userName,
  plan: userPlan,
  registrationDate: registrationDate
});
```

## Funnel Analysis in Mixpanel

### Main Conversion Funnel
1. Visit Website
2. Click Get Started / Click Try For Free
3. Redirected to Register
4. Register Success
5. Redirected to Webstore
6. Download Extension
7. Extension Opened

### Extension Usage Funnel
1. Extension Opened
2. Prompt Typed
3. Button Used in LLM

### Trial Conversion Funnel
1. Trial Finished Pop-up Shown
2. Redirected to Register from Trial Ended
3. Register Success

## Mixpanel Dashboard Setup

Create dashboards for:

1. **Acquisition Metrics**
   - Website visits by source
   - Button click rates
   - Registration conversion rate

2. **Engagement Metrics**
   - Extension open rate
   - Prompt usage frequency
   - Button usage in LLMs

3. **Retention Metrics**
   - User return rate
   - Days active per month
   - Trial to paid conversion rate

## A/B Testing

Use the `flow` property to segment users into different flows:

```javascript
// Track with flow information
EventTracking.trackButtonClick("Try for Free", {
  flow: "Flow 2", // For A/B testing different flows
  location: "hero_section"
});
```

## Implementation Checklist

- [ ] Add `EventTracking.trackVisit()` to main layout component
- [ ] Update all button click handlers to use `EventTracking.trackButtonClick()`
- [ ] Implement registration success tracking
- [ ] Implement Web Store redirection tracking
- [ ] Add extension event tracking
- [ ] Set up trial end tracking
- [ ] Configure Mixpanel dashboards and funnels
- [ ] Verify all events are being tracked correctly
