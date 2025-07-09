# Velocity Mixpanel Event Tracking Implementation Summary

This document summarizes the implementation of comprehensive event tracking for the Velocity website and extension using Mixpanel.

## Implemented Components

### 1. Event Tracking Utility

Created a comprehensive event tracking utility in `src/utils/eventTracking.js` that handles all major user interactions:

- **Visit Website** - Tracks when users land on the site
- **Button Clicks** - Tracks all button interactions
- **Redirections** - Tracks redirections to register page and webstore
- **Registration** - Tracks successful registrations
- **Extension Usage** - Tracks extension opens, prompt typing, and button usage in LLMs
- **Trial End** - Tracks trial end notifications and conversions

### 2. Home Component Updates

Updated `src/components/home/index.jsx` to:

- Track page visits when the component mounts
- Track "Try For Free" button clicks with detailed properties
- Track redirections to the Chrome Web Store
- Update Help button tracking with the new utility

### 3. Navbar Component Updates

Updated `src/components/layout/Navbar.jsx` to:

- Track "Get Started" button clicks in mobile view
- Track "Get Started" button clicks in desktop view
- Track redirections to register page
- Track redirections to Chrome Web Store
- Track Profile and Logout button clicks

## Event Tracking Structure

Each event follows a consistent structure with standard properties:

### Core Events

1. **Visit Website**
   ```javascript
   EventTracking.trackVisit({
     page: 'home',
     section: 'landing'
   });
   ```

2. **Button Clicked**
   ```javascript
   EventTracking.trackButtonClick("Try For Free", {
     location: "hero_section",
     destination: "chrome_web_store",
     source_origin: "landing_page"
   });
   ```

3. **Redirected to Register**
   ```javascript
   EventTracking.trackRedirectToRegister("navbar_desktop", {
     button: "Get Started",
     button_style: "animated"
   });
   ```

4. **Redirected to Webstore**
   ```javascript
   EventTracking.trackRedirectToWebstore("landing_page", {
     button: "Try For Free",
     location: "hero_section"
   });
   ```

## Standard Properties

All events include these standard properties:

- `timestamp` - ISO timestamp of the event
- `flow` - Flow identifier (for A/B testing)
- `registered` - Boolean indicating if user is registered
- `visitorType` - Visitor, Window Shopper, or User
- `page` - Current page path

## Implementation Details

### Visit Website Event

The `trackVisit` function:
1. Determines the visitor type based on localStorage
2. Captures referrer information
3. Extracts UTM parameters for campaign tracking
4. Tracks the event with all relevant properties

### Button Click Events

The `trackButtonClick` function:
1. Captures the button name
2. Adds location information
3. Includes visitor type and flow information
4. Tracks the event with all relevant properties

### Redirection Events

The redirection tracking functions:
1. Capture the source of the redirection
2. Include flow information
3. Add registration status
4. Track the event with all relevant properties

## Next Steps

1. **Complete Implementation**
   - Update remaining components (Login, Register, etc.)
   - Implement extension tracking

2. **Dashboard Setup**
   - Create dashboards as outlined in `mixpanel-dashboard-setup-guide.md`
   - Set up funnels for conversion analysis

3. **A/B Testing**
   - Implement flow assignment logic
   - Create comparison reports in Mixpanel

4. **Validation**
   - Test all events to ensure they're being tracked correctly
   - Verify properties are included as expected

## Documentation

The following documents provide detailed information about the implementation:

1. `mixpanel-event-tracking-guide.md` - Comprehensive guide to event tracking
2. `mixpanel-implementation-plan.md` - Step-by-step implementation plan
3. `mixpanel-dashboard-setup-guide.md` - Guide for setting up Mixpanel dashboards

## Code Structure

```
src/
├── utils/
│   ├── eventTracking.js    # Main event tracking utility
│   └── buttonTracking.js   # Button-specific tracking (legacy)
├── components/
│   ├── home/
│   │   └── index.jsx       # Updated with event tracking
│   └── layout/
│       └── Navbar.jsx      # Updated with event tracking
└── app/
    └── layout.js           # To be updated with page visit tracking
```

## Tracking Flow

1. User lands on site → `Visit Website` event
2. User clicks Get Started → `Button Clicked` event
3. User is redirected to register → `Redirected to Register` event
4. User completes registration → `Register Success` event
5. User is redirected to webstore → `Redirected to Webstore` event
6. User downloads extension → `Download Extension` event
7. User opens extension → `Extension Opened` event
8. User types prompt → `Prompt Typed` event
9. User clicks button in LLM → `Button Used in LLM` event

This comprehensive tracking allows for detailed analysis of the user journey and conversion funnel.
