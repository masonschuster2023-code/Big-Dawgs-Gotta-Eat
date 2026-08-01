import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Compressed food photos (base64-encoded) can exceed the 1MB default.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
