'use client';

import QrPage from "../../components/Pages/QR.jsx";
import { Suspense } from 'react';

export default function QRCodePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QrPage />
    </Suspense>
  );
}