'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import withAuth from '@/components/HOC/withAuth';

// Use dynamic import with SSR disabled to prevent "NextRouter was not mounted" error
const ProfilePage = dynamic(() => import('@/components/Pages/ProfilePage'), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => <div className="flex h-screen items-center justify-center">Loading profile...</div>
});

// Create a component that renders ProfilePage with Suspense
const ProfilePageWithSuspense = () => (
  <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
    <ProfilePage />
  </Suspense>
);

// Wrap the component with the authentication HOC
const ProtectedProfilePage = withAuth(ProfilePageWithSuspense);

export default ProtectedProfilePage;
