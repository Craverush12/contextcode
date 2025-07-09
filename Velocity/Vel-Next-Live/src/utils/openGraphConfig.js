/**
 * Open Graph Configuration for Different Pages
 * Each page gets customized social media sharing data
 */

const baseConfig = {
  siteName: "Think Velocity",
  locale: "en_US",
  twitterSite: "@thinkvelocity",
  twitterCreator: "@thinkvelocity",
  fbAppId: "1003634615146809",
  author: "ThinkVelocity Team",
};

export const openGraphConfigs = {
  // Homepage
  home: {
    ...baseConfig,
    title: "Velocity - Co-Pilot for AI | One-Click Prompt Optimizer",
    description: "Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!",
    url: "https://thinkvelocity.in/",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity AI Prompt Optimizer - One-Click Prompt Enhancement Tool",
    additionalImages: [
      {
        url: "https://thinkvelocity.in/next-assets/VEL_LOGO2.png",
        width: 800,
        height: 600,
        alt: "Velocity Logo - AI Prompt Engineering Assistant"
      }
    ]
  },

  // Login Page
  login: {
    ...baseConfig,
    title: "Login - Velocity AI Prompt Optimizer",
    description: "Sign in to your Velocity account and start optimizing your AI prompts with one-click enhancement for ChatGPT, Gemini, and more.",
    url: "https://thinkvelocity.in/login",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity Login - Access Your AI Prompt Optimizer Account"
  },

  // Register Page
  register: {
    ...baseConfig,
    title: "Sign Up - Velocity AI Prompt Optimizer",
    description: "Create your free Velocity account and join thousands of users optimizing their AI prompts. Get started with ChatGPT, Gemini, and Claude enhancement.",
    url: "https://thinkvelocity.in/register",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Sign Up for Velocity - Free AI Prompt Optimization Tool"
  },

  // Contact Page
  contact: {
    ...baseConfig,
    title: "Contact Us - Velocity AI Support",
    description: "Get in touch with the Velocity team. We're here to help you optimize your AI prompts and improve your productivity with our Chrome extension.",
    url: "https://thinkvelocity.in/contact-us",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Contact Velocity Support Team"
  },

  // Privacy Policy
  privacy: {
    ...baseConfig,
    title: "Privacy Policy - Velocity AI",
    description: "Learn how Velocity protects your data and privacy while optimizing your AI prompts. Transparent, secure, and user-focused privacy practices.",
    url: "https://thinkvelocity.in/privacypolicy",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity Privacy Policy - Data Protection & Security"
  },

  // Terms and Conditions
  terms: {
    ...baseConfig,
    title: "Terms & Conditions - Velocity AI",
    description: "Read the terms and conditions for using Velocity, the AI prompt optimizer Chrome extension. Fair, transparent, and user-friendly terms.",
    url: "https://thinkvelocity.in/terms-and-conditions",
    type: "website",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity Terms & Conditions"
  },

  // Chrome Extension Download
  extension: {
    ...baseConfig,
    title: "Download Velocity Chrome Extension - Free AI Prompt Optimizer",
    description: "Install the Velocity Chrome extension for free and start optimizing your AI prompts instantly. Works with ChatGPT, Gemini, Claude, and more.",
    url: "https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa",
    type: "product",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity Chrome Extension - Free Download"
  },

  // Blog Article Template
  blogArticle: {
    ...baseConfig,
    title: "", // Will be set dynamically
    description: "", // Will be set dynamically
    url: "", // Will be set dynamically
    type: "article",
    image: "https://thinkvelocity.in/next-assets/61.png",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Velocity Blog - AI Prompt Optimization Tips",
    // These will be set dynamically for each article
    publishedTime: "",
    modifiedTime: "",
    section: "AI & Productivity",
    tags: []
  }
};

/**
 * Get Open Graph configuration for a specific page
 * @param {string} page - Page identifier
 * @param {object} customData - Custom data to override defaults
 * @returns {object} Open Graph configuration
 */
export const getOpenGraphConfig = (page = 'home', customData = {}) => {
  const basePageConfig = openGraphConfigs[page] || openGraphConfigs.home;
  
  return {
    ...basePageConfig,
    ...customData
  };
};

/**
 * Generate dynamic blog article Open Graph data
 * @param {object} articleData - Article specific data
 * @returns {object} Open Graph configuration for blog article
 */
export const getBlogArticleConfig = (articleData) => {
  const baseConfig = openGraphConfigs.blogArticle;
  
  return {
    ...baseConfig,
    title: `${articleData.title} | Velocity AI Blog`,
    description: articleData.excerpt || articleData.description,
    url: `https://thinkvelocity.in/blog/${articleData.slug}`,
    image: articleData.featuredImage || baseConfig.image,
    imageAlt: articleData.imageAlt || `${articleData.title} - Velocity AI Blog`,
    publishedTime: articleData.publishedDate,
    modifiedTime: articleData.modifiedDate || articleData.publishedDate,
    tags: articleData.tags || [],
    author: articleData.author || baseConfig.author,
  };
};

export default openGraphConfigs; 