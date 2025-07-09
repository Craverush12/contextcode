# Enhanced Analytics Integration Guide

This guide provides step-by-step instructions for integrating the enhanced analytics tracking into your Velocity project.

## 1. Session Tracking Integration

### Step 1: Update Your Main Layout

Wrap your main layout component with the `AnalyticsLayout` component:

```jsx
// src/app/layout.js or your main layout file
import AnalyticsLayout from '@/components/layout/AnalyticsLayout';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsLayout>
          {/* Your existing layout content */}
          {children}
        </AnalyticsLayout>
      </body>
    </html>
  );
}
```

Alternatively, you can directly integrate the session tracking in your existing layout:

```jsx
// In your existing layout component
import { useEffect } from 'react';
import SessionTracking from '@/utils/sessionTracking';

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
  
  return (
    <div className="layout">
      {children}
    </div>
  );
}
```

### Step 2: Test Session Tracking

1. Open your website in a browser
2. Check Mixpanel for the following events:
   - `Session Started`
   - `Heartbeat` (should appear every 30 seconds)
   - `User Idle` (after 60 seconds of inactivity)
   - `User Returned` (when returning from idle state)
   - `Session Ended` (when closing the page)

## 2. Button Verification Tracking

### Step 1: Identify Buttons That Need Verification

Common buttons that should use verification tracking:
- Login/Signup buttons
- Payment buttons
- Form submission buttons
- Critical action buttons (delete, publish, etc.)

### Step 2: Replace Regular Buttons with VerifiableButton

```jsx
// Before
<button 
  onClick={handleLogin}
  className="login-button"
>
  Sign In
</button>

// After
import VerifiableButton from '@/components/common/VerifiableButton';

<VerifiableButton
  buttonName="Login"
  verificationType="credentials"
  onClick={handleLogin}
  className="login-button"
>
  Sign In
</VerifiableButton>
```

### Step 3: Update Login Component Example

```jsx
// src/components/Pages/Login.jsx
import { useState } from 'react';
import VerifiableButton from '@/components/common/VerifiableButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Login successful
        return true; // Return true to indicate verification success
      } else {
        // Login failed
        return false; // Return false to indicate verification failure
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Throw error to be caught by VerifiableButton
    }
  };
  
  return (
    <form>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <VerifiableButton
        buttonName="Login"
        verificationType="credentials"
        onClick={handleLogin}
        loadingText="Signing in..."
        className="login-button"
        additionalProps={{
          email_provided: !!email,
          password_provided: !!password
        }}
      >
        Sign In
      </VerifiableButton>
    </form>
  );
};

export default Login;
```

### Step 4: Update Payment Button Example

```jsx
// In your payment component
import VerifiableButton from '@/components/common/VerifiableButton';

<VerifiableButton
  buttonName="Payment"
  verificationType="payment_processing"
  onClick={handlePayment}
  loadingText="Processing payment..."
  className="payment-button"
  additionalProps={{
    amount: amount,
    payment_method: paymentMethod
  }}
>
  Complete Payment
</VerifiableButton>
```

## 3. Enhanced Traffic Source Tracking

The enhanced `trackVisit` function in `src/utils/eventTracking.js` is already updated with better traffic source attribution. Make sure it's being called on all important pages:

```jsx
// In your page component
import { useEffect } from 'react';
import EventTracking from '@/utils/eventTracking';

const YourPage = () => {
  useEffect(() => {
    // Track page visit with enhanced attribution
    EventTracking.trackVisit({
      page_section: 'specific-section',
      page_category: 'your-category'
    });
  }, []);
  
  return (
    // Your page content
  );
};
```

## 4. Testing Your Implementation

### Session Tracking Test

1. Open your website and navigate between pages
2. Wait for 60+ seconds without interaction to trigger idle state
3. Interact with the page to trigger return from idle
4. Close the page to trigger session end
5. Check Mixpanel for all session-related events

### Button Verification Test

1. Identify a button with verification (e.g., login button)
2. Start the verification process
3. Complete the process successfully
4. Check Mixpanel for `Verification Started` and `Verification Completed` events
5. Try a failed verification
6. Check Mixpanel for verification failure event
7. Abandon a verification process
8. Check Mixpanel for `Verification Abandoned` event

### Traffic Source Test

1. Visit your site from different sources:
   - Direct URL
   - Google search
   - Social media link
   - Email link with UTM parameters
2. Check Mixpanel for accurate traffic source attribution in `Page Visit` events

## 5. Mixpanel Dashboard Setup

Create the following dashboards in Mixpanel:

### User Engagement Dashboard

- **Average Session Duration**: Average of `session_duration_seconds` from `Session Ended` events
- **Active vs. Idle Time**: Compare active time vs. idle time
- **Pages by Engagement**: Pages with highest average session duration
- **Traffic Sources by Engagement**: Compare engagement metrics by traffic source

### Button Verification Dashboard

- **Verification Success Rate**: Percentage of successful verifications by button type
- **Verification Duration**: Average time to complete verification by button type
- **Verification Abandonment Rate**: Percentage of abandoned verifications
- **Verification Funnel**: Funnel from start to completion for each verification type

### Traffic Source Dashboard

- **Traffic Source Breakdown**: Pie chart of traffic sources
- **Conversion by Source**: Compare conversion rates by traffic source
- **Campaign Performance**: Track UTM campaign performance
- **First Touch Attribution**: Analyze first touch attribution data

## 6. Next Steps

After implementing these enhancements, consider:

1. **A/B Testing**: Use the enhanced analytics to run A/B tests on button designs and placements
2. **Funnel Optimization**: Identify and fix drop-off points in verification processes
3. **Traffic Source Optimization**: Focus marketing efforts on sources with highest engagement
4. **Session Quality Improvement**: Reduce idle time and increase active engagement

For any questions or issues with implementation, refer to the detailed documentation in the Enhanced Analytics Implementation Plan.
