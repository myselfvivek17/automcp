/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Monaco Editor support
    config.module.rules.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    });
    
    return config;
  },
  
  // Image optimization
  images: {
    domains: [],
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

// Made with Bob
