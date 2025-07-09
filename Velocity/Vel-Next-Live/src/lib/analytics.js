'use client';

import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel with your project token
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '48a67766d0bb1b3399a4f956da9c52da';

// Check if Mixpanel is already initialized to avoid duplicate initialization
if (!mixpanel.__loaded) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
    api_host: "https://api-js.mixpanel.com", // Explicitly set API host
    api_method: "POST",                      // Use POST instead of GET
    api_transport: "XHR",                    // Use XHR for better reliability
    cross_subdomain_cookie: false,           // Avoid cross-domain cookie issues
    secure_cookie: true,                     // Use secure cookies
    batch_requests: true,                    // Batch requests to reduce network calls
    batch_flush_interval_ms: 5000,           // Flush batched events every 5 seconds
    ignore_dnt: false,                       // Respect Do Not Track settings
    property_blacklist: [],                  // No property blacklist
    loaded: function(mixpanel) {             // Callback when Mixpanel is loaded
      console.log('Mixpanel initialized successfully');
    },
    track_links_timeout: 300,                // 300ms timeout for link tracking
    cookie_expiration: 365,                  // 1 year cookie expiration
    upgrade: true,                           // Upgrade from older versions
    disable_persistence: false,              // Enable persistence
    disable_cookie: false,                   // Enable cookies
    secure_cookie: true,                     // Use secure cookies
    ip: false                                // Don't capture IP by default
  });
}

// Enhanced Analytics utility functions
const Analytics = {
  // Track event with properties and error handling
  track: (event_name, properties = {}) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      // Add timestamp if not present
      if (!properties.timestamp) {
        properties.timestamp = new Date().toISOString();
      }

      // Add page info if not present
      if (!properties.page && typeof window !== 'undefined') {
        properties.page = window.location.pathname;
      }

      // Track the event
      mixpanel.track(event_name, properties);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Mixpanel Event:', event_name, properties);
      }
    } catch (error) {
      console.error('Mixpanel tracking error:', error);
    }
  },

  // Identify user with better error handling
  identify: (userId, userProperties = {}) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      // Don't identify empty user IDs
      if (!userId) {
        console.warn('Attempted to identify with empty userId');
        return;
      }

      mixpanel.identify(userId);

      // Set user properties if provided
      if (Object.keys(userProperties).length > 0) {
        mixpanel.people.set(userProperties);
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Mixpanel Identify:', userId, userProperties);
      }
    } catch (error) {
      console.error('Mixpanel identify error:', error);
    }
  },

  // Set user properties
  setUserProperties: (properties = {}) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      mixpanel.people.set(properties);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Mixpanel Set User Properties:', properties);
      }
    } catch (error) {
      console.error('Mixpanel set properties error:', error);
    }
  },

  // Increment user property
  incrementUserProperty: (property, value = 1) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      mixpanel.people.increment(property, value);
    } catch (error) {
      console.error('Mixpanel increment error:', error);
    }
  },

  // Track page view
  trackPageView: (pageName = null) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      const properties = {
        page: pageName || window.location.pathname,
        url: window.location.href,
        referrer: document.referrer || '',
        timestamp: new Date().toISOString()
      };

      mixpanel.track('Page View', properties);
    } catch (error) {
      console.error('Mixpanel page view error:', error);
    }
  },

  // Reset user (for logout)
  reset: () => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      mixpanel.reset();

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Mixpanel Reset');
      }
    } catch (error) {
      console.error('Mixpanel reset error:', error);
    }
  },

  // Alias user (for connecting anonymous to identified)
  alias: (id) => {
    if (typeof window === 'undefined') return; // Skip during SSR

    try {
      mixpanel.alias(id);
    } catch (error) {
      console.error('Mixpanel alias error:', error);
    }
  },

  // Access to people object for advanced operations
  people: {
    set: (props) => {
      if (typeof window === 'undefined') return; // Skip during SSR

      try {
        mixpanel.people.set(props);
      } catch (error) {
        console.error('Mixpanel people.set error:', error);
      }
    },
    increment: (prop, value = 1) => {
      if (typeof window === 'undefined') return; // Skip during SSR

      try {
        mixpanel.people.increment(prop, value);
      } catch (error) {
        console.error('Mixpanel people.increment error:', error);
      }
    }
  },

  // Get Mixpanel instance (for advanced usage)
  getInstance: () => {
    return mixpanel;
  }
};

export default Analytics;