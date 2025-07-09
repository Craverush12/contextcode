"use client";

import { Suspense } from "react";
import MarketplacePage from "@/components/marketplace/MarketplacePage";
import Footer from "@/components/layout/Footer";

export default function MarketplacePageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <MarketplacePage />
      <Footer />
    </Suspense>
  );
}