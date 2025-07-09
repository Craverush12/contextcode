'use client';

import Analytics from '../lib/analytics';

/**
 * Utility functions for tracking button clicks with Mixpanel
 */
const ButtonTracking = {
  /**
   * Track a button click event
   * @param {string} buttonName - Name of the button (should be consistent across the site)
   * @param {object} additionalProps - Additional properties to track with the event
   * @param {function} callback - Optional callback to execute after tracking
   */
  trackButtonClick: (buttonName, additionalProps = {}, callback = null) => {
    // Combine button name with additional properties
    const eventProps = {
      buttonName,
      location: typeof window !== 'undefined' ? window.location.pathname : '',
      timestamp: new Date().toISOString(),
      ...additionalProps
    };

    // Track the event
    Analytics.track('Button Clicked', eventProps);
    
    // Execute callback if provided
    if (callback && typeof callback === 'function') {
      callback();
    }
  },

  /**
   * Create a click handler that tracks the button click and then executes the original onClick
   * @param {string} buttonName - Name of the button
   * @param {function} originalOnClick - Original onClick handler
   * @param {object} additionalProps - Additional properties to track
   * @returns {function} - New click handler function
   */
  createTrackedClickHandler: (buttonName, originalOnClick, additionalProps = {}) => {
    return (e) => {
      // Track the button click
      ButtonTracking.trackButtonClick(buttonName, additionalProps);
      
      // Call the original onClick handler if it exists
      if (originalOnClick && typeof originalOnClick === 'function') {
        originalOnClick(e);
      }
    };
  },

  /**
   * HOC (Higher Order Component) that adds tracking to a button component
   * @param {React.Component} ButtonComponent - The button component to wrap
   * @param {string} buttonName - Name of the button for tracking
   * @param {object} additionalProps - Additional properties to track
   * @returns {React.Component} - Wrapped component with tracking
   */
  withButtonTracking: (ButtonComponent, buttonName, additionalProps = {}) => {
    return (props) => {
      const trackedOnClick = ButtonTracking.createTrackedClickHandler(
        buttonName,
        props.onClick,
        additionalProps
      );

      return <ButtonComponent {...props} onClick={trackedOnClick} />;
    };
  }
};

export default ButtonTracking;
