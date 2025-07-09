'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Auth from '@/lib/auth';

// Use dynamic import with SSR disabled to prevent "NextRouter was not mounted" error
const ProfilePage = dynamic(() => import('@/components/Pages/ProfilePage'), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => <div className="flex h-screen items-center justify-center">Loading profile...</div>
});

export default function Profile() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Set isClient to true after component mounts and check authentication
  useEffect(() => {
    setIsClient(true);

    // Check authentication status
    const checkAuth = () => {
      const isAuth = Auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      setIsLoading(false);

      if (!isAuth) {
        router.push('/login');
      }
    };

    checkAuth();

    // Add event listener for storage changes (in case of logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        router.push('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  if (!isClient || isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Only render ProfilePage on the client side to prevent router errors
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}