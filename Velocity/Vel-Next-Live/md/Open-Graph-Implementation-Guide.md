# Open Graph and Social Media Embeds Implementation Guide

This guide explains how the Open Graph meta tags and social media embeds have been implemented in the Velocity website to ensure rich previews when links are shared on social media platforms.

## What Are Open Graph Meta Tags?

Open Graph meta tags are a set of standardized meta tags that control how URLs are displayed when shared on social media. They were originally created by Facebook but are now used by most social platforms including Twitter, LinkedIn, Pinterest, and more.

## Implementation Overview

The implementation consists of the following components:

1. **Base Metadata Configuration** (`src/app/layout.js`)
   - Default Open Graph meta tags for the entire site
   - Facebook-specific meta tags
   - Twitter Card meta tags

2. **Dynamic Metadata Utility** (`src/utils/generateMetadata.js`)
   - Functions to generate page-specific metadata
   - Support for different content types (website pages, articles)

3. **Meta Pixel Integration**
   - Meta Pixel script for tracking (ID: 1003634615146809)
   - Proper initialization and event tracking

## Meta Tags Implemented

### Basic Open Graph Tags

```html
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Page Description" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://thinkvelocity.in/" />
<meta property="og:site_name" content="Think Velocity" />
<meta property="og:locale" content="en_US" />
```

### Open Graph Image Tags

```html
<meta property="og:image" content="https://thinkvelocity.in/next-assets/Chrome_Store.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Velocity: The Prompt Co-Pilot" />
```

### Facebook-Specific Tags

```html
<meta property="fb:app_id" content="1003634615146809" />
```

### Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@thinkvelocity" />
<meta name="twitter:creator" content="@thinkvelocity" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:description" content="Page Description" />
<meta name="twitter:image" content="https://thinkvelocity.in/next-assets/Velocity_SEO_Logo.png" />
<meta name="twitter:image:alt" content="Image Alt Text" />
```

## How to Use Dynamic Metadata for Specific Pages

There are two ways to implement metadata in Next.js:

### Method 1: Using a Separate metadata.js File (Recommended for Client Components)

This approach is recommended when your page component uses the 'use client' directive:

```jsx
// src/app/about/metadata.js
import { generatePageMetadata } from '@/utils/generateMetadata';

// Generate metadata for this page
export const metadata = generatePageMetadata({
  title: 'About Velocity | The Prompt Co-Pilot',
  description: 'Learn about Velocity, the AI-powered Prompt Co-Pilot that optimizes your prompts for better results.',
  path: '/about',
  imageUrl: 'https://thinkvelocity.in/next-assets/about-preview.png',
});

// src/app/about/page.js
'use client';

export default function AboutPage() {
  return (
    // Page content
  );
}
```

### Method 2: Directly in a Server Component

If your page doesn't use the 'use client' directive, you can export metadata directly:

```jsx
// src/app/about/page.js (without 'use client')
import { generatePageMetadata } from '@/utils/generateMetadata';

// Generate metadata for this page
export const metadata = generatePageMetadata({
  title: 'About Velocity | The Prompt Co-Pilot',
  description: 'Learn about Velocity, the AI-powered Prompt Co-Pilot that optimizes your prompts for better results.',
  path: '/about',
  imageUrl: 'https://thinkvelocity.in/next-assets/about-preview.png',
});

export default function AboutPage() {
  return (
    // Page content
  );
}
```

### For Blog Posts or Articles with Dynamic Paths

For content that should use the 'article' Open Graph type with dynamic routes:

```jsx
// src/app/blog/[slug]/metadata.js
import { generateArticleMetadata } from '@/utils/generateMetadata';
import { getArticleBySlug } from '@/lib/articles'; // Your data fetching function

// Generate metadata for this article
export async function generateMetadata({ params }) {
  // You could fetch article data here
  const article = await getArticleBySlug(params.slug);

  return generateArticleMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/blog/${article.slug}`,
    imageUrl: article.featuredImage,
    authorName: article.author.name,
    publishedTime: article.publishDate,
    modifiedTime: article.lastUpdated,
    tags: article.tags,
  });
}

// src/app/blog/[slug]/page.js
'use client';

export default function BlogPost({ params }) {
  // Page content
}
```

> **Important**: Never export metadata from a component marked with 'use client'. This will cause a build error in Next.js.

## Testing Social Media Previews

To test how your links will appear when shared on social media, use these tools:

1. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Enter your page URL and click "Debug"
   - This tool will show you how your page will appear when shared on Facebook
   - It also allows you to refresh Facebook's cache of your page

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Enter your page URL and click "Preview card"
   - This shows how your link will appear when shared on Twitter

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Enter your page URL and click "Inspect"
   - This shows how your link will appear when shared on LinkedIn

## Best Practices for Social Media Images

For optimal display across platforms:

1. **Primary Open Graph Image**
   - Dimensions: 1200 × 630 pixels
   - Aspect ratio: 1.91:1
   - Format: PNG, JPEG, or GIF
   - Keep important content centered (platforms may crop edges)

2. **Twitter Card Image**
   - For summary_large_image: 1200 × 628 pixels
   - For summary: 800 × 800 pixels
   - Keep file size under 5MB

3. **General Tips**
   - Use high-quality images with good contrast
   - Include branding elements for recognition
   - Avoid small text that may be unreadable in thumbnails
   - Test across multiple platforms

## Troubleshooting

If your social media previews aren't displaying correctly:

1. **Check Cache**
   - Social platforms cache Open Graph data
   - Use the debugging tools mentioned above to refresh the cache

2. **Verify Meta Tags**
   - Ensure all required meta tags are present
   - Check for typos or formatting errors

3. **Image Issues**
   - Confirm images are accessible (not behind authentication)
   - Verify image dimensions meet platform requirements
   - Check that image URLs are absolute (not relative)

4. **Server Configuration**
   - Ensure your server allows social media crawlers
   - Check robots.txt isn't blocking access

## Resources

- [The Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/best-practices/)
- [LinkedIn Developer Documentation](https://developer.linkedin.com/docs/share-on-linkedin)
