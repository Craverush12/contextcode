'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';

function PageTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleRouteChange = (url) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'pageview',
        page: url,
      });
    };

    handleRouteChange(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));
  }, [pathname, searchParams]);

  return null;
}

export default function PageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackerContent />
    </Suspense>
  );
}