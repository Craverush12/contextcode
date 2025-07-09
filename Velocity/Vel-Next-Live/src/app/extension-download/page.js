'use client';

import { Suspense } from 'react';
import Webstore from '@/components/Pages/webstore';

export default function ExtensionDownloadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Webstore standalone={true} />
    </Suspense>
  );
}