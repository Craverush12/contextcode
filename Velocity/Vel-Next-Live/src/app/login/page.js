'use client';

import Login from '@/components/Pages/Login';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

export default function LoginPage() {
  const router = useRouter();
  
  const handleSuccessfulLogin = (authToken, userId) => {
    // Store user data in localStorage
    localStorage.setItem('token', authToken);
    localStorage.setItem('userId', userId);
    
    // Redirect to profile page
    router.push('/profile');
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Login onSuccessfulLogin={handleSuccessfulLogin} />
    </Suspense>
  );
}