/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  webpack: (config) => {
    config.module.rules.push({ test: /\.ttf$/, type: 'asset/resource' });
    config.cache = false;
    return config;
  },

  images: { domains: [] },
};

module.exports = nextConfig;
