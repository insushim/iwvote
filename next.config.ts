import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com', 'english-class-e059f.firebasestorage.app'],
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
