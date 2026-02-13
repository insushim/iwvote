import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'english-class-e059f.firebasestorage.app' },
    ],
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
