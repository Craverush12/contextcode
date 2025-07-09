'use client';

import UserOnboarding from '@/components/Pages/UserOnboarding';
import { Suspense } from 'react';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserOnboarding />
    </Suspense>
  );
}