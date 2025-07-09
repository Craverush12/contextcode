'use client';

/**
 * Safe Analytics Wrapper
 * Provides fallback functionality when analytics modules are not available
 */

// Safe import function
const safeImport = (modulePath, fallback = {}) => {
  try {
    return require(modulePath).default || require(modulePath);
  } catch (error) {
    console.warn(`Failed to import ${modulePath}:`, error);
    return fallback;
  }
};

// Initialize analytics modules with fallbacks
const Analytics = safeImport('../config/analytics', {
  track: () => {},
  identify: () => {},
  setUserProperties: () => {},
  reset: () => {}
});

const EventTracking = safeImport('../utils/eventTracking', {
  track: () => {},
  trackError: () => {},
  trackButtonClick: () => {},
  trackUserLogin: () => {},
  trackUserSignup: () => {}
});

const ButtonTracking = safeImport('../utils/buttonTracking', {
  trackButtonClick: () => {},
  createTrackedClickHandler: (name, onClick, props) => onClick
});

const MetaPixel = safeImport('../utils/metaPixel', {
  trackPurchase: () => {},
  trackPageView: () => {},
  trackButtonClick: () => {}
});

// Safe wrapper functions
export const safeTrack = (eventName, properties = {}) => {
  try {
    if (Analytics && typeof Analytics.track === 'function') {
      Analytics.track(eventName, properties);
    }
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
};

export const safeEventTrack = (eventName, properties = {}) => {
  try {
    if (EventTracking && typeof EventTracking.track === 'function') {
      EventTracking.track(eventName, properties);
    }
  } catch (error) {
    console.warn('EventTracking failed:', error);
  }
};

export const safeEventTrackError = (errorType, errorMessage, properties = {}) => {
  try {
    if (EventTracking && typeof EventTracking.trackError === 'function') {
      EventTracking.trackError(errorType, errorMessage, properties);
    }
  } catch (error) {
    console.warn('Error tracking failed:', error);
  }
};

export const safeButtonTrack = (buttonName, properties = {}) => {
  try {
    if (ButtonTracking && typeof ButtonTracking.trackButtonClick === 'function') {
      ButtonTracking.trackButtonClick(buttonName, properties);
    }
  } catch (error) {
    console.warn('ButtonTracking failed:', error);
  }
};

export const safeMetaPixelTrack = (eventType, properties = {}) => {
  try {
    if (MetaPixel && typeof MetaPixel.trackPurchase === 'function' && eventType === 'purchase') {
      MetaPixel.trackPurchase(properties);
    }
  } catch (error) {
    console.warn('MetaPixel tracking failed:', error);
  }
};

// Export individual modules for direct use (with safety checks)
export const SafeAnalytics = {
  track: safeTrack,
  identify: (userId, properties = {}) => {
    try {
      if (Analytics && typeof Analytics.identify === 'function') {
        Analytics.identify(userId, properties);
      }
    } catch (error) {
      console.warn('Analytics identify failed:', error);
    }
  },
  setUserProperties: (properties = {}) => {
    try {
      if (Analytics && typeof Analytics.setUserProperties === 'function') {
        Analytics.setUserProperties(properties);
      }
    } catch (error) {
      console.warn('Analytics setUserProperties failed:', error);
    }
  },
  reset: () => {
    try {
      if (Analytics && typeof Analytics.reset === 'function') {
        Analytics.reset();
      }
    } catch (error) {
      console.warn('Analytics reset failed:', error);
    }
  }
};

export const SafeEventTracking = {
  track: safeEventTrack,
  trackError: safeEventTrackError,
  trackButtonClick: (buttonName, properties = {}) => {
    try {
      if (EventTracking && typeof EventTracking.trackButtonClick === 'function') {
        EventTracking.trackButtonClick(buttonName, properties);
      }
    } catch (error) {
      console.warn('EventTracking button click failed:', error);
    }
  }
};

export const SafeButtonTracking = {
  trackButtonClick: safeButtonTrack
};

export const SafeMetaPixel = {
  trackPurchase: (properties = {}) => safeMetaPixelTrack('purchase', properties)
};

// Default export with all safe methods
export default {
  Analytics: SafeAnalytics,
  EventTracking: SafeEventTracking,
  ButtonTracking: SafeButtonTracking,
  MetaPixel: SafeMetaPixel,
  track: safeTrack,
  eventTrack: safeEventTrack,
  eventTrackError: safeEventTrackError,
  buttonTrack: safeButtonTrack,
  metaPixelTrack: safeMetaPixelTrack
}; 