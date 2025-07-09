# Enhanced Analytics Implementation Plan

## Current Analytics Overview

The Velocity project currently uses Mixpanel for analytics tracking with several utilities:

1. **Core Analytics Module** (`src/lib/analytics.js` and `src/config/analytics.js`)

   - Basic tracking functionality
   - User identification
   - Event tracking

2. **Event Tracking Utility** (`src/utils/eventTracking.js`)

   - Page visits with referrer tracking
   - Button clicks
   - User signup/login events
   - Extension usage

3. **Button Tracking Utility** (`src/utils/buttonTracking.js`)

   - Specific button click tracking
   - Higher-order components for tracking

4. **User Properties Tracking** (`src/utils/userProperties.js`)
   - User engagement metrics
   - User preferences

## Identified Gaps

Based on your requirements, we've identified the following gaps in the current analytics implementation:

1. **Time on Site Without Interaction**

   - No specific tracking for idle time or time spent without interaction
   - No session duration tracking for passive visitors

2. **Traffic Source Attribution**

   - Basic referrer tracking exists but needs enhancement
   - Limited campaign tracking

3. **Button Verification Tracking**
   - No specific tracking for button verification completion rates
   - No funnel analysis for button interactions

## Implementation Plan

### 1. Time on Site Without Interaction Tracking

#### A. Session Duration Tracking

Create a new utility `src/utils/sessionTracking.js` to track user session duration:

```javascript
"use client";

import Analytics from "../lib/analytics";

let sessionStartTime = null;
let lastActivityTime = null;
let idleTimeout = null;
const IDLE_THRESHOLD = 60000; // 60 seconds of inactivity considered idle

const SessionTracking = {
  // Initialize session tracking
  initSession: () => {
    if (typeof window === "undefined") return;

    // Record session start time
    sessionStartTime = new Date();
    lastActivityTime = new Date();

    // Track session start
    Analytics.track("Session Started", {
      timestamp: sessionStartTime.toISOString(),
      page: window.location.pathname,
      referrer: document.referrer,
    });

    // Set up activity listeners
    document.addEventListener("click", SessionTracking.recordActivity);
    document.addEventListener("keypress", SessionTracking.recordActivity);
    document.addEventListener("scroll", SessionTracking.recordActivity);
    document.addEventListener("mousemove", SessionTracking.recordActivity);

    // Set up idle detection
    SessionTracking.resetIdleTimeout();

    // Track session on page unload
    window.addEventListener("beforeunload", SessionTracking.endSession);
  },

  // Record user activity
  recordActivity: () => {
    lastActivityTime = new Date();
    SessionTracking.resetIdleTimeout();
  },

  // Reset idle timeout
  resetIdleTimeout: () => {
    if (idleTimeout) clearTimeout(idleTimeout);

    idleTimeout = setTimeout(() => {
      // User has been idle for the threshold period
      const idleDuration = new Date() - lastActivityTime;

      Analytics.track("User Idle", {
        idle_duration_seconds: Math.floor(idleDuration / 1000),
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    }, IDLE_THRESHOLD);
  },

  // End session tracking
  endSession: () => {
    if (!sessionStartTime) return;

    const sessionDuration = new Date() - sessionStartTime;
    const activeDuration = new Date() - lastActivityTime;

    Analytics.track("Session Ended", {
      session_duration_seconds: Math.floor(sessionDuration / 1000),
      active_duration_seconds: Math.floor(activeDuration / 1000),
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    // Clean up
    document.removeEventListener("click", SessionTracking.recordActivity);
    document.removeEventListener("keypress", SessionTracking.recordActivity);
    document.removeEventListener("scroll", SessionTracking.recordActivity);
    document.removeEventListener("mousemove", SessionTracking.recordActivity);

    if (idleTimeout) clearTimeout(idleTimeout);
  },
};

export default SessionTracking;
```

#### B. Heartbeat Tracking

Implement a heartbeat mechanism to track time on page even without interaction:

```javascript
// Add to SessionTracking object
heartbeatInterval: null,
HEARTBEAT_INTERVAL: 30000, // 30 seconds

startHeartbeat: () => {
  SessionTracking.heartbeatInterval = setInterval(() => {
    const timeOnPage = new Date() - sessionStartTime;
    const timeSinceLastActivity = new Date() - lastActivityTime;

    Analytics.track('Heartbeat', {
      time_on_page_seconds: Math.floor(timeOnPage / 1000),
      time_since_activity_seconds: Math.floor(timeSinceLastActivity / 1000),
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      is_idle: timeSinceLastActivity > IDLE_THRESHOLD
    });
  }, SessionTracking.HEARTBEAT_INTERVAL);
},

stopHeartbeat: () => {
  if (SessionTracking.heartbeatInterval) {
    clearInterval(SessionTracking.heartbeatInterval);
  }
}
```

