'use client';

import { useEffect } from 'react';
import MetaPixel from '@/utils/metaPixel';

// Meta Pixel ID - Using the hardcoded value from layout.js
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1003634615146809';

/**
 * Component to initialize Meta Pixel tracking
 * This should be included in the main layout component
 *
 * Note: This component is used in addition to the inline script in layout.js
 * to ensure Meta Pixel is properly initialized in all scenarios
 */
const MetaPixelScript = () => {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Check if Meta Pixel is already initialized
    if (window.fbq) {
      // If already initialized, just track the page view
      MetaPixel.trackPageView();
      return;
    }

    // Check for the initialization flag
    if (window._metaPixelInitialized) {
      // If the flag is set but fbq is not available, wait a bit and try again
      const checkInterval = setInterval(() => {
        if (window.fbq) {
          MetaPixel.trackPageView();
          clearInterval(checkInterval);
        }
      }, 100);

      // Clear the interval after 3 seconds to prevent memory leaks
      setTimeout(() => clearInterval(checkInterval), 3000);
      return;
    }

    // Set the initialization flag
    window._metaPixelInitialized = true;

    // Initialize Meta Pixel
    MetaPixel.init(META_PIXEL_ID);

    // Track page view
    MetaPixel.trackPageView();
  }, []);

  return null; // This component doesn't render anything
};

export default MetaPixelScript;
