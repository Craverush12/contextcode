'use client';

import Analytics from '@/config/analytics';

/**
 * Initialize global error tracking
 * This should be called in a client component that's loaded early in the application lifecycle
 */
export const initErrorTracking = () => {
  if (typeof window === 'undefined') return;

  // Store the original error handler
  const originalOnError = window.onerror;

  // Override the global error handler
  window.onerror = function(message, source, lineno, colno, error) {
    try {
      // Track the error with Mixpanel
      Analytics.trackError('javascript_error', message, {
        source: source,
        line: lineno,
        column: colno,
        stack: error?.stack || 'No stack trace available',
        user_agent: navigator.userAgent,
        url: window.location.href
      });
    } catch (trackingError) {
      console.error('Error while tracking error:', trackingError);
    }

    // Call the original handler if it exists
    if (typeof originalOnError === 'function') {
      return originalOnError(message, source, lineno, colno, error);
    }
    
    // Return false to allow the default browser error handling
    return false;
  };

  // Handle unhandled promise rejections
  const originalOnUnhandledRejection = window.onunhandledrejection;
  
  window.onunhandledrejection = function(event) {
    try {
      // Extract error details
      const error = event.reason;
      const message = error?.message || 'Unhandled Promise Rejection';
      
      // Track the error with Mixpanel
      Analytics.trackError('unhandled_promise_rejection', message, {
        stack: error?.stack || 'No stack trace available',
        user_agent: navigator.userAgent,
        url: window.location.href
      });
    } catch (trackingError) {
      console.error('Error while tracking promise rejection:', trackingError);
    }

    // Call the original handler if it exists
    if (typeof originalOnUnhandledRejection === 'function') {
      return originalOnUnhandledRejection(event);
    }
  };

  console.log('Global error tracking initialized');
};

/**
 * Track API errors
 * @param {string} endpoint - The API endpoint that failed
 * @param {Object} error - The error object
 * @param {Object} requestData - Optional data about the request
 */
export const trackApiError = (endpoint, error, requestData = {}) => {
  const errorMessage = error?.message || 'Unknown API error';
  const statusCode = error?.status || error?.statusCode || 'unknown';
  
  Analytics.trackError('api_error', errorMessage, {
    endpoint,
    status_code: statusCode,
    request_data: JSON.stringify(requestData),
    url: typeof window !== 'undefined' ? window.location.href : ''
  });
};

export default {
  initErrorTracking,
  trackApiError
};
