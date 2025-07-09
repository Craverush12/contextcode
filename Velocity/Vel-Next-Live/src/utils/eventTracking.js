'use client';

import Analytics from '../lib/analytics';
import MetaPixel from './metaPixel';

/**
 * Comprehensive event tracking utility for Velocity website
 * Handles all major user interactions and funnel events
 */
const EventTracking = {
  /**
   * Track a page visit event with enhanced traffic source attribution
   * @param {object} additionalProps - Additional properties to track
   */
  trackVisit: (additionalProps = {}) => {
    // Get referrer information with enhanced details
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    let referrerDomain = '';
    let referrerType = 'direct';

    if (referrer) {
      try {
        const url = new URL(referrer);
        referrerDomain = url.hostname;

        // Categorize referrer
        if (referrerDomain.includes('google.com')) {
          referrerType = 'organic_search';
        } else if (referrerDomain.includes('bing.com')) {
          referrerType = 'organic_search';
        } else if (referrerDomain.includes('yahoo.com')) {
          referrerType = 'organic_search';
        } else if (referrerDomain.includes('facebook.com') ||
                  referrerDomain.includes('instagram.com') ||
                  referrerDomain.includes('twitter.com') ||
                  referrerDomain.includes('linkedin.com') ||
                  referrerDomain.includes('pinterest.com')) {
          referrerType = 'social';
        } else if (typeof window !== 'undefined' && referrerDomain === window.location.hostname) {
          referrerType = 'internal';
        } else {
          referrerType = 'external_referral';
        }
      } catch (e) {
        referrerDomain = 'invalid_url';
      }
    }

    // Determine visitor type based on localStorage
    let visitorType = 'First Time Visitor';
    if (typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('token');
      const hasVisited = !!localStorage.getItem('hasVisitedBefore');

      if (hasToken) {
        visitorType = 'User';
      } else if (hasVisited) {
        visitorType = 'Window Shopper';
      } else {
        // First time visitor
        localStorage.setItem('hasVisitedBefore', 'true');
      }
    }

    // Get URL parameters for enhanced campaign tracking
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

    // Enhanced UTM tracking
    const utmSource = urlParams.get('utm_source') || '';
    const utmMedium = urlParams.get('utm_medium') || '';
    const utmCampaign = urlParams.get('utm_campaign') || '';
    const utmContent = urlParams.get('utm_content') || '';
    const utmTerm = urlParams.get('utm_term') || '';
    const gclid = urlParams.get('gclid') || '';
    const fbclid = urlParams.get('fbclid') || '';
    const flow = urlParams.get('flow') || 'Flow 1'; // Default to Flow 1 if not specified

    // Determine traffic source with priority
    let trafficSource = 'direct';

    if (utmSource) {
      trafficSource = 'campaign';
    } else if (gclid) {
      trafficSource = 'google_ads';
    } else if (fbclid) {
      trafficSource = 'facebook_ads';
    } else if (referrerType !== 'direct') {
      trafficSource = referrerType;
    }

    // Get device and browser information
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

    // Get browser information
    let browserName = 'unknown';
    let browserVersion = 'unknown';

    if (typeof navigator !== 'undefined') {
      if (userAgent.includes('Chrome')) {
        browserName = 'Chrome';
      } else if (userAgent.includes('Firefox')) {
        browserName = 'Firefox';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserName = 'Safari';
      } else if (userAgent.includes('Edge')) {
        browserName = 'Edge';
      } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
        browserName = 'Internet Explorer';
      }

      // Extract version (simplified)
      const versionMatch = userAgent.match(new RegExp(browserName + '\\/(\\d+\\.\\d+)'));
      if (versionMatch && versionMatch[1]) {
        browserVersion = versionMatch[1];
      }
    }

    // Combine all properties
    const eventProps = {
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer,
      referrer_domain: referrerDomain,
      referrer_type: referrerType,
      traffic_source: trafficSource,
      visitor_type: visitorType,
      device_type: isMobile ? 'mobile' : 'desktop',
      browser_name: browserName,
      browser_version: browserVersion,
      screen_resolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
      viewport_size: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      timestamp: new Date().toISOString(),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      gclid,
      fbclid,
      flow,
      registered: visitorType === 'User',
      visit_day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      visit_hour: new Date().getHours(),
      ...additionalProps
    };

    // Track the event in Mixpanel
    Analytics.track('Page Visit', eventProps);

    // Track PageView in Meta Pixel
    MetaPixel.trackPageView();

    // Store first touch attribution data if this is first visit
    if (visitorType === 'First Time Visitor' && typeof window !== 'undefined') {
      try {
        // Store first touch data in localStorage
        const firstTouchData = {
          timestamp: new Date().toISOString(),
          referrer,
          referrer_domain: referrerDomain,
          referrer_type: referrerType,
          traffic_source: trafficSource,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          landing_page: window.location.pathname
        };

        localStorage.setItem('first_touch_data', JSON.stringify(firstTouchData));
      } catch (error) {
        console.error('Error storing first touch data:', error);
      }
    }
  },

  /**
   * Track a button click event with standardized properties
   * @param {string} buttonName - Name of the button
   * @param {object} additionalProps - Additional properties to track
   */
  trackButtonClick: (buttonName, additionalProps = {}) => {
    // Get visitor type and flow information
    let visitorType = 'Visitor';
    let flow = 'Flow 1';

    if (typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('token');
      const hasVisited = !!localStorage.getItem('hasVisitedBefore');

      if (hasToken) {
        visitorType = 'User';
      } else if (hasVisited) {
        visitorType = 'Window Shopper';
      }

      // Get flow from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      flow = urlParams.get('flow') || localStorage.getItem('flow') || 'Flow 1';

      // Store flow in localStorage for cross-page tracking
      localStorage.setItem('flow', flow);
    }

    // Combine all properties
    const eventProps = {
      buttonName,
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
      visitorType,
      flow,
      registered: visitorType === 'User',
      ...additionalProps
    };

    // Track the event in Mixpanel
    Analytics.track('Button Clicked', eventProps);

    // Track button click in Meta Pixel
    MetaPixel.trackButtonClick(buttonName, eventProps);
  },

  /**
   * Track when user is redirected to registration page
   * @param {string} source - Source of the redirection
   * @param {object} additionalProps - Additional properties to track
   */
  trackRedirectToRegister: (source, additionalProps = {}) => {
    const eventProps = {
      source,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      ...additionalProps
    };

    Analytics.track('Redirected to Register', eventProps);
  },

  /**
   * Track successful registration
   * @param {string} method - Registration method (email, google, etc.)
   * @param {object} userData - User data (email, name, etc.)
   * @param {object} additionalProps - Additional properties to track
   */
  trackRegisterSuccess: (method, userData = {}, additionalProps = {}) => {
    const eventProps = {
      method,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      ...additionalProps
    };

    // Track in Mixpanel
    Analytics.track('Register Success', eventProps);

    // Track registration in Meta Pixel
    MetaPixel.trackSignUp(eventProps);

    // Also identify the user in Mixpanel if userId is available
    if (userData.userId) {
      Analytics.identify(userData.userId);
      Analytics.setUserProperties({
        email: userData.email || userData.userEmail,
        name: userData.name || userData.userName,
        registrationMethod: method,
        registrationDate: new Date().toISOString()
      });
    }
  },

  /**
   * Track redirection to Chrome Web Store
   * @param {string} source - Source of the redirection
   * @param {object} additionalProps - Additional properties to track
   */
  trackRedirectToWebstore: (source, additionalProps = {}) => {
    const eventProps = {
      source,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      registered: typeof window !== 'undefined' ?
        !!localStorage.getItem('token') : false,
      ...additionalProps
    };

    Analytics.track('Redirected to Webstore', eventProps);
  },

  /**
   * Track extension download (can be called from redirect or directly)
   * @param {string} downloadOrigin - Origin of the download (Chrome Webstore, Redirect from Lander)
   * @param {object} additionalProps - Additional properties to track
   */
  trackDownloadExtension: (downloadOrigin, additionalProps = {}) => {
    const eventProps = {
      downloadOrigin,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      registered: typeof window !== 'undefined' ?
        !!localStorage.getItem('token') : false,
      ...additionalProps
    };

    Analytics.track('Download Extension', eventProps);
  },

  /**
   * Track extension opened event (called from extension)
   * @param {object} additionalProps - Additional properties to track
   */
  trackExtensionOpened: (additionalProps = {}) => {
    const eventProps = {
      timestamp: new Date().toISOString(),
      registered: typeof window !== 'undefined' ?
        !!localStorage.getItem('token') : false,
      ...additionalProps
    };

    Analytics.track('Extension Opened', eventProps);
  },

  /**
   * Track prompt typed in extension
   * @param {number} promptLength - Length of the prompt
   * @param {object} additionalProps - Additional properties to track
   */
  trackPromptTyped: (promptLength, additionalProps = {}) => {
    const eventProps = {
      promptLength,
      timestamp: new Date().toISOString(),
      registered: typeof window !== 'undefined' ?
        !!localStorage.getItem('token') : false,
      ...additionalProps
    };

    Analytics.track('Prompt Typed', eventProps);
  },

  /**
   * Track button used in LLM
   * @param {string} buttonName - Name of the button
   * @param {string} llmPlatform - LLM platform (ChatGPT, Claude, etc.)
   * @param {object} additionalProps - Additional properties to track
   */
  trackButtonUsedInLLM: (buttonName, llmPlatform, additionalProps = {}) => {
    const eventProps = {
      buttonName,
      llmPlatform,
      timestamp: new Date().toISOString(),
      registered: typeof window !== 'undefined' ?
        !!localStorage.getItem('token') : false,
      ...additionalProps
    };

    Analytics.track('Button Used in LLM', eventProps);
  },

  /**
   * Track trial finished popup shown
   * @param {number} daysInTrial - Number of days user was in trial
   * @param {object} additionalProps - Additional properties to track
   */
  trackTrialFinishedPopupShown: (daysInTrial, additionalProps = {}) => {
    const eventProps = {
      daysInTrial,
      timestamp: new Date().toISOString(),
      ...additionalProps
    };

    Analytics.track('Trial Finished Pop-up Shown', eventProps);
  },

  /**
   * Track redirection to register from trial ended
   * @param {object} additionalProps - Additional properties to track
   */
  trackRedirectToRegisterFromTrialEnded: (additionalProps = {}) => {
    const eventProps = {
      timestamp: new Date().toISOString(),
      ...additionalProps
    };

    Analytics.track('Redirected to Register from Trial Ended', eventProps);
  },

  /**
   * Track user login event
   * @param {string} method - Login method (email, google, etc.)
   * @param {string} userId - User ID
   * @param {object} userData - Additional user data
   */
  trackUserLogin: (method, userId, userData = {}) => {
    const eventProps = {
      method,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      ...userData
    };

    // Track in Mixpanel
    Analytics.track('User Login', eventProps);

    // Track login in Meta Pixel
    MetaPixel.trackLogin(eventProps);

    // Also identify the user in Mixpanel
    if (userId) {
      Analytics.identify(userId);
      Analytics.setUserProperties({
        last_login: new Date().toISOString(),
        login_method: method,
        ...userData
      });
    }
  },

  /**
   * Track user signup event
   * @param {string} method - Signup method (email, google, etc.)
   * @param {string} userId - User ID
   * @param {object} userData - Additional user data
   */
  trackUserSignup: (method, userId, userData = {}) => {
    const eventProps = {
      method,
      timestamp: new Date().toISOString(),
      flow: typeof window !== 'undefined' ?
        (localStorage.getItem('flow') || 'Flow 1') : 'Flow 1',
      ...userData
    };

    // Track in Mixpanel
    Analytics.track('User Signup', eventProps);

    // Track signup in Meta Pixel
    MetaPixel.trackSignUp(eventProps);

    // Also identify the user in Mixpanel
    if (userId) {
      Analytics.identify(userId);
      Analytics.setUserProperties({
        signup_date: new Date().toISOString(),
        signup_method: method,
        ...userData
      });
    }
  },

  /**
   * Track error events
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   * @param {object} additionalProps - Additional properties
   */
  trackError: (errorType, errorMessage, additionalProps = {}) => {
    const eventProps = {
      error_type: errorType,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
      ...additionalProps
    };

    Analytics.track('Error Occurred', eventProps);
  }
};

// Export the entire object as default
export default EventTracking;

// Export individual functions for direct import
export const trackVisit = EventTracking.trackVisit;
export const trackButtonClick = EventTracking.trackButtonClick;
export const trackRedirectToRegister = EventTracking.trackRedirectToRegister;
export const trackRegisterSuccess = EventTracking.trackRegisterSuccess;
export const trackRedirectToWebstore = EventTracking.trackRedirectToWebstore;
export const trackDownloadExtension = EventTracking.trackDownloadExtension;
export const trackExtensionOpened = EventTracking.trackExtensionOpened;
export const trackPromptTyped = EventTracking.trackPromptTyped;
export const trackButtonUsedInLLM = EventTracking.trackButtonUsedInLLM;
export const trackTrialFinishedPopupShown = EventTracking.trackTrialFinishedPopupShown;
export const trackRedirectToRegisterFromTrialEnded = EventTracking.trackRedirectToRegisterFromTrialEnded;
export const trackUserLogin = EventTracking.trackUserLogin;
export const trackUserSignup = EventTracking.trackUserSignup;
export const trackError = EventTracking.trackError;

