/**
 * Comprehensive Structured Data for LLM Rankings & AI Parsing
 * Implements multiple Schema.org types for maximum visibility
 */

import React from "react";

const StructuredData = ({
  pageType = "website",
  title = "Velocity - AI Prompt Optimizer",
  description = "Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!",
  url = "https://thinkvelocity.in/",
  image = "https://thinkvelocity.in/next-assets/61.png",
  // Article specific
  articleData = null,
  // FAQ specific
  faqData = null,
  // How-to specific
  howToData = null,
}) => {
  // Software Application Schema (Primary for AI Tools)
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://thinkvelocity.in/#software",
    name: "Velocity - AI Prompt Optimizer",
    description:
      "Advanced AI prompt optimization tool that enhances prompts for ChatGPT, Claude, Gemini, and other AI models with one-click functionality.",
    url: "https://thinkvelocity.in/",
    applicationCategory: "ProductivityApplication",
    applicationSubCategory: "AI Tools",
    operatingSystem: ["Chrome OS", "Windows", "macOS", "Linux"],
    browserRequirements: "Chrome 88+, Firefox 85+, Safari 14+, Edge 88+",
    softwareVersion: "2.0",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString(),
    creator: {
      "@type": "Organization",
      "@id": "https://thinkvelocity.in/#organization",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://thinkvelocity.in/#organization",
    },
    offers: {
      "@type": "Offer",
      "@id": "https://thinkvelocity.in/#offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2025-12-31",
      description: "Free AI prompt optimizer Chrome extension",
      seller: {
        "@id": "https://thinkvelocity.in/#organization",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "500",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "One-click prompt optimization",
      "Multi-platform AI support (ChatGPT, Claude, Gemini)",
      "Real-time prompt enhancement",
      "Creative writing assistance",
      "Business productivity templates",
      "Code generation prompts",
      "Data analysis optimization",
      "Productivity boost up to 30%",
    ],
    screenshot: [
      "https://thinkvelocity.in/next-assets/61.png",
      "https://thinkvelocity.in/next-assets/VEL_LOGO2.png",
    ],
    downloadUrl:
      "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
    installUrl:
      "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
    supportingData: {
      "@type": "DataSet",
      name: "Prompt Optimization Research",
      description: "Performance data showing 30% productivity improvement",
    },
    audience: {
      "@type": "Audience",
      audienceType:
        "Business professionals, developers, content creators, AI enthusiasts",
    },
    keywords: [
      "prompt optimizer",
      "ChatGPT enhancer",
      "AI productivity",
      "prompt engineering",
      "AI tools",
      "Chrome extension",
      "artificial intelligence",
      "productivity software",
    ],
  };

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://thinkvelocity.in/#organization",
    name: "Think Velocity",
    alternateName: "ThinkVelocity",
    url: "https://thinkvelocity.in/",
    logo: {
      "@type": "ImageObject",
      "@id": "https://thinkvelocity.in/#logo",
      url: "https://thinkvelocity.in/next-assets/VEL_LOGO2.png",
      contentUrl: "https://thinkvelocity.in/next-assets/VEL_LOGO2.png",
      width: 800,
      height: 600,
      caption: "Think Velocity Logo",
    },
    description:
      "Leading AI prompt optimization company providing tools for enhanced productivity with ChatGPT, Claude, Gemini, and other AI models.",
    foundingDate: "2024",
    industry: "Artificial Intelligence",
    numberOfEmployees: "1-10",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mumbai",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "19.08255545",
      longitude: "72.8789412",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "English",
      url: "https://thinkvelocity.in/contact-us",
    },
    sameAs: [
      "https://linktr.ee/thinkvelocity",
      "https://www.producthunt.com/products/velocity-prompt-co-pilot",
      "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
      "https://www.instagram.com/thinkvelocity/",
      "https://x.com/VelocityThink",
    ],
    makesOffer: {
      "@id": "https://thinkvelocity.in/#offer",
    },
  };

  // Website Schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://thinkvelocity.in/#website",
    url: "https://thinkvelocity.in/",
    name: "Think Velocity",
    description:
      "AI prompt optimization tools and services for enhanced productivity",
    publisher: {
      "@id": "https://thinkvelocity.in/#organization",
    },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://thinkvelocity.in/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    ],
    mainEntity: {
      "@id": "https://thinkvelocity.in/#software",
    },
  };

  // Product Schema for Chrome Extension
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": "https://thinkvelocity.in/#product",
    name: "Velocity Chrome Extension",
    description:
      "Free Chrome extension for AI prompt optimization across ChatGPT, Claude, Gemini, and other AI platforms.",
    image: "https://thinkvelocity.in/next-assets/61.png",
    brand: {
      "@type": "Brand",
      name: "Think Velocity",
    },
    manufacturer: {
      "@id": "https://thinkvelocity.in/#organization",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "500",
    },
    category: "Browser Extension",
    audience: {
      "@type": "Audience",
      audienceType: "Professionals using AI tools",
    },
  };

  // FAQ Schema (if FAQ data provided)
  const faqSchema = faqData
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faqData.map((faq, index) => ({
          "@type": "Question",
          "@id": `${url}#faq-${index}`,
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;

  // How-To Schema (if how-to data provided)
  const howToSchema = howToData
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "@id": `${url}#howto`,
        name: howToData.title,
        description: howToData.description,
        image: howToData.image || image,
        totalTime: howToData.totalTime || "PT2M",
        estimatedCost: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: "0",
        },
        step: howToData.steps.map((step, index) => ({
          "@type": "HowToStep",
          name: step.name,
          text: step.text,
          image: step.image,
          position: index + 1,
        })),
      }
    : null;

  // Article Schema (if article data provided)
  const articleSchema = articleData
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${url}#article`,
        headline: articleData.title,
        description: articleData.description,
        image: articleData.image || image,
        author: {
          "@type": "Person",
          name: articleData.author || "ThinkVelocity Team",
        },
        publisher: {
          "@id": "https://thinkvelocity.in/#organization",
        },
        datePublished: articleData.publishedDate,
        dateModified: articleData.modifiedDate || articleData.publishedDate,
        articleSection: articleData.section || "AI & Productivity",
        keywords: articleData.keywords || [],
        wordCount: articleData.wordCount,
        articleBody: articleData.excerpt,
      }
    : null;

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://thinkvelocity.in/",
      },
    ],
  };

  // Review Schema
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": "https://thinkvelocity.in/#review",
    itemReviewed: {
      "@id": "https://thinkvelocity.in/#software",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: {
      "@type": "Person",
      name: "AI Productivity Users",
    },
    reviewBody:
      "Velocity has revolutionized how I interact with AI tools. The one-click prompt optimization saves hours of trial and error.",
    datePublished: "2024-01-15",
  };

  // Combined Graph for better relationships
  const graphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      softwareApplicationSchema,
      organizationSchema,
      websiteSchema,
      productSchema,
      breadcrumbSchema,
      reviewSchema,
      ...(faqSchema ? [faqSchema] : []),
      ...(howToSchema ? [howToSchema] : []),
      ...(articleSchema ? [articleSchema] : []),
    ],
  };

  return (
    <>
      {/* Main Combined Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graphSchema),
        }}
      />

      {/* Separate schemas for better parsing by different AI systems */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
    </>
  );
};

export default StructuredData;
