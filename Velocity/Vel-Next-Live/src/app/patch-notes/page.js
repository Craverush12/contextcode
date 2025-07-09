'use client';

import ReleaseNotes from '@/components/home/ReleaseNotes';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export default function PatchNotesPage() {
  return (
    <div>
      {/* <Navbar /> */}
      <div className="min-h-screen">
        <ReleaseNotes />
      </div>
      <Footer />
    </div>
  );
}
