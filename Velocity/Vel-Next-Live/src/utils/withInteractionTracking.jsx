'use client';

import React, { useEffect } from 'react';
import { trackInteraction, trackRedirection } from '@/utils/interactionTracking';

/**
 * Higher-order component that adds automatic interaction tracking to a component
 * 
 * @param {React.ComponentType} WrappedComponent - The component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.componentName - Name of the component for tracking
 * @param {string} options.location - Where this component appears
 * @param {boolean} options.trackAllClicks - Whether to track all click events within the component
 * @param {Array<string>} options.trackElementTypes - Element types to track (button, a, etc.)
 * @returns {React.ComponentType} - Enhanced component with tracking
 */
const withInteractionTracking = (
  WrappedComponent,
  {
    componentName,
    location,
    trackAllClicks = false,
    trackElementTypes = ['button', 'a']
  } = {}
) => {
  // Return a new component with tracking functionality
  const WithTracking = (props) => {
    useEffect(() => {
      if (!trackAllClicks || typeof document === 'undefined') return;
      
      // Function to handle clicks and track them
      const handleDocumentClick = (event) => {
        // Find the closest trackable element
        let target = event.target;
        let trackableElement = null;
        
        // Traverse up the DOM to find a trackable element
        while (target && target !== document) {
          if (trackElementTypes.includes(target.tagName.toLowerCase())) {
            trackableElement = target;
            break;
          }
          target = target.parentNode;
        }
        
        // If we found a trackable element, track the interaction
        if (trackableElement) {
          const elementType = trackableElement.tagName.toLowerCase();
          const elementName = 
            trackableElement.id || 
            trackableElement.name || 
            trackableElement.getAttribute('data-testid') || 
            trackableElement.textContent.trim().substring(0, 20) || 
            'unknown';
          
          // Get destination for links
          let destination = null;
          if (elementType === 'a' && trackableElement.href) {
            destination = trackableElement.href;
          }
          
          // Track the interaction
          trackInteraction(elementType, elementName, location || componentName, {
            component_name: componentName
          });
          
          // If it's a link, also track as redirection
          if (destination) {
            trackRedirection(
              typeof window !== 'undefined' ? window.location.pathname : '',
              destination,
              `${elementType}_click`,
              { element_name: elementName, component_name: componentName }
            );
          }
        }
      };
      
      // Add event listener
      document.addEventListener('click', handleDocumentClick);
      
      // Clean up
      return () => {
        document.removeEventListener('click', handleDocumentClick);
      };
    }, []);
    
    // Render the wrapped component with all props
    return <WrappedComponent {...props} />;
  };
  
  // Set display name for debugging
  WithTracking.displayName = `withInteractionTracking(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;
  
  return WithTracking;
};

export default withInteractionTracking;
