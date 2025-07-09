import { generatePageMetadata } from '@/utils/generateMetadata';
import Link from 'next/link';
import Image from 'next/image';

// Generate metadata for this page (this works because this is a server component)
export const metadata = generatePageMetadata({
  title: 'Metadata Example | Velocity',
  description: 'This page demonstrates how to correctly implement metadata in a server component.',
  path: '/metadata-example',
  imageUrl: 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
});

export default function MetadataExamplePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Metadata Example Page (Server Component)</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">About This Page</h2>
        <p className="mb-4">
          This page demonstrates how to correctly implement metadata in a server component.
          Since this page doesn't use the 'use client' directive, we can export metadata directly from this file.
        </p>
        
        <div className="border-l-4 border-green-500 pl-4 py-2 mb-6 bg-green-50">
          <p className="text-green-800">
            <strong>Correct approach:</strong> This page is a server component that exports metadata directly.
          </p>
        </div>
        
        <h3 className="text-xl font-semibold mb-3">Preview Image</h3>
        <div className="relative w-full h-64 mb-6 border border-gray-200 rounded overflow-hidden">
          <Image 
            src="https://thinkvelocity.in/next-assets/Chrome_Store.png"
            alt="Velocity: The Prompt Co-Pilot"
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
        
        <h3 className="text-xl font-semibold mb-3">Code Example</h3>
        <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          <pre className="text-sm">
{`// src/app/metadata-example/page.js (server component)
import { generatePageMetadata } from '@/utils/generateMetadata';

// Generate metadata for this page
export const metadata = generatePageMetadata({
  title: 'Metadata Example | Velocity',
  description: 'This page demonstrates how to correctly implement metadata in a server component.',
  path: '/metadata-example',
  imageUrl: 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
});

export default function MetadataExamplePage() {
  return (
    // Page content
  );
}`}
          </pre>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Client Component Example</h2>
        <p className="mb-4">
          For client components (with 'use client' directive), you should create a separate metadata.js file:
        </p>
        
        <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          <pre className="text-sm">
{`// src/app/your-page/metadata.js
import { generatePageMetadata } from '@/utils/generateMetadata';

export const metadata = generatePageMetadata({
  title: 'Your Page | Velocity',
  description: 'Your page description',
  path: '/your-page',
});

// src/app/your-page/page.js
'use client';

export default function YourPage() {
  return (
    // Page content
  );
}`}
          </pre>
        </div>
      </div>
      
      <div className="text-center mt-8">
        <Link href="/social-preview-test" className="text-blue-600 hover:underline mr-4">
          View Client Component Example
        </Link>
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
