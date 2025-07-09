'use client';

import TermsAndCondition from '@/components/Pages/TermsAndCondition';
import Footer from '@/components/layout/Footer';
import { Suspense } from 'react';

export default function TermsAndConditionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TermsAndCondition />
      <Footer />
    </Suspense>
  );
}