# Mixpanel Button Tracking Implementation Guide

This guide provides instructions for implementing Mixpanel tracking for all buttons on the Velocity website.

## Setup

1. We've created a utility file `src/utils/buttonTracking.js` that provides standardized functions for tracking button clicks.
2. The website already has Mixpanel configured in `src/config/analytics.js` and `src/lib/analytics.js`.

## Implementation Approaches

There are three ways to implement button tracking:

1. **Direct tracking call**: Add the tracking call directly to the onClick handler
2. **Wrapped handler**: Use the `createTrackedClickHandler` utility
3. **HOC approach**: Use the `withButtonTracking` higher-order component

## Implementation Examples

### 1. Direct Tracking Call

```jsx
import ButtonTracking from '../../utils/buttonTracking';

// Example implementation
<button 
  onClick={(e) => {
    ButtonTracking.trackButtonClick('Sign in', {
      method: 'email',
      page: 'login'
    });
    handleSignIn(e);
  }}
  className="..."
>
  Sign in
</button>
```

### 2. Wrapped Handler

```jsx
import ButtonTracking from '../../utils/buttonTracking';

// Example implementation
<button 
  onClick={ButtonTracking.createTrackedClickHandler(
    'Sign in with Google', 
    handleGoogleSignIn,
    { method: 'google', page: 'login' }
  )}
  className="..."
>
  Sign in with Google
</button>
```

### 3. HOC Approach

```jsx
import ButtonTracking from '../../utils/buttonTracking';

// Create a tracked button component
const TrackedButton = ButtonTracking.withButtonTracking(
  ({ children, ...props }) => <button {...props}>{children}</button>,
  'Generic Button'
);

// Example usage
<TrackedButton 
  buttonName="Submit Form"
  additionalProps={{ formType: 'contact' }}
  onClick={handleSubmit}
  className="..."
>
  Submit
</TrackedButton>
```

## Implementation Plan by Button Category

### Navigation Buttons

Update `src/components/layout/Navbar.jsx`:

```jsx
// Import the tracking utility
import ButtonTracking from '../../utils/buttonTracking';

// For the Get Started button
<Link href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa" target="_blank" rel="noopener noreferrer">
  <button 
    className="rounded-full bg-black text-white py-2 px-4"
    onClick={() => ButtonTracking.trackButtonClick('Get Started', { location: 'navbar' })}
  >
    Get Started
  </button>
</Link>

// For the Profile button
<button 
  onClick={ButtonTracking.createTrackedClickHandler(
    'Profile', 
    handleProfileClick,
    { location: 'navbar', userLoggedIn: true }
  )}
  className="text-white hover:text-blue-500 transition-colors"
>
  Profile
</button>

// For the Logout button
<button 
  onClick={ButtonTracking.createTrackedClickHandler(
    'Logout', 
    handleLogout,
    { location: 'navbar', userLoggedIn: true }
  )}
  className="text-red-400 hover:text-red-300 transition-colors"
>
  Logout
</button>
```

### Hero Section Buttons

Update `src/components/home/index.jsx`:

```jsx
// Import the tracking utility
import ButtonTracking from '../../utils/buttonTracking';

// For the Try now for Free button
<a
  href="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    ButtonTracking.trackButtonClick('Try for Free', {
      location: 'hero_section',
      destination: 'chrome_web_store'
    });
  }}
  className="relative overflow-hidden bg-black text-white border border-blue-500/30 rounded-full py-4 px-8 hover:scale-105 transition-all duration-300 text-lg sm:text-xl whitespace-nowrap w-[280px] animate-pulse-glow shadow-[0_0_15px_rgba(0,138,203,.7)]"
>
  <span className="relative z-10 flex items-center gap-3 font-bold">
    <Image
      src="https://thinkvelocity.in/next-assets/ChromeLogo.png"
      alt="Try Now"
      width={40}
      height={40}
    />
    Try now for Free
  </span>
</a>
```

### Authentication Buttons

Update `src/components/Pages/Login.jsx`:

```jsx
// Import the tracking utility
import ButtonTracking from '../../utils/buttonTracking';

// For the Sign in button
<button
  className={`w-full flex justify-center items-center bg-[#008ACB] text-primary rounded-md py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base transition-all duration-300 ${
    isLoading
      ? "opacity-50 cursor-not-allowed"
      : "hover:bg-[#0099E6]"
  }`}
  type="submit"
  disabled={isLoading}
  onClick={() => {
    if (!isLoading) {
      ButtonTracking.trackButtonClick('Sign in', {
        method: 'email',
        page: 'login'
      });
    }
  }}
>
  {isLoading ? "Signing in..." : "Sign in"}
</button>

// For the Sign in with Google button
<button
  onClick={ButtonTracking.createTrackedClickHandler(
    'Sign in with Google',
    handleGoogleSignIn,
    { method: 'google', page: 'login' }
  )}
  type="button"
  className={`w-full flex justify-center items-center gap-2 bg-[#000000] border-[#989898] border text-primary rounded-md py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base transition-all duration-300 ${
    isLoading
      ? "opacity-50 cursor-not-allowed"
      : "hover:bg-[#1A1A1A]"
  }`}
  disabled={isLoading}
>
  <Image
    src="https://thinkvelocity.in/next-assets/googlelogo.png"
    width={24}
    height={24}
    alt="Google"
    className="w-5 sm:w-6"
  />
  Sign in with Google
</button>
```

## Tracking Events in Mixpanel

All button clicks will be tracked with the event name "Button Clicked" and will include the following properties:

1. `buttonName`: The name of the button (consistent across the site)
2. `location`: The page or section where the button is located
3. `timestamp`: When the button was clicked
4. Additional custom properties specific to each button

## Mixpanel Dashboard Setup

1. Create a new dashboard in Mixpanel called "Button Interactions"
2. Add the following reports:
   - Button clicks by button name (bar chart)
   - Button clicks over time (line chart)
   - Button clicks by location (pie chart)
   - Button clicks by user (table)
   - Conversion funnel for key user flows (funnel)

## Next Steps

1. Implement tracking for all buttons listed in `website-buttons.md`
2. Create custom funnels in Mixpanel to track user journeys
3. Set up retention analysis to see which buttons lead to better user retention
4. Create A/B tests to optimize button placement and design