### 2. Enhanced Traffic Source Tracking

Enhance the existing `trackVisit` function in `src/utils/eventTracking.js`:

```javascript
trackVisit: (additionalProps = {}) => {
  // Get referrer information with enhanced details
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  let referrerDomain = "";
  let referrerType = "direct";

  if (referrer) {
    try {
      const url = new URL(referrer);
      referrerDomain = url.hostname;

      // Categorize referrer
      if (referrerDomain.includes("google")) {
        referrerType = "organic_search";
      } else if (
        referrerDomain.includes("facebook") ||
        referrerDomain.includes("instagram") ||
        referrerDomain.includes("twitter") ||
        referrerDomain.includes("linkedin")
      ) {
        referrerType = "social";
      } else if (referrerDomain === window.location.hostname) {
        referrerType = "internal";
      } else {
        referrerType = "external_referral";
      }
    } catch (e) {
      referrerDomain = "invalid_url";
    }
  }

  // Get URL parameters for campaign tracking
  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  // Enhanced UTM tracking
  const utmSource = urlParams.get("utm_source") || "";
  const utmMedium = urlParams.get("utm_medium") || "";
  const utmCampaign = urlParams.get("utm_campaign") || "";
  const utmContent = urlParams.get("utm_content") || "";
  const utmTerm = urlParams.get("utm_term") || "";
  const gclid = urlParams.get("gclid") || "";
  const fbclid = urlParams.get("fbclid") || "";

  // Determine traffic source with priority
  let trafficSource = "direct";

  if (utmSource) {
    trafficSource = "campaign";
  } else if (gclid) {
    trafficSource = "google_ads";
  } else if (fbclid) {
    trafficSource = "facebook_ads";
  } else if (referrerType !== "direct") {
    trafficSource = referrerType;
  }

  // Get device and browser information
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

  // Combine all properties
  const eventProps = {
    page: typeof window !== "undefined" ? window.location.pathname : "",
    referrer,
    referrer_domain: referrerDomain,
    referrer_type: referrerType,
    traffic_source: trafficSource,
    device_type: isMobile ? "mobile" : "desktop",
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    gclid,
    fbclid,
    timestamp: new Date().toISOString(),
    ...additionalProps,
  };

  Analytics.track("Page Visit", eventProps);
};
```

### 3. Button Verification Tracking

Create a new utility for tracking button verification:

```javascript
// src/utils/verificationTracking.js
"use client";

import Analytics from "../lib/analytics";

const VerificationTracking = {
  // Start verification process
  trackVerificationStart: (
    buttonName,
    verificationType,
    additionalProps = {}
  ) => {
    const eventProps = {
      button_name: buttonName,
      verification_type: verificationType,
      page: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
      ...additionalProps,
    };

    Analytics.track("Verification Started", eventProps);

    // Store verification start in session storage for funnel tracking
    if (typeof window !== "undefined") {
      const verifications = JSON.parse(
        sessionStorage.getItem("verifications") || "{}"
      );
      verifications[`${buttonName}_${verificationType}`] = {
        start_time: new Date().toISOString(),
        status: "started",
      };
      sessionStorage.setItem("verifications", JSON.stringify(verifications));
    }
  },

  // Track verification completion
  trackVerificationComplete: (
    buttonName,
    verificationType,
    success,
    additionalProps = {}
  ) => {
    let startTime = null;
    let duration = null;

    // Get verification start time from session storage
    if (typeof window !== "undefined") {
      const verifications = JSON.parse(
        sessionStorage.getItem("verifications") || "{}"
      );
      const key = `${buttonName}_${verificationType}`;

      if (verifications[key]) {
        startTime = new Date(verifications[key].start_time);
        duration = new Date() - startTime;

        // Update verification status
        verifications[key].status = success ? "completed" : "failed";
        verifications[key].end_time = new Date().toISOString();
        verifications[key].duration_seconds = Math.floor(duration / 1000);

        sessionStorage.setItem("verifications", JSON.stringify(verifications));
      }
    }

    const eventProps = {
      button_name: buttonName,
      verification_type: verificationType,
      success,
      duration_seconds: duration ? Math.floor(duration / 1000) : null,
      page: typeof window !== "undefined" ? window.location.pathname : "",
      timestamp: new Date().toISOString(),
      ...additionalProps,
    };

    Analytics.track("Verification Completed", eventProps);
  },
};

export default VerificationTracking;
```

## Integration Plan

To implement these enhancements, follow these steps:

### 1. Add Session Tracking to Layout Component

Update your main layout component to initialize session tracking:

