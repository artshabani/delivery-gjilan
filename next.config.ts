import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "prephase0.s3.eu-north-1.amazonaws.com",
        port: "",
        pathname: "/**",   // allow all folders
      },
    ],
  },
};

export default nextConfig;
