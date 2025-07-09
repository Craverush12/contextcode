'use client';

import { Suspense } from 'react';
import PrivacyPolicy from '@/components/Pages/PrivacyPolicy';
import Footer from '@/components/layout/Footer';

export default function PrivacyPolicyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrivacyPolicy />
      <Footer />
    </Suspense>
  );
}