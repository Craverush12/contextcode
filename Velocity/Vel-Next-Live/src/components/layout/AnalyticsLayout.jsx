'use client';

import { useEffect } from 'react';
import SessionTracking from '@/utils/sessionTracking';
import Analytics from '@/lib/analytics';

/**
 * Analytics Layout Component
 *
 * Wraps the application to provide session tracking and analytics functionality.
 * This component should be used in the main layout to ensure all pages have analytics.
 */
const AnalyticsLayout = ({ children }) => {
  useEffect(() => {
    // Initialize session tracking when component mounts
    SessionTracking.initSession();
    SessionTracking.startHeartbeat();

    // Track session start in Mixpanel
    Analytics.track('Session Started', {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_size: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      device_type: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    });

    // Clean up when component unmounts
    return () => {
      // Track session end
      Analytics.track('Session Ended', {
        timestamp: new Date().toISOString(),
        session_duration_seconds: SessionTracking.getSessionDuration()
      });

      // End session tracking
      SessionTracking.endSession();
      SessionTracking.stopHeartbeat();
    };
  }, []);

  return (
    <>
      {children}
    </>
  );
};

export default AnalyticsLayout;
