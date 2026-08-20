import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 500,
        aggregateTimeout: 100,
      };
    }

    return config;
  },
};

export default nextConfig;