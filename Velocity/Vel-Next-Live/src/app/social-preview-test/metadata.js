import { generatePageMetadata } from '@/utils/generateMetadata';

// Generate metadata for this page
export const metadata = generatePageMetadata({
  title: 'Social Preview Test | Velocity',
  description: 'This page demonstrates how Open Graph meta tags create rich previews when shared on social media platforms.',
  path: '/social-preview-test',
  imageUrl: 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
});

// Export the metadata object
export default metadata;
