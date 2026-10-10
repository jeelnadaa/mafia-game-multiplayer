import './scripts/patch-exfat.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // run-next.js probes for a writable directory and sets NEXT_DIST_DIR.
  // Falls back to '.next' when launched outside of run-next.js (e.g. npx next).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
  turbopack: {},
};

export default nextConfig;