```jsx
// src/app/layout.js or src/components/layout/Layout.jsx
"use client";

import { useEffect } from "react";
import SessionTracking from "@/utils/sessionTracking";

export default function Layout({ children }) {
  useEffect(() => {
    // Initialize session tracking
    SessionTracking.initSession();
    SessionTracking.startHeartbeat();

    return () => {
      // Clean up
      SessionTracking.endSession();
      SessionTracking.stopHeartbeat();
    };
  }, []);

  return <div className="layout">{children}</div>;
}
```

### 2. Enhance Button Components with Verification Tracking

Create a higher-order component for buttons that require verification:

```jsx
// src/components/common/VerifiableButton.jsx
import { useState } from "react";
import VerificationTracking from "@/utils/verificationTracking";

const VerifiableButton = ({
  children,
  buttonName,
  verificationType,
  onVerificationStart,
  onVerificationComplete,
  ...props
}) => {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleClick = async (e) => {
    // Start verification process
    setIsVerifying(true);
    VerificationTracking.trackVerificationStart(buttonName, verificationType);

    if (onVerificationStart) {
      await onVerificationStart(e);
    }

    try {
      // Simulate or perform actual verification
      const success = await props.onClick(e);

      // Track verification completion
      VerificationTracking.trackVerificationComplete(
        buttonName,
        verificationType,
        success
      );

      if (onVerificationComplete) {
        onVerificationComplete(success);
      }

      return success;
    } catch (error) {
      // Track verification failure
      VerificationTracking.trackVerificationComplete(
        buttonName,
        verificationType,
        false,
        { error: error.message }
      );

      if (onVerificationComplete) {
        onVerificationComplete(false);
      }

      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isVerifying || props.disabled}
    >
      {isVerifying ? "Verifying..." : children}
    </button>
  );
};

export default VerifiableButton;
```

### 3. Update Existing Components

Update key components to use the enhanced tracking:

```jsx
// Example: Login button with verification tracking
import VerifiableButton from '@/components/common/VerifiableButton';

// In your login component
<VerifiableButton
  buttonName="Login"
  verificationType="credentials"
  onClick={handleLogin}
  className="login-button"
>
  Sign In
</VerifiableButton>

// Example: Payment button with verification tracking
<VerifiableButton
  buttonName="Payment"
  verificationType="payment_processing"
  onClick={handlePayment}
  className="payment-button"
>
  Complete Payment
</VerifiableButton>
```

## Comprehensive Analytics Overview

With these enhancements, you'll be able to track:

### 1. User Engagement Metrics

- **Time on site** - Total session duration
- **Active time** - Time spent actively engaging with the site
- **Idle time** - Time spent without interaction
- **Heartbeat data** - Regular updates on user presence

### 2. Traffic Source Attribution

- **Referrer categorization** - Organic search, social, direct, etc.
- **Campaign tracking** - Enhanced UTM parameter tracking
- **Ad platform attribution** - Google Ads, Facebook Ads tracking

### 3. Button Verification Metrics

- **Verification start rates** - How many users start verification processes
- **Verification completion rates** - Success/failure rates for verifications
- **Verification duration** - Time taken to complete verification
- **Abandonment points** - Where users drop off during verification

## Mixpanel Dashboard Setup

To visualize this data effectively, set up the following Mixpanel reports:

### 1. User Engagement Dashboard

- **Average Session Duration** - Track average time on site
- **Active vs. Idle Time** - Compare active engagement vs. passive browsing
- **Engagement by Page** - See which pages keep users engaged longest
- **Engagement by Traffic Source** - Compare engagement across traffic sources

### 2. Traffic Source Analysis

- **Traffic Source Breakdown** - Pie chart of traffic sources
- **Conversion by Source** - Compare conversion rates by traffic source
- **Campaign Performance** - Track UTM campaign performance
- **Referrer Value** - Measure value of different referrers

### 3. Button Verification Funnel

- **Verification Funnel** - Track progression through verification steps
- **Verification Success Rate** - Measure success rates by button/verification type
- **Verification Time** - Track average time to complete verification
- **Verification Abandonment** - Identify where users abandon verification

## Implementation Timeline

1. **Week 1**: Implement session tracking and heartbeat mechanism
2. **Week 2**: Enhance traffic source tracking
3. **Week 3**: Implement button verification tracking
4. **Week 4**: Set up Mixpanel dashboards and validate data collection

## Conclusion

This enhanced analytics implementation will provide comprehensive insights into:

1. How long users stay on your site without interaction
2. Where your traffic is coming from with detailed attribution
3. How effectively users complete button verification processes

By implementing these enhancements, you'll gain a much deeper understanding of user behavior and be able to optimize your website for better engagement and conversion rates.
