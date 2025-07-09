'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Analytics from '@/lib/analytics';

/**
 * MixpanelTrackerContent Component
 *
 * This component handles the actual tracking logic.
 * It's wrapped in a Suspense boundary to handle the useSearchParams hook.
 */
function MixpanelTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views when the route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get the full URL including query parameters
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Track the page view
    Analytics.track('Page View', {
      page: pathname,
      url: url,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString()
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      // console.log('Page view tracked:', pathname);
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * MixpanelProvider Component
 *
 * This component initializes Mixpanel tracking and automatically tracks page views
 * when the route changes. It should be included in the main layout component.
 */
const MixpanelProvider = ({ children }) => {
  return (
    <>
      <Suspense fallback={null}>
        <MixpanelTrackerContent />
      </Suspense>
      {children}
    </>
  );
};

export default MixpanelProvider;
