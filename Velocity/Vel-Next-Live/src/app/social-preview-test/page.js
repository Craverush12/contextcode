'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EventTracking from '@/utils/eventTracking';

// Note: Metadata is now defined in metadata.js

export default function SocialPreviewTestPage() {
  // Track page visit when component mounts
  useEffect(() => {
    EventTracking.trackVisit({
      page_name: 'Social Preview Test',
      page_category: 'demo',
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Social Media Preview Test Page</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">About This Page</h2>
        <p className="mb-4">
          This page demonstrates how Open Graph meta tags create rich previews when shared on social media platforms.
          When you share a link to this page on platforms like Facebook, Twitter, or LinkedIn, it will display a
          preview with the title, description, and image specified in the metadata.
        </p>

        <div className="border-l-4 border-blue-500 pl-4 py-2 mb-6 bg-blue-50">
          <p className="text-blue-800">
            <strong>Try it:</strong> Copy this page's URL and share it on a social media platform to see the rich preview in action.
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

        <h3 className="text-xl font-semibold mb-3">Metadata Used</h3>
        <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          <pre className="text-sm">
{`{
  title: 'Social Preview Test | Velocity',
  description: 'This page demonstrates how Open Graph meta tags create rich previews when shared on social media platforms.',
  path: '/social-preview-test',
  imageUrl: 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
}`}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Testing Tools</h2>
        <p className="mb-4">
          You can use these tools to test how your links will appear when shared on social media:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>
            <a
              href="https://developers.facebook.com/tools/debug/?q=https://thinkvelocity.in/social-preview-test"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Facebook Sharing Debugger
            </a>
          </li>
          <li>
            <a
              href="https://cards-dev.twitter.com/validator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Twitter Card Validator
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/post-inspector/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              LinkedIn Post Inspector
            </a>
          </li>
        </ul>
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
