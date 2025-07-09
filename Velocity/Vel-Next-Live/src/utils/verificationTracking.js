'use client';

import Analytics from '../lib/analytics';

/**
 * Verification Tracking Utility
 * 
 * Tracks button verification processes including:
 * - Verification start
 * - Verification completion (success/failure)
 * - Verification duration
 * - Verification abandonment
 */

const VerificationTracking = {
  /**
   * Track when a verification process starts
   * @param {string} buttonName - Name of the button being verified
   * @param {string} verificationType - Type of verification (e.g., 'payment', 'login', 'email')
   * @param {object} additionalProps - Additional properties to track
   */
  trackVerificationStart: (buttonName, verificationType, additionalProps = {}) => {
    if (typeof window === 'undefined') return;
    
    const timestamp = new Date().toISOString();
    
    const eventProps = {
      button_name: buttonName,
      verification_type: verificationType,
      page: window.location.pathname,
      url: window.location.href,
      timestamp,
      ...additionalProps
    };
    
    Analytics.track('Verification Started', eventProps);
    
    // Store verification start in session storage for funnel tracking
    try {
      const verifications = JSON.parse(sessionStorage.getItem('verifications') || '{}');
      const key = `${buttonName}_${verificationType}`;
      
      verifications[key] = {
        start_time: timestamp,
        status: 'started',
        button_name: buttonName,
        verification_type: verificationType,
        page: window.location.pathname,
        ...additionalProps
      };
      
      sessionStorage.setItem('verifications', JSON.stringify(verifications));
    } catch (error) {
      console.error('Error storing verification data:', error);
    }
  },
  
  /**
   * Track when a verification process completes (success or failure)
   * @param {string} buttonName - Name of the button being verified
   * @param {string} verificationType - Type of verification
   * @param {boolean} success - Whether verification was successful
   * @param {object} additionalProps - Additional properties to track
   */
  trackVerificationComplete: (buttonName, verificationType, success, additionalProps = {}) => {
    if (typeof window === 'undefined') return;
    
    let startTime = null;
    let duration = null;
    let verificationData = {};
    
    // Get verification start time from session storage
    try {
      const verifications = JSON.parse(sessionStorage.getItem('verifications') || '{}');
      const key = `${buttonName}_${verificationType}`;
      
      if (verifications[key]) {
        verificationData = verifications[key];
        startTime = new Date(verificationData.start_time);
        duration = new Date() - startTime;
        
        // Update verification status
        verifications[key].status = success ? 'completed' : 'failed';
        verifications[key].end_time = new Date().toISOString();
        verifications[key].duration_seconds = Math.floor(duration / 1000);
        verifications[key].success = success;
        
        if (additionalProps.error) {
          verifications[key].error = additionalProps.error;
        }
        
        sessionStorage.setItem('verifications', JSON.stringify(verifications));
      }
    } catch (error) {
      console.error('Error retrieving verification data:', error);
    }
    
    const eventProps = {
      button_name: buttonName,
      verification_type: verificationType,
      success,
      duration_seconds: duration ? Math.floor(duration / 1000) : null,
      page: window.location.pathname,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...verificationData,
      ...additionalProps
    };
    
    Analytics.track('Verification Completed', eventProps);
  },
  
  /**
   * Track when a verification process is abandoned
   * @param {string} buttonName - Name of the button being verified
   * @param {string} verificationType - Type of verification
   * @param {string} abandonReason - Reason for abandonment
   * @param {object} additionalProps - Additional properties to track
   */
  trackVerificationAbandoned: (buttonName, verificationType, abandonReason, additionalProps = {}) => {
    if (typeof window === 'undefined') return;
    
    let startTime = null;
    let duration = null;
    let verificationData = {};
    
    // Get verification start time from session storage
    try {
      const verifications = JSON.parse(sessionStorage.getItem('verifications') || '{}');
      const key = `${buttonName}_${verificationType}`;
      
      if (verifications[key]) {
        verificationData = verifications[key];
        startTime = new Date(verificationData.start_time);
        duration = new Date() - startTime;
        
        // Update verification status
        verifications[key].status = 'abandoned';
        verifications[key].end_time = new Date().toISOString();
        verifications[key].duration_seconds = Math.floor(duration / 1000);
        verifications[key].abandon_reason = abandonReason;
        
        sessionStorage.setItem('verifications', JSON.stringify(verifications));
      }
    } catch (error) {
      console.error('Error retrieving verification data:', error);
    }
    
    const eventProps = {
      button_name: buttonName,
      verification_type: verificationType,
      abandon_reason: abandonReason,
      duration_seconds: duration ? Math.floor(duration / 1000) : null,
      page: window.location.pathname,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...verificationData,
      ...additionalProps
    };
    
    Analytics.track('Verification Abandoned', eventProps);
  },
  
  /**
   * Get all active verifications
   * @returns {Object} Object containing all active verifications
   */
  getActiveVerifications: () => {
    if (typeof window === 'undefined') return {};
    
    try {
      return JSON.parse(sessionStorage.getItem('verifications') || '{}');
    } catch (error) {
      console.error('Error retrieving verifications:', error);
      return {};
    }
  },
  
  /**
   * Clear a specific verification from storage
   * @param {string} buttonName - Name of the button
   * @param {string} verificationType - Type of verification
   */
  clearVerification: (buttonName, verificationType) => {
    if (typeof window === 'undefined') return;
    
    try {
      const verifications = JSON.parse(sessionStorage.getItem('verifications') || '{}');
      const key = `${buttonName}_${verificationType}`;
      
      if (verifications[key]) {
        delete verifications[key];
        sessionStorage.setItem('verifications', JSON.stringify(verifications));
      }
    } catch (error) {
      console.error('Error clearing verification:', error);
    }
  }
};

export default VerificationTracking;
