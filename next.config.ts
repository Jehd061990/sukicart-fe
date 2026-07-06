import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    ...(isCapacitorBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.store-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ever.ph",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
