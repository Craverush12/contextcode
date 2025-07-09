'use client';

/**
 * Utility for testing Mixpanel analytics implementation
 * This file should only be used in development environments
 */

// Test all major analytics functionality
export const testAnalyticsImplementation = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Analytics test utility should not be used in production');
    return;
  }
  
  console.log('🧪 Starting analytics implementation test...');
  
  // Import required modules
  import('@/config/analytics').then(({ default: Analytics }) => {
    // Test basic tracking
    console.log('Testing basic event tracking...');
    Analytics.track('test_event', { test_property: 'test_value' });
    
    // Test page view tracking
    console.log('Testing page view tracking...');
    Analytics.trackPageView('Test Page');
    
    // Test user identification
    console.log('Testing user identification...');
    const testUserId = 'test-user-' + Date.now();
    Analytics.identify(testUserId);
    
    // Test user properties
    console.log('Testing user properties...');
    Analytics.setUserProperties({
      test_property: 'test_value',
      test_date: new Date().toISOString()
    });
    
    // Test error tracking
    console.log('Testing error tracking...');
    Analytics.trackError('test_error', 'This is a test error', {
      error_source: 'analytics_test'
    });
    
    // Reset the test user to clean up
    console.log('Cleaning up test user...');
    Analytics.reset();
    
    console.log('✅ Analytics implementation test completed successfully');
    console.log('Check Mixpanel dashboard to verify events were received');
  });
};

// Test specific event tracking utilities
export const testEventTrackingUtilities = () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Analytics test utility should not be used in production');
    return;
  }
  
  console.log('🧪 Starting event tracking utilities test...');
  
  // Import required modules
  Promise.all([
    import('@/utils/eventTracking'),
    import('@/utils/userProperties'),
    import('@/config/analytics')
  ]).then(([eventTracking, userProperties, { default: Analytics }]) => {
    // Test user events
    console.log('Testing user events...');
    const testUserId = 'test-user-' + Date.now();
    
    eventTracking.trackUserSignup('email', testUserId, {
      email: 'test@example.com',
      username: 'Test User'
    });
    
    eventTracking.trackUserLogin('email', testUserId, {
      email: 'test@example.com',
      username: 'Test User'
    });
    
    // Test feature usage
    console.log('Testing feature usage events...');
    eventTracking.trackFeatureUsage('test_feature', {
      feature_option: 'test_option'
    });
    
    // Test button clicks
    console.log('Testing button click events...');
    eventTracking.trackButtonClick('test_button', {
      location: 'test_page'
    });
    
    // Test form events
    console.log('Testing form events...');
    eventTracking.trackFormSubmit('test_form', {
      form_fields: 5
    });
    
    // Test user properties
    console.log('Testing user properties utilities...');
    userProperties.updateUserProperties(testUserId, {
      test_property: 'test_value'
    });
    
    userProperties.trackUserPreferences(testUserId, {
      theme: 'dark',
      notifications: true
    });
    
    userProperties.trackEngagementMetrics(testUserId, {
      sessions_count: 1,
      features_used: 3
    });
    
    userProperties.trackSubscriptionStatus(testUserId, 'free', {
      plan: 'basic',
      trial_days_left: 14
    });
    
    // Reset the test user to clean up
    console.log('Cleaning up test user...');
    Analytics.reset();
    
    console.log('✅ Event tracking utilities test completed successfully');
    console.log('Check Mixpanel dashboard to verify events were received');
  });
};

export default {
  testAnalyticsImplementation,
  testEventTrackingUtilities
};
