# Meta Pixel Implementation Guide

This document explains the enhanced Meta Pixel implementation in the Velocity website, including the fixes for the "trackCustomEvent is not a function" error.

## Overview

The Meta Pixel (formerly Facebook Pixel) implementation has been enhanced with multiple layers of redundancy and error handling to ensure reliable tracking across the website.

## Implementation Components

### 1. Direct Script in Head

The most reliable implementation is a direct script in the `<head>` section of the layout:

```html
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1003634615146809');
  fbq('track', 'PageView');
</script>
```

### 2. Noscript Fallback

For users with JavaScript disabled:

```html
<noscript>
  <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=1003634615146809&ev=PageView&noscript=1"
  />
</noscript>
```

### 3. MetaPixelScript Component

A React component that initializes Meta Pixel:

```jsx
// src/components/MetaPixelScript.jsx
const MetaPixelScript = () => {
  useEffect(() => {
    // Initialize Meta Pixel when component mounts
    MetaPixel.init('1003634615146809');
  }, []);

  return null;
};
```

### 4. MetaPixelFallback Component

A redundant implementation that initializes Meta Pixel directly if the main implementation fails:

```jsx
// src/components/MetaPixelFallback.jsx
const MetaPixelFallback = ({ pixelId = '1003634615146809' }) => {
  useEffect(() => {
    // Check if Meta Pixel is already initialized
    if (window.fbq) return;
    
    // Initialize Meta Pixel directly
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }, [pixelId]);
  
  return null;
};
```

### 5. MetaPixel Utility

A utility module for tracking events:

```jsx
// src/utils/metaPixel.js
const MetaPixel = {
  init: (pixelId) => initializeMetaPixel(pixelId),
  
  // Standard events
  trackPageView: () => trackEvent('PageView'),
  
  // Custom events
  trackCustomEvent: (eventName, params = {}) => {
    if (typeof window === 'undefined') return;
    
    try {
      if (!window.fbq) {
        console.warn('Meta Pixel not initialized');
        return;
      }
      
      fbq('trackCustom', eventName, params);
    } catch (error) {
      console.error('Error tracking Meta Pixel event:', error);
    }
  },
  
  // Other tracking methods...
};
```

## Fixes for "trackCustomEvent is not a function" Error

The error was occurring because:

1. The `MetaPixel` object didn't have a `trackCustomEvent` method directly exposed
2. There was a naming conflict between the exported function and the method

### Solution:

1. **Added the missing method**: Added `trackCustomEvent` to the `MetaPixel` object
2. **Renamed the helper function**: Changed `trackCustomEvent` to `trackCustomFbEvent` to avoid naming conflicts
3. **Added error handling**: Wrapped all tracking calls in try/catch blocks
4. **Added fallback mechanisms**: Created multiple layers of redundancy
5. **Added better initialization checks**: Ensured Meta Pixel is properly initialized before tracking

## Usage Guide

### Basic Page View Tracking

Page views are tracked automatically by the Meta Pixel script in the layout.

### Custom Event Tracking

```jsx
import MetaPixel from '@/utils/metaPixel';

// Track a custom event
MetaPixel.trackCustomEvent('EventName', {
  property1: 'value1',
  property2: 'value2'
});
```

### Standard Event Tracking

```jsx
import MetaPixel from '@/utils/metaPixel';

// Track a standard event
MetaPixel.trackSignUp({
  method: 'email'
});
```

### Button Click Tracking

```jsx
import MetaPixel from '@/utils/metaPixel';

// Track a button click
MetaPixel.trackButtonClick('Submit Button', {
  page: '/signup',
  flow: 'registration'
});
```

## Error Handling

All tracking calls now include proper error handling:

```jsx
try {
  MetaPixel.trackCustomEvent('EventName', {
    property: 'value'
  });
} catch (error) {
  console.error('Error tracking event:', error);
}
```

## Testing

To verify that Meta Pixel is working correctly:

1. Open your browser's developer tools
2. Go to the Network tab
3. Filter for "facebook.com"
4. Perform actions on the site
5. Look for requests to "facebook.com/tr"

You can also use the Facebook Pixel Helper browser extension to verify that events are being tracked correctly.

## Troubleshooting

If you encounter issues with Meta Pixel tracking:

1. **Check browser console for errors**: Look for any error messages related to Meta Pixel
2. **Verify Meta Pixel initialization**: Check if `window.fbq` is defined
3. **Check for ad blockers**: Ad blockers can prevent Meta Pixel from loading
4. **Test with Facebook Pixel Helper**: Use the browser extension to debug issues
5. **Check network requests**: Verify that requests to "facebook.com/tr" are being sent

## Best Practices

1. **Always use try/catch blocks**: Wrap all tracking calls in try/catch blocks
2. **Check for fbq before tracking**: Verify that Meta Pixel is initialized before tracking
3. **Don't track sensitive information**: Avoid tracking PII (Personally Identifiable Information)
4. **Use standard events when possible**: Use standard events for better reporting in Facebook Ads Manager
5. **Keep event names consistent**: Use consistent naming conventions for custom events
