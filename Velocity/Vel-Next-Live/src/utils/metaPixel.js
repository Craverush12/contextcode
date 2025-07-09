'use client';

/**
 * Meta Pixel tracking utility for Velocity
 * Handles initialization and event tracking
 */

// Initialize Meta Pixel
export const initializeMetaPixel = (pixelId) => {
  if (typeof window === 'undefined') return;

  try {
    // Check if Meta Pixel is already initialized
    if (window.fbq) {
      // Don't log anything to avoid console clutter
      return;
    }

    // Check for the initialization flag
    if (window._metaPixelInitialized) {
      // Don't initialize again if the flag is set
      return;
    }

    // Set the initialization flag
    window._metaPixelInitialized = true;

    // Initialize Meta Pixel
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    // Initialize with the provided pixel ID
    fbq('init', pixelId);
    fbq('track', 'PageView');

    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Meta Pixel initialized with ID:', pixelId);
    }
  } catch (error) {
    console.error('Error initializing Meta Pixel:', error);
  }
};

// Track standard events
export const trackEvent = (eventName, params = {}) => {
  if (typeof window === 'undefined') return;

  try {
    // Check if fbq is available
    if (!window.fbq) {
      console.warn('Meta Pixel not initialized. Cannot track event:', eventName);
      return;
    }

    // Track the event
    fbq('track', eventName, params);

    if (process.env.NODE_ENV === 'development') {
      console.log('Meta Pixel event tracked:', eventName, params);
    }
  } catch (error) {
    console.error('Error tracking Meta Pixel event:', error);
  }
};

// Track custom events
export const trackCustomFbEvent = (eventName, params = {}) => {
  if (typeof window === 'undefined') return;

  try {
    // Check if fbq is available
    if (!window.fbq) {
      console.warn('Meta Pixel not initialized. Cannot track custom event:', eventName);
      return;
    }

    // Track the custom event
    fbq('trackCustom', eventName, params);

    if (process.env.NODE_ENV === 'development') {
      console.log('Meta Pixel custom event tracked:', eventName, params);
    }
  } catch (error) {
    console.error('Error tracking Meta Pixel custom event:', error);
  }
};

// Meta Pixel utility object
const MetaPixel = {
  init: (pixelId) => initializeMetaPixel(pixelId),

  // Standard events
  trackPageView: () => trackEvent('PageView'),
  trackSignUp: (params) => trackEvent('CompleteRegistration', params),
  trackLogin: (params) => trackCustomFbEvent('Login', params),
  trackPurchase: (params) => trackEvent('Purchase', params),
  trackAddToCart: (params) => trackEvent('AddToCart', params),
  trackInitiateCheckout: (params) => trackEvent('InitiateCheckout', params),

  // Custom events
  trackCustomEvent: (eventName, params = {}) => {
    if (typeof window === 'undefined') return;

    try {
      // Check if fbq is available
      if (!window.fbq) {
        console.warn('Meta Pixel not initialized. Cannot track custom event:', eventName);
        return;
      }

      // Track the custom event
      fbq('trackCustom', eventName, params);

      if (process.env.NODE_ENV === 'development') {
        console.log('Meta Pixel custom event tracked:', eventName, params);
      }
    } catch (error) {
      console.error('Error tracking Meta Pixel custom event:', error);
    }
  },

  trackButtonClick: (buttonName, params = {}) => {
    trackCustomFbEvent('ButtonClick', { button_name: buttonName, ...params });
  },
  trackFeatureUsage: (featureName, params = {}) => {
    trackCustomFbEvent('FeatureUsage', { feature_name: featureName, ...params });
  }
};

export default MetaPixel;