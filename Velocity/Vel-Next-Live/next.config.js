/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  distDir: ".next",
  output: "export", // Static export
  // Configure images
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thinkvelocity.in",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.producthunt.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "toteminteractive.in",
        pathname: "/**",
      },
    ],
  },
  // Add rewrites for client-side routing
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
  // Add trailing slashes
  trailingSlash: true,
  // Headers are not supported with "output: export"
  // If you need headers, you'll need to configure them in your hosting platform
  // or remove "output: export" and use a server-based deployment
  //
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*', // Apply to all routes
  //       headers: [
  //         { key: 'Access-Control-Allow-Origin', value: '*' }, // Allow all origins temporarily
  //         { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
  //         { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Request-Id' },
  //       ],
  //     },
  //   ];
  // },
  webpack: (config) => {
    // Handle webm files
    config.module.rules.push({
      test: /\.webm$/,
      use: "file-loader",
    });

    // Handle image files from src/assets
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[hash:8][ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;
