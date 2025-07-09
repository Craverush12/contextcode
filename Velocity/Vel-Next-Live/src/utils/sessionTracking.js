'use client';

import Analytics from '../lib/analytics';

/**
 * Session Tracking Utility
 *
 * Tracks user session duration, idle time, and provides heartbeat functionality
 * to monitor user presence even without interaction.
 */

// Session state variables
let sessionStartTime = null;
let lastActivityTime = null;
let idleTimeout = null;
let heartbeatInterval = null;
let isIdle = false;

// Configuration constants
const IDLE_THRESHOLD = 60000; // 60 seconds of inactivity considered idle
const HEARTBEAT_INTERVAL = 30000; // 30 seconds between heartbeats

const SessionTracking = {
  /**
   * Initialize session tracking
   * Sets up event listeners and starts tracking
   */
  initSession: () => {
    if (typeof window === 'undefined') return;

    // Record session start time
    sessionStartTime = new Date();
    lastActivityTime = new Date();

    // Track session start
    Analytics.track('Session Started', {
      timestamp: sessionStartTime.toISOString(),
      page: window.location.pathname,
      referrer: document.referrer,
      url: window.location.href,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      is_returning: !!localStorage.getItem('hasVisitedBefore')
    });

    // Mark as visited for future tracking
    localStorage.setItem('hasVisitedBefore', 'true');

    // Set up activity listeners
    document.addEventListener('click', SessionTracking.recordActivity);
    document.addEventListener('keypress', SessionTracking.recordActivity);
    document.addEventListener('scroll', SessionTracking.recordActivity);
    document.addEventListener('mousemove', SessionTracking.throttledRecordActivity);

    // Set up idle detection
    SessionTracking.resetIdleTimeout();

    // Track session on page unload
    window.addEventListener('beforeunload', SessionTracking.endSession);
  },

  /**
   * Record user activity
   * Updates last activity time and resets idle timeout
   */
  recordActivity: () => {
    const now = new Date();

    // If user was idle and is now active again, track return from idle
    if (isIdle) {
      const idleDuration = now - lastActivityTime;

      Analytics.track('User Returned', {
        idle_duration_seconds: Math.floor(idleDuration / 1000),
        page: window.location.pathname,
        timestamp: now.toISOString()
      });

      isIdle = false;
    }

    lastActivityTime = now;
    SessionTracking.resetIdleTimeout();
  },

  /**
   * Throttled version of recordActivity to prevent too many events
   * Only triggers once every 5 seconds for mousemove
   */
  throttledRecordActivity: (() => {
    let lastCall = 0;
    return () => {
      const now = Date.now();
      if (now - lastCall >= 5000) {
        lastCall = now;
        SessionTracking.recordActivity();
      }
    };
  })(),

  /**
   * Reset idle timeout
   * Clears existing timeout and sets a new one
   */
  resetIdleTimeout: () => {
    if (idleTimeout) clearTimeout(idleTimeout);

    idleTimeout = setTimeout(() => {
      // User has been idle for the threshold period
      const now = new Date();
      const idleDuration = now - lastActivityTime;

      isIdle = true;

      Analytics.track('User Idle', {
        idle_duration_seconds: Math.floor(idleDuration / 1000),
        page: window.location.pathname,
        timestamp: now.toISOString(),
        session_duration_so_far: Math.floor((now - sessionStartTime) / 1000)
      });
    }, IDLE_THRESHOLD);
  },

  /**
   * Start heartbeat mechanism
   * Sends regular events to track user presence even without interaction
   */
  startHeartbeat: () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeOnPage = now - sessionStartTime;
      const timeSinceLastActivity = now - lastActivityTime;

      Analytics.track('Heartbeat', {
        time_on_page_seconds: Math.floor(timeOnPage / 1000),
        time_since_activity_seconds: Math.floor(timeSinceLastActivity / 1000),
        page: window.location.pathname,
        url: window.location.href,
        timestamp: now.toISOString(),
        is_idle: isIdle
      });
    }, HEARTBEAT_INTERVAL);
  },

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat: () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  /**
   * Get current session duration in seconds
   * @returns {number} Session duration in seconds
   */
  getSessionDuration: () => {
    if (!sessionStartTime) return 0;

    const now = new Date();
    const sessionDuration = now - sessionStartTime;
    return Math.floor(sessionDuration / 1000);
  },

  /**
   * End session tracking
   * Cleans up listeners and sends final session data
   */
  endSession: () => {
    if (!sessionStartTime) return;

    const now = new Date();
    const sessionDuration = now - sessionStartTime;
    const timeSinceLastActivity = now - lastActivityTime;

    Analytics.track('Session Ended', {
      session_duration_seconds: Math.floor(sessionDuration / 1000),
      time_since_last_activity_seconds: Math.floor(timeSinceLastActivity / 1000),
      page: window.location.pathname,
      url: window.location.href,
      timestamp: now.toISOString(),
      was_idle_at_end: isIdle
    });

    // Clean up
    document.removeEventListener('click', SessionTracking.recordActivity);
    document.removeEventListener('keypress', SessionTracking.recordActivity);
    document.removeEventListener('scroll', SessionTracking.recordActivity);
    document.removeEventListener('mousemove', SessionTracking.throttledRecordActivity);

    if (idleTimeout) clearTimeout(idleTimeout);
    SessionTracking.stopHeartbeat();

    // Reset state
    sessionStartTime = null;
    lastActivityTime = null;
    idleTimeout = null;
    isIdle = false;
  }
};

export default SessionTracking;
