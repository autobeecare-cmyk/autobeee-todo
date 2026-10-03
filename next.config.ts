import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        destination: '/api/firebase-sw',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/attendance',
        destination: '/',
        permanent: false,
      },
      {
        source: '/roadmap',
        destination: '/goals',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
