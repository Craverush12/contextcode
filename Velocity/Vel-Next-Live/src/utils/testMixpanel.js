'use client';

/**
 * Mixpanel Test Utility
 * 
 * This utility helps test and debug Mixpanel tracking.
 * It should only be used in development environments.
 */

import Analytics from '@/lib/analytics';

/**
 * Run a comprehensive test of Mixpanel tracking
 * This will send test events to verify the implementation
 */
export const testMixpanelTracking = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Mixpanel test utility should not be used in production');
    return;
  }
  
  console.log('🧪 Starting Mixpanel implementation test...');
  
  try {
    // 1. Test basic event tracking
    console.log('Testing basic event tracking...');
    Analytics.track('Test Event', { 
      test_property: 'test_value',
      timestamp: new Date().toISOString()
    });
    
    // 2. Test page view tracking
    console.log('Testing page view tracking...');
    Analytics.track('Page View', {
      page: window.location.pathname,
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
    
    // 3. Test user identification (with a test ID)
    console.log('Testing user identification...');
    const testUserId = 'test-user-' + Date.now();
    Analytics.identify(testUserId, {
      test_property: 'test_value',
      email: 'test@example.com'
    });
    
    // 4. Test user properties
    console.log('Testing user properties...');
    Analytics.setUserProperties({
      test_property: 'test_value',
      last_test: new Date().toISOString()
    });
    
    // 5. Test incrementing properties
    console.log('Testing property incrementation...');
    Analytics.incrementUserProperty('test_count', 1);
    
    // 6. Test reset
    console.log('Testing user reset...');
    Analytics.reset();
    
    // 7. Test with a large payload
    console.log('Testing with large payload...');
    const largeObject = {};
    for (let i = 0; i < 100; i++) {
      largeObject[`property_${i}`] = `value_${i}`;
    }
    Analytics.track('Large Payload Test', largeObject);
    
    console.log('✅ Mixpanel test completed successfully!');
    console.log('Check the Network tab in DevTools for requests to api-js.mixpanel.com');
    
    return true;
  } catch (error) {
    console.error('❌ Mixpanel test failed:', error);
    return false;
  }
};

/**
 * Check Mixpanel configuration
 * Verifies that Mixpanel is properly configured
 */
export const checkMixpanelConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Mixpanel test utility should not be used in production');
    return;
  }
  
  console.log('🔍 Checking Mixpanel configuration...');
  
  try {
    // Get Mixpanel instance
    const mixpanel = Analytics.getInstance();
    
    if (!mixpanel) {
      console.error('❌ Mixpanel instance not found');
      return false;
    }
    
    // Check if Mixpanel is loaded
    if (!mixpanel.__loaded) {
      console.error('❌ Mixpanel is not loaded');
      return false;
    }
    
    // Check token
    const config = mixpanel.get_config();
    console.log('Mixpanel token:', config.token);
    
    // Check API host
    console.log('API host:', config.api_host);
    if (config.api_host !== 'https://api-js.mixpanel.com') {
      console.warn('⚠️ API host is not set to https://api-js.mixpanel.com');
    }
    
    // Check API method
    console.log('API method:', config.api_method);
    if (config.api_method !== 'POST') {
      console.warn('⚠️ API method is not set to POST');
    }
    
    // Check persistence
    console.log('Persistence:', config.persistence);
    
    console.log('✅ Mixpanel configuration check completed');
    return true;
  } catch (error) {
    console.error('❌ Mixpanel configuration check failed:', error);
    return false;
  }
};

/**
 * Monitor Mixpanel network requests
 * This function will log all Mixpanel network requests
 */
export const monitorMixpanelRequests = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Mixpanel test utility should not be used in production');
    return;
  }
  
  console.log('👀 Starting Mixpanel request monitoring...');
  
  try {
    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Override fetch to monitor Mixpanel requests
    window.fetch = function(url, options) {
      // Check if this is a Mixpanel request
      if (url && url.toString().includes('mixpanel')) {
        console.log('📡 Mixpanel request detected:', {
          url,
          method: options?.method || 'GET',
          headers: options?.headers,
          body: options?.body ? JSON.parse(options.body) : undefined
        });
      }
      
      // Call the original fetch function
      return originalFetch.apply(this, arguments);
    };
    
    console.log('✅ Mixpanel request monitoring started');
    console.log('Perform actions on the site to see Mixpanel requests');
    
    // Return a function to stop monitoring
    return () => {
      window.fetch = originalFetch;
      console.log('Mixpanel request monitoring stopped');
    };
  } catch (error) {
    console.error('❌ Failed to start Mixpanel request monitoring:', error);
    return () => {};
  }
};

// Export a default object with all functions
export default {
  testMixpanelTracking,
  checkMixpanelConfig,
  monitorMixpanelRequests
};
