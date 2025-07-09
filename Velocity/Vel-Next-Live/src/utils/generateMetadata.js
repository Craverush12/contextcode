/**
 * Utility for generating dynamic metadata for different pages
 * This helps create page-specific Open Graph and Twitter Card meta tags
 *
 * IMPORTANT: This utility should be used in one of two ways:
 *
 * 1. In a separate metadata.js file (recommended for client components):
 *
 *    // src/app/your-page/metadata.js
 *    import { generatePageMetadata } from '@/utils/generateMetadata';
 *
 *    export const metadata = generatePageMetadata({...});
 *
 * 2. Directly in a server component (page without 'use client'):
 *
 *    // src/app/your-page/page.js (without 'use client')
 *    import { generatePageMetadata } from '@/utils/generateMetadata';
 *
 *    export const metadata = generatePageMetadata({...});
 *
 * DO NOT export metadata from a client component (with 'use client' directive)
 */

/**
 * Generate metadata for a specific page
 *
 * @param {Object} options - Configuration options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.path - Page path (e.g., '/about', '/login')
 * @param {string} options.imageUrl - URL to the page's featured image
 * @param {number} options.imageWidth - Width of the featured image
 * @param {number} options.imageHeight - Height of the featured image
 * @param {string} options.imageAlt - Alt text for the featured image
 * @param {string} options.type - Open Graph type (default: 'website')
 * @returns {Object} Metadata object compatible with Next.js metadata API
 */
export function generatePageMetadata({
  title,
  description,
  path = '',
  imageUrl = 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
  imageWidth = 1200,
  imageHeight = 630,
  imageAlt = 'Velocity: The Prompt Co-Pilot',
  type = 'website',
}) {
  // Base URL for the site
  const baseUrl = 'https://thinkvelocity.in';

  // Full URL for the current page
  const url = `${baseUrl}${path}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      url,
      siteName: 'Think Velocity',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@thinkvelocity',
      creator: '@thinkvelocity',
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for a blog post or article
 *
 * @param {Object} options - Configuration options
 * @param {string} options.title - Article title
 * @param {string} options.description - Article description
 * @param {string} options.path - Article path (e.g., '/blog/post-slug')
 * @param {string} options.imageUrl - URL to the article's featured image
 * @param {number} options.imageWidth - Width of the featured image
 * @param {number} options.imageHeight - Height of the featured image
 * @param {string} options.imageAlt - Alt text for the featured image
 * @param {string} options.authorName - Name of the article author
 * @param {string} options.publishedTime - ISO date string of when the article was published
 * @param {string} options.modifiedTime - ISO date string of when the article was last modified
 * @param {Array<string>} options.tags - Array of article tags
 * @returns {Object} Metadata object compatible with Next.js metadata API
 */
export function generateArticleMetadata({
  title,
  description,
  path,
  imageUrl = 'https://thinkvelocity.in/next-assets/Chrome_Store.png',
  imageWidth = 1200,
  imageHeight = 630,
  imageAlt = 'Velocity: The Prompt Co-Pilot',
  authorName = 'ThinkVelocity Team',
  publishedTime,
  modifiedTime,
  tags = [],
}) {
  // Base URL for the site
  const baseUrl = 'https://thinkvelocity.in';

  // Full URL for the current article
  const url = `${baseUrl}${path}`;

  return {
    title,
    description,
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      siteName: 'Think Velocity',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt,
        },
      ],
      article: {
        publishedTime,
        modifiedTime,
        authors: [authorName],
        tags,
      },
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: '@thinkvelocity',
      creator: '@thinkvelocity',
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default {
  generatePageMetadata,
  generateArticleMetadata,
};
