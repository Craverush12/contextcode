import './globals.css';
import PageTracker from '../components/PageTracker'; // Import the client component
import Script from 'next/script';
import { GoogleTagManager } from '@next/third-parties/google';
import AnalyticsLayout from '../components/layout/AnalyticsLayout'; // Import the analytics layout
import MetaPixelScript from '../components/MetaPixelScript'; // Import Meta Pixel component
import MetaPixelFallback from '../components/MetaPixelFallback'; // Import Meta Pixel fallback
import MixpanelProvider from '../components/analytics/MixpanelProvider'; // Import Mixpanel provider
import StructuredData from '../components/SEO/StructuredData'; // Import enhanced structured data
import { velocityFAQs, howToData } from '../data/faqData'; // Import FAQ data for LLM rankings

export const metadata = {
  title: 'Velocity - Co-Pilot for AI | One-Click Prompt Optimizer',
  description: 'Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!',
  authors: [{ name: 'ThinkVelocity Team' }],
  robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  openGraph: {
    title: 'Velocity - Co-Pilot for AI | One-Click Prompt Optimizer',
    description: 'Transform your AI prompts instantly with Velocity. One-click prompt optimization for ChatGPT, Gemini & more. Boost productivity by 30%. Try free!',
    type: 'website',
    url: 'https://thinkvelocity.in/',
    siteName: 'Think Velocity',
    locale: 'en_US',
    images: [
      {
        url: 'https://thinkvelocity.in/next-assets/61.png',
        width: 1200,
        height: 630,
        alt: 'Velocity AI Prompt Optimizer - One-Click Prompt Enhancement Tool',
      },
      {
        url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png',
        width: 800,
        height: 600,
        alt: 'Velocity Logo - AI Prompt Engineering Assistant',
      }
    ],
  },
  facebook: {
    appId: '1003634615146809',
  },
  twitter: {
    card: 'summary_large_image',
      title: 'Velocity - Co-Pilot for AI | One-Click Prompt Optimizer',
    description: 'Transform your AI prompts instantly with Velocity. One-click optimization for ChatGPT, Gemini & more. Boost productivity by 30%.',
    site: '@thinkvelocity',
    creator: '@thinkvelocity',
    images: [
      {
        url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png',
        alt: 'Velocity AI Prompt Optimizer Tool',
      }
    ],
  },
  icons: {
    icon: [
      { url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.ico', sizes: 'any' },
      { url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png', sizes: '16x16', type: 'image/png' },
      { url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcut: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: 'https://thinkvelocity.in/next-assets/VEL_LOGO2.png',
        color: '#6366f1'
      }
    ]
  },
  alternates: {
    canonical: 'https://thinkvelocity.in/',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Performance and Resource Hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//checkout.razorpay.com" />

        {/* Viewport and Mobile Optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />

        {/* Enhanced SEO Meta Tags */}
        <meta name="author" content={metadata.authors[0].name} />
        <meta name="robots" content={metadata.robots} />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        
        {/* 🤖 AI TOOL DISCOVERY KEYWORDS - Critical for LLM Rankings */}
        <meta name="keywords" content="prompt optimizer, ChatGPT prompt enhancer, AI productivity tools, prompt engineering tool, AI prompt generator, prompt optimization software, ChatGPT enhancement, Claude prompt optimizer, Gemini prompt enhancer, AI writing assistant, prompt engineering assistant, AI productivity extension, automated prompt optimization, prompt enhancement chrome extension, AI tool optimization, prompt co-pilot, AI prompt improvement, intelligent prompt generation, AI workflow optimization, prompt engineering automation" />
        
        {/* Local SEO Meta Tags */}
        <meta name="geo.region" content="IN-MH" />
        <meta name="geo.placename" content="Mumbai" />
        <meta name="geo.position" content="19.08255545;72.8789412" />
        <meta name="ICBM" content="19.08255545, 72.8789412" />
        <meta name="DC.title" content="Think Velocity - AI Prompt Optimizer Mumbai" />

        {/* Hreflang for International SEO */}
        <link rel="alternate" hrefLang="en" href="https://thinkvelocity.in/" />
        <link rel="alternate" hrefLang="x-default" href="https://thinkvelocity.in/" />

        {/* 🚀 ENHANCED STRUCTURED DATA FOR LLM VISIBILITY */}
        <StructuredData 
          pageType="website"
          title={metadata.title}
          description={metadata.description}
          url={metadata.openGraph.url}
          image={metadata.openGraph.images[0].url}
          faqData={velocityFAQs}
          howToData={howToData}
        />

        {/* Payment Gateway */}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

        {/* Accessibility Navigation - Hidden but available for screen readers */}
        <noscript>
          <nav aria-label="Site Navigation" style={{ 
            position: 'absolute', 
            width: '1px', 
            height: '1px', 
            padding: 0, 
            margin: '-1px', 
            overflow: 'hidden', 
            clip: 'rect(0, 0, 0, 0)', 
            whiteSpace: 'nowrap', 
            border: 0 
          }}>
            <ul>
              <li><a href="https://thinkvelocity.in/#home">Home</a></li>
              <li><a href="https://thinkvelocity.in/#howItWorks">How It Works</a></li>
              <li><a href="https://thinkvelocity.in/#builtFor">Built For</a></li>
              <li><a href="https://thinkvelocity.in/#ReleaseNotes">Release Notes</a></li>
              <li><a href="https://thinkvelocity.in/privacypolicy">Privacy Policy</a></li>
              <li><a href="https://thinkvelocity.in/login">Login</a></li>
              <li><a href="https://thinkvelocity.in/#promptBoxRef">Try For Free</a></li>
            </ul>
          </nav>
        </noscript>

        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="author" content={metadata.authors[0].name} />
        <meta name="robots" content={metadata.robots} />

        {/* 🚀 COMPREHENSIVE OPEN GRAPH TAGS - SOCIAL MEDIA OPTIMIZATION */}
        
        {/* Essential Open Graph Tags */}
        <meta property="og:title" content={metadata.openGraph.title} />
        <meta property="og:description" content={metadata.openGraph.description} />
        <meta property="og:type" content={metadata.openGraph.type} />
        <meta property="og:url" content={metadata.openGraph.url} />
        <meta property="og:site_name" content={metadata.openGraph.siteName} />
        <meta property="og:locale" content={metadata.openGraph.locale} />
        <meta property="og:locale:alternate" content="en_GB" />
        <meta property="og:locale:alternate" content="en_AU" />
        <meta property="og:locale:alternate" content="en_CA" />
        
        {/* Primary OG Image with Enhanced Properties */}
        <meta property="og:image" content={metadata.openGraph.images[0].url} />
        <meta property="og:image:secure_url" content={metadata.openGraph.images[0].url} />
        <meta property="og:image:width" content={metadata.openGraph.images[0].width} />
        <meta property="og:image:height" content={metadata.openGraph.images[0].height} />
        <meta property="og:image:alt" content={metadata.openGraph.images[0].alt} />
        <meta property="og:image:type" content="image/png" />

        {/* Secondary OG Image with Enhanced Properties */}
        <meta property="og:image" content={metadata.openGraph.images[1].url} />
        <meta property="og:image:secure_url" content={metadata.openGraph.images[1].url} />
        <meta property="og:image:width" content={metadata.openGraph.images[1].width} />
        <meta property="og:image:height" content={metadata.openGraph.images[1].height} />
        <meta property="og:image:alt" content={metadata.openGraph.images[1].alt} />
        <meta property="og:image:type" content="image/png" />

        {/* Additional Social Platform Optimizations */}
        <meta property="og:rich_attachment" content="true" />
        <meta property="og:determiner" content="the" />
        <meta property="og:updated_time" content={new Date().toISOString()} />

        {/* Facebook Specific */}
        <meta property="fb:app_id" content={metadata.facebook.appId} />
        <meta property="article:author" content="ThinkVelocity Team" />
        <meta property="article:publisher" content="https://www.facebook.com/thinkvelocity" />
        
        {/* Product-specific Open Graph (for Chrome Extension) */}
        <meta property="product:price:amount" content="0" />
        <meta property="product:price:currency" content="USD" />
        <meta property="product:availability" content="in stock" />
        <meta property="product:condition" content="new" />
        <meta property="product:brand" content="Think Velocity" />
        <meta property="product:category" content="Browser Extensions" />
        <meta property="product:retailer_item_id" content="velocity-prompt-optimizer" />

        {/* 🐦 ENHANCED TWITTER CARD TAGS */}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:site" content={metadata.twitter.site} />
        <meta name="twitter:creator" content={metadata.twitter.creator} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />
        <meta name="twitter:image" content={metadata.twitter.images[0].url} />
        <meta name="twitter:image:alt" content={metadata.twitter.images[0].alt} />
        <meta name="twitter:image:width" content="1200" />
        <meta name="twitter:image:height" content="630" />
        
        {/* Twitter App Integration */}
        <meta name="twitter:app:name:iphone" content="Velocity Prompt Optimizer" />
        <meta name="twitter:app:name:googleplay" content="Velocity Prompt Optimizer" />
        <meta name="twitter:app:url:iphone" content="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa" />
        <meta name="twitter:app:url:googleplay" content="https://chromewebstore.google.com/detail/velocity-the-prompt-co-pi/ggiecgdncaiedmdnbmgjhpfniflebfpa" />
        <meta name="twitter:domain" content="thinkvelocity.in" />

        {/* 💼 LINKEDIN OPTIMIZATION */}
        <meta property="og:see_also" content="https://www.linkedin.com/company/totem-interactive/" />
        
        {/* 📱 MOBILE APP DEEP LINKING */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Velocity" />
        
        {/* 🎨 THEME AND BRANDING */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-navbutton-color" content="#6366f1" />
        
        {/* 🔗 ADDITIONAL SOCIAL PLATFORMS */}
        
        {/* WhatsApp Optimization */}
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:secure_url" content={metadata.openGraph.images[0].url} />
        
        {/* Telegram Optimization */}
        <meta name="telegram:channel" content="@thinkvelocity" />
        
        {/* Discord Rich Embed */}
        <meta name="theme-color" content="#6366f1" />
        <meta property="og:video" content="https://thinkvelocity.in/next-assets/velocity-demo.mp4" />
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        
        {/* Pinterest Rich Pins */}
        <meta name="pinterest-rich-pin" content="true" />
        <meta property="og:type" content="website" />
        
        {/* Slack Unfurling */}
        <meta property="og:description" content={metadata.description} />
        
        {/* Google+ (legacy but some platforms still use) */}
        <meta itemProp="name" content={metadata.title} />
        <meta itemProp="description" content={metadata.description} />
        <meta itemProp="image" content={metadata.openGraph.images[0].url} />
        
        {/* Favicon and Icons - Optimized for Google Search */}
        <link rel="icon" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <link rel="mask-icon" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" color="#6366f1" />
        <link rel="manifest" href="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        
        {/* Additional meta for better search engine recognition */}
        <meta name="msapplication-TileImage" content="https://thinkvelocity.in/next-assets/VEL_LOGO2.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Direct Meta Pixel script in head for maximum reliability */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Check if Meta Pixel is already initialized
              if (window.fbq) {
                // Already initialized, do nothing
              } else if (window._metaPixelInitialized) {
                // Flag is set but fbq is not available yet, do nothing
              } else {
                // Set the initialization flag
                window._metaPixelInitialized = true;

                // Initialize Meta Pixel
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '1003634615146809');
                fbq('track', 'PageView');
              }
            `,
          }}
        />

        <link rel="canonical" href={metadata.alternates.canonical} />

        {/* Facebook Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1003634615146809');
              fbq('track', 'PageView');
            `
          }}
        />
      </head>
      <body className="bg-primary overflow-y-auto">
        {/* Google Tag Manager noscript iframe (for users with JavaScript disabled) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WHQ2J4J7"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>

        {/* Meta Pixel noscript tag (for users with JavaScript disabled) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            alt=""
            src="https://www.facebook.com/tr?id=1003634615146809&ev=PageView&noscript=1"
          />
        </noscript>

        <PageTracker />
        <MetaPixelScript />
        <MetaPixelFallback />
        <MixpanelProvider>
          <AnalyticsLayout>
            {children}
          </AnalyticsLayout>
        </MixpanelProvider>
      </body>

      {/* Add Google Tag Manager - proper Next.js implementation */}
      <GoogleTagManager gtmId="GTM-WHQ2J4J7" />
    </html>
  );
}