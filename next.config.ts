import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" bundles a minimal server into .next/standalone, which is what
  // makes self-hosting (Docker, or plain node on a VPS) small and dependency
  // free. Vercel ignores it harmlessly.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default nextConfig;
