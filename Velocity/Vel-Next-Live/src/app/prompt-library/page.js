'use client';

import PromptLibraryPage from '@/components/prompt/PromptLibrary';
import Footer from '@/components/layout/Footer';
import { Suspense } from 'react';

export default function PromptLibraryPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PromptLibraryPage />
      <Footer />
    </Suspense>
  );
}