# Mixpanel Analytics Implementation Guide

This document provides a comprehensive overview of the enhanced Mixpanel analytics implementation in the Velocity project.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Events Tracked](#events-tracked)
4. [User Properties](#user-properties)
5. [Session Tracking](#session-tracking)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Overview

The Velocity project uses Mixpanel for comprehensive analytics tracking alongside Meta Pixel. The implementation has been enhanced to provide reliable tracking, detailed user insights, and proper error handling.

### Key Features

- **Unified Analytics Implementation**: Single source of truth for analytics
- **Automatic Page View Tracking**: Tracks route changes in Next.js
- **Session Tracking**: Monitors user sessions, idle time, and engagement
- **Error Handling**: Robust error handling for all tracking calls
- **Cross-Platform Compatibility**: Works with both Mixpanel and Meta Pixel
- **Privacy-Conscious**: Limits PII exposure and respects user privacy settings

## Core Components

### 1. Enhanced Analytics Module (`src/lib/analytics.js`)

The central analytics implementation with improved configuration and error handling:

```javascript
// Initialize Mixpanel with enhanced configuration
mixpanel.init(MIXPANEL_TOKEN, {
  debug: process.env.NODE_ENV === 'development',
  track_pageview: true,
  persistence: 'localStorage',
  api_host: "https://api-js.mixpanel.com",
  api_method: "POST",
  api_transport: "XHR",
  cross_subdomain_cookie: false,
  secure_cookie: true,
  batch_requests: true,
  // Additional configuration...
});
```

### 2. MixpanelProvider Component (`src/components/analytics/MixpanelProvider.jsx`)

Provides automatic page view tracking for Next.js route changes:

```jsx
const MixpanelProvider = ({ children }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views when the route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Get the full URL including query parameters
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Track the page view
    Analytics.track('Page View', {
      page: pathname,
      url: url,
      // Additional properties...
    });
  }, [pathname, searchParams]);

  return children;
};
```

### 3. Session Tracking Utility (`src/utils/sessionTracking.js`)

Tracks user sessions, idle time, and engagement:

```javascript
const SessionTracking = {
  initSession: () => {
    // Initialize session tracking
  },
  recordActivity: () => {
    // Record user activity
  },
  getSessionDuration: () => {
    // Get current session duration
  },
  // Additional methods...
};
```

### 4. Analytics Layout Component (`src/components/layout/AnalyticsLayout.jsx`)

Wraps the application to provide session tracking:

```jsx
const AnalyticsLayout = ({ children }) => {
  useEffect(() => {
    // Initialize session tracking
    SessionTracking.initSession();
    SessionTracking.startHeartbeat();
    
    // Track session start
    Analytics.track('Session Started', {
      // Properties...
    });
    
    // Clean up
    return () => {
      // Track session end
      Analytics.track('Session Ended', {
        // Properties...
      });
      
      // End session tracking
      SessionTracking.endSession();
      SessionTracking.stopHeartbeat();
    };
  }, []);
  
  return <>{children}</>;
};
```

## Events Tracked

### Automatic Events

1. **Page View**
   - Tracked when a user navigates to a new page
   - Properties: page, url, referrer, timestamp

2. **Session Started**
   - Tracked when a user starts a new session
   - Properties: timestamp, user_agent, screen_size, viewport_size, device_type

3. **Session Ended**
   - Tracked when a user ends their session
   - Properties: timestamp, session_duration_seconds

4. **User Idle**
   - Tracked when a user becomes idle (60 seconds of inactivity)
   - Properties: idle_duration_seconds, page, timestamp

5. **User Returned**
   - Tracked when a user returns from being idle
   - Properties: idle_duration_seconds, page, timestamp

6. **Heartbeat**
   - Tracked every 30 seconds to monitor user presence
   - Properties: time_on_page_seconds, time_since_activity_seconds, page, url, timestamp, is_idle

### User Interaction Events

1. **Button Clicked**
   - Tracked when a user clicks a button
   - Properties: buttonName, page, timestamp, visitorType, flow

2. **Form Submission**
   - Tracked when a user submits a form
   - Properties: form_type, success, timestamp

3. **Feature Usage**
   - Tracked when a user uses a specific feature
   - Properties: feature_name, timestamp

### Conversion Events

1. **User Signup**
   - Tracked when a user signs up
   - Properties: method, timestamp, flow

2. **User Login**
   - Tracked when a user logs in
   - Properties: method, timestamp, flow

3. **Joined Launchlist**
   - Tracked when a user joins the newsletter
   - Properties: type, email_domain, timestamp, visitor_type

## User Properties

The following user properties are tracked:

1. **Identity**
   - userId
   - email (when available)
   - name (when available)

2. **Registration**
   - signup_date
   - signup_method
   - last_login

3. **Engagement**
   - session_count
   - total_time_on_site
   - feature_usage_count

## Session Tracking

The session tracking implementation monitors:

1. **Session Duration**
   - Total time the user spends on the site

2. **Idle Time**
   - Time when the user is inactive

3. **User Activity**
   - Clicks, keypresses, scrolls, and mouse movements

4. **Heartbeat**
   - Regular pings to track user presence

## Troubleshooting

### Common Issues

1. **"Bad HTTP status: 0" Error**
   - **Cause**: CORS issues or network problems
   - **Solution**: 
     - Ensure the `api_host` is set correctly
     - Use POST instead of GET for API requests
     - Check for ad blockers or privacy extensions

2. **Duplicate Events**
   - **Cause**: Multiple initializations of Mixpanel
   - **Solution**: Use the unified analytics implementation

3. **Missing Events**
   - **Cause**: JavaScript errors or race conditions
   - **Solution**: Check the console for errors and ensure proper error handling

### Debugging

1. **Enable Debug Mode**
   - Set `debug: true` in the Mixpanel configuration
   - Check browser console for Mixpanel logs

2. **Use Mixpanel Live View**
   - Monitor events in real-time in the Mixpanel dashboard

3. **Check Network Requests**
   - Look for requests to `api-js.mixpanel.com`
   - Verify the payload contains the expected data

## Best Practices

1. **Consistent Event Naming**
   - Use clear, descriptive event names
   - Follow a consistent naming convention (e.g., noun + verb)

2. **Standardized Properties**
   - Include timestamp, page, and user context in all events
   - Use consistent property names across events

3. **Error Handling**
   - Always wrap tracking calls in try/catch blocks
   - Log errors but don't let them affect the user experience

4. **Privacy Considerations**
   - Limit PII in tracking calls
   - Use email domains instead of full email addresses when possible
   - Respect Do Not Track settings

5. **Performance**
   - Use batch requests to reduce network calls
   - Throttle high-frequency events like mouse movements

6. **Testing**
   - Verify tracking in development before deploying
   - Use the Mixpanel debugger to validate events
