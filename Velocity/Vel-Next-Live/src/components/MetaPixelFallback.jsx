'use client';

import { useEffect } from 'react';

/**
 * Meta Pixel Fallback Component
 *
 * This component provides a fallback mechanism for Meta Pixel tracking
 * in case the main implementation fails. It directly injects the Meta Pixel
 * script into the page without relying on the metaPixel.js utility.
 */
const MetaPixelFallback = ({ pixelId = '1003634615146809' }) => {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Check if Meta Pixel is already initialized
    if (window.fbq) {
      // Don't log anything to avoid console clutter
      return;
    }

    // Set a flag to prevent duplicate initialization
    if (window._metaPixelInitialized) return;
    window._metaPixelInitialized = true;

    try {
      // Initialize Meta Pixel directly
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');

      // Initialize with the provided pixel ID
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        // console.log('Meta Pixel initialized by fallback with ID:', pixelId);
      }

      // Define a global helper function for tracking custom events
      window.trackMetaPixelEvent = (eventName, params = {}) => {
        try {
          if (window.fbq) {
            window.fbq('trackCustom', eventName, params);
            // Only log in development mode
            if (process.env.NODE_ENV === 'development') {
              // console.log('Meta Pixel event tracked via fallback:', eventName);
            }
          }
        } catch (error) {
          // console.error('Error tracking Meta Pixel event via fallback:', error);
        }
      };
    } catch (error) {
      // console.error('Error initializing Meta Pixel fallback:', error);
    }
  }, [pixelId]);

  return null; // This component doesn't render anything
};

export default MetaPixelFallback;
