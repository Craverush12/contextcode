'use client';

import Review from '@/components/Pages/Review';
import { Suspense } from 'react';

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Review />
    </Suspense>
  );
}