'use client';

import Analytics from '@/config/analytics';

/**
 * User properties tracking utilities
 */

/**
 * Set initial user properties when a user first signs up or logs in
 * @param {string} userId - The user's ID
 * @param {Object} properties - Basic user properties
 */
export const setInitialUserProperties = (userId, properties = {}) => {
  if (!userId) return;
  
  const baseProperties = {
    first_seen: new Date().toISOString(),
    user_id: userId,
    ...properties
  };
  
  // Use set_once to ensure we don't overwrite these properties if they already exist
  Analytics.setOnceUserProperties(baseProperties);
};

/**
 * Update user properties with the latest information
 * @param {string} userId - The user's ID
 * @param {Object} properties - User properties to update
 */
export const updateUserProperties = (userId, properties = {}) => {
  if (!userId) return;
  
  // First identify the user
  Analytics.identify(userId);
  
  // Then update their properties
  Analytics.setUserProperties({
    last_updated: new Date().toISOString(),
    ...properties
  });
};

/**
 * Track user preferences
 * @param {string} userId - The user's ID
 * @param {Object} preferences - User preferences
 */
export const trackUserPreferences = (userId, preferences = {}) => {
  if (!userId) return;
  
  // First identify the user
  Analytics.identify(userId);
  
  // Create a properties object with prefixed keys
  const prefProperties = Object.entries(preferences).reduce((acc, [key, value]) => {
    acc[`pref_${key}`] = value;
    return acc;
  }, {});
  
  // Update user properties with preferences
  Analytics.setUserProperties(prefProperties);
};

/**
 * Track user engagement metrics
 * @param {string} userId - The user's ID
 * @param {Object} metrics - Engagement metrics to track
 */
export const trackEngagementMetrics = (userId, metrics = {}) => {
  if (!userId) return;
  
  // First identify the user
  Analytics.identify(userId);
  
  // Update engagement metrics
  Analytics.setUserProperties({
    last_active: new Date().toISOString(),
    ...metrics
  });
  
  // Increment numeric metrics if provided
  Object.entries(metrics).forEach(([key, value]) => {
    if (typeof value === 'number') {
      Analytics.incrementUserProperty(key, value);
    }
  });
};

/**
 * Track subscription status changes
 * @param {string} userId - The user's ID
 * @param {string} status - New subscription status
 * @param {Object} details - Additional subscription details
 */
export const trackSubscriptionStatus = (userId, status, details = {}) => {
  if (!userId) return;
  
  // First identify the user
  Analytics.identify(userId);
  
  // Track the subscription change event
  Analytics.track('subscription_changed', {
    user_id: userId,
    subscription_status: status,
    ...details
  });
  
  // Update user properties with subscription info
  Analytics.setUserProperties({
    subscription_status: status,
    subscription_updated_at: new Date().toISOString(),
    ...Object.entries(details).reduce((acc, [key, value]) => {
      acc[`subscription_${key}`] = value;
      return acc;
    }, {})
  });
};

export default {
  setInitialUserProperties,
  updateUserProperties,
  trackUserPreferences,
  trackEngagementMetrics,
  trackSubscriptionStatus
};
