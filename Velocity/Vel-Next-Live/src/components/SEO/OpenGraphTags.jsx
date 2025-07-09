/**
 * Comprehensive Open Graph and Social Media Meta Tags Component
 * Handles Facebook, Twitter, LinkedIn, and other social platforms
 */

import React from "react";

const OpenGraphTags = ({
  // Page specific data
  title = "Velocity - Co-Pilot for AI | One-Click Prompt Optimizer",
  description = "Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!",
  url = "https://thinkvelocity.in/",
  type = "website",

  // Image data
  image = "https://thinkvelocity.in/next-assets/61.png",
  imageWidth = 1200,
  imageHeight = 630,
  imageAlt = "Velocity AI Prompt Optimizer - One-Click Prompt Enhancement Tool",

  // Site data
  siteName = "Think Velocity",
  locale = "en_US",

  // Twitter specific
  twitterCard = "summary_large_image",
  twitterSite = "@thinkvelocity",
  twitterCreator = "@thinkvelocity",

  // Facebook specific
  fbAppId = "1003634615146809",

  // Article specific (for blog posts)
  publishedTime,
  modifiedTime,
  author = "ThinkVelocity Team",
  section,
  tags = [],

  // Additional customization
  additionalImages = [],
  video,
  videoWidth,
  videoHeight,
  videoType,
}) => {
  return (
    <>
      {/* Essential Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Primary Image */}
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={imageWidth} />
      <meta property="og:image:height" content={imageHeight} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:type" content="image/png" />

      {/* Additional Images */}
      {additionalImages.map((img, index) => (
        <React.Fragment key={index}>
          <meta property="og:image" content={img.url} />
          <meta property="og:image:width" content={img.width} />
          <meta property="og:image:height" content={img.height} />
          <meta property="og:image:alt" content={img.alt} />
        </React.Fragment>
      ))}

      {/* Video Tags (if provided) */}
      {video && (
        <>
          <meta property="og:video" content={video} />
          {videoWidth && (
            <meta property="og:video:width" content={videoWidth} />
          )}
          {videoHeight && (
            <meta property="og:video:height" content={videoHeight} />
          )}
          {videoType && <meta property="og:video:type" content={videoType} />}
        </>
      )}

      {/* Article-specific Tags */}
      {type === "article" && (
        <>
          <meta property="article:author" content={author} />
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {modifiedTime && (
            <meta property="article:modified_time" content={modifiedTime} />
          )}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Facebook App ID */}
      {fbAppId && <meta property="fb:app_id" content={fbAppId} />}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* Twitter App Tags */}
      <meta
        name="twitter:app:name:iphone"
        content="Velocity Prompt Optimizer"
      />
      <meta
        name="twitter:app:name:googleplay"
        content="Velocity Prompt Optimizer"
      />
      <meta
        name="twitter:app:url:iphone"
        content="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
      />
      <meta
        name="twitter:app:url:googleplay"
        content="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa"
      />

      {/* LinkedIn specific */}
      <meta property="og:image:secure_url" content={image} />

      {/* WhatsApp and Telegram */}
      <meta property="og:image:type" content="image/png" />
      <meta property="og:rich_attachment" content="true" />

      {/* Discord */}
      <meta name="theme-color" content="#6366f1" />

      {/* Slack */}
      <meta property="og:determiner" content="the" />

      {/* Additional SEO Enhancement */}
      <meta
        property="og:updated_time"
        content={modifiedTime || new Date().toISOString()}
      />

      {/* Product-specific (since you have a Chrome extension) */}
      {type === "product" && (
        <>
          <meta property="product:price:amount" content="0" />
          <meta property="product:price:currency" content="USD" />
          <meta property="product:availability" content="in stock" />
          <meta property="product:condition" content="new" />
          <meta
            property="product:retailer_item_id"
            content="velocity-prompt-optimizer"
          />
        </>
      )}
    </>
  );
};

export default OpenGraphTags;
