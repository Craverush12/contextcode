'use client';

import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import PromptBox from '@/components/prompt/PromptBox';

export default function PromptBoxPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />
      <PromptBox />
    </Suspense>
  );
}