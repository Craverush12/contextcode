'use client';

import Analytics from '@/config/analytics';

/**
 * Comprehensive interaction tracking utilities
 * This file provides utilities to track all interactive elements and redirections
 */

/**
 * Track any link or button click with standardized properties
 * @param {string} elementType - Type of element (button, link, icon, etc.)
 * @param {string} elementName - Identifier for the element
 * @param {string} location - Where on the site this element appears
 * @param {Object} properties - Additional properties to track
 */
export const trackInteraction = (elementType, elementName, location, properties = {}) => {
  try {
    Analytics.track('user_interaction', {
      element_type: elementType,
      element_name: elementName,
      location: location,
      timestamp: new Date().toISOString(),
      page_path: typeof window !== 'undefined' ? window.location.pathname : '',
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      ...properties
    });
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
};

/**
 * Track when a user is redirected to another page or external site
 * @param {string} fromPage - Source page
 * @param {string} toPage - Destination page
 * @param {string} reason - Reason for redirection (button click, link, etc.)
 * @param {Object} properties - Additional properties to track
 */
export const trackRedirection = (fromPage, toPage, reason, properties = {}) => {
  try {
    // Determine if this is an internal or external redirection
    const isExternal = toPage.startsWith('http') && 
      !toPage.includes(typeof window !== 'undefined' ? window.location.hostname : '');
    
    Analytics.track('redirection', {
      from_page: fromPage,
      to_page: toPage,
      reason: reason,
      is_external: isExternal,
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Error tracking redirection:', error);
  }
};

/**
 * Track navigation to Chrome Web Store with enhanced properties
 * @param {string} fromPage - Source page
 * @param {string} buttonName - Name of the button that triggered the redirection
 * @param {string} userId - User ID if available
 * @param {Object} properties - Additional properties to track
 */
export const trackChromeStoreRedirection = (fromPage, buttonName, userId = null, properties = {}) => {
  try {
    Analytics.track('chrome_store_redirection', {
      from_page: fromPage,
      button_name: buttonName,
      user_id: userId,
      timestamp: new Date().toISOString(),
      is_logged_in: !!userId,
      ...properties
    });
    
    // If user is logged in, update their properties
    if (userId) {
      Analytics.setUserProperties({
        chrome_store_visit: true,
        last_chrome_store_visit: new Date().toISOString(),
        chrome_store_visit_source: fromPage
      });
    }
  } catch (error) {
    console.error('Error tracking Chrome Store redirection:', error);
  }
};

/**
 * Track when a user clicks a "Get Started" or similar CTA button
 * @param {string} buttonName - Name of the button
 * @param {string} location - Where on the site this button appears
 * @param {string} destination - Where this button leads to
 * @param {Object} properties - Additional properties to track
 */
export const trackCtaClick = (buttonName, location, destination, properties = {}) => {
  try {
    Analytics.track('cta_click', {
      button_name: buttonName,
      location: location,
      destination: destination,
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Error tracking CTA click:', error);
  }
};

/**
 * Track when a user clicks a "Get Free" or pricing-related button
 * @param {string} buttonName - Name of the button
 * @param {string} planType - Type of plan (free, premium, etc.)
 * @param {string} location - Where on the site this button appears
 * @param {Object} properties - Additional properties to track
 */
export const trackPricingClick = (buttonName, planType, location, properties = {}) => {
  try {
    Analytics.track('pricing_click', {
      button_name: buttonName,
      plan_type: planType,
      location: location,
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Error tracking pricing click:', error);
  }
};

/**
 * Track when a user arrives from a backlink or referral
 * @param {string} referrer - The referring URL
 * @param {string} landingPage - The page they landed on
 * @param {Object} properties - Additional properties to track
 */
export const trackBacklinkArrival = (referrer, landingPage, properties = {}) => {
  try {
    // Extract domain from referrer
    let referrerDomain = '';
    try {
      if (referrer) {
        const url = new URL(referrer);
        referrerDomain = url.hostname;
      }
    } catch (e) {
      referrerDomain = 'invalid_url';
    }
    
    Analytics.track('backlink_arrival', {
      referrer: referrer,
      referrer_domain: referrerDomain,
      landing_page: landingPage,
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Error tracking backlink arrival:', error);
  }
};

/**
 * Track when a user navigates from extension to login
 * @param {string} extensionId - ID of the extension if available
 * @param {Object} properties - Additional properties to track
 */
export const trackExtensionToLogin = (extensionId = null, properties = {}) => {
  try {
    Analytics.track('extension_to_login', {
      extension_id: extensionId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  } catch (error) {
    console.error('Error tracking extension to login:', error);
  }
};

/**
 * Create a tracking wrapper for any function that causes navigation
 * @param {Function} navigationFn - The function that performs navigation
 * @param {string} fromPage - Source page
 * @param {string} toPage - Destination page
 * @param {string} reason - Reason for navigation
 * @param {Object} properties - Additional tracking properties
 * @returns {Function} - Wrapped function that tracks before navigating
 */
export const withNavigationTracking = (navigationFn, fromPage, toPage, reason, properties = {}) => {
  return (...args) => {
    // Track the navigation
    trackRedirection(fromPage, toPage, reason, properties);
    
    // Call the original navigation function
    return navigationFn(...args);
  };
};

export default {
  trackInteraction,
  trackRedirection,
  trackChromeStoreRedirection,
  trackCtaClick,
  trackPricingClick,
  trackBacklinkArrival,
  trackExtensionToLogin,
  withNavigationTracking
};
