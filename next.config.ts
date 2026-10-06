import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" bundles a minimal server into .next/standalone, which is what
  // makes self-hosting (Docker, or plain node on a VPS) small and dependency
  // free. Vercel ignores it harmlessly.
  output: "standalone",
  /**
   * Events and Team Builder are deferred, so their routes send people back to
   * search rather than 404ing or showing a half-connected feature.
   *
   * Done here rather than by deleting the pages because the event model runs
   * eighteen references deep through search and the match score. Bringing the
   * feature back is deleting this block; deleting the pages would be a far
   * larger change to undo. Temporary, hence 307 rather than a permanent
   * redirect that browsers would cache long after the feature returns.
   */
  async redirects() {
    return [
      { source: "/events", destination: "/search", permanent: false },
      { source: "/events/:path*", destination: "/search", permanent: false },
      { source: "/team-builder", destination: "/search", permanent: false },
    ];
  },
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
