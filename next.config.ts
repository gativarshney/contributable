import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Titles and descriptions are sent in the page head for every visitor and crawler,
  // rather than streamed in later, so link previews and audits always find them.
  htmlLimitedBots: /.*/,
  images: {
    // Organisation logos come from the programme's site as 360px PNGs and are shown at
    // about 50px. Resizing them here makes each a couple of kilobytes, served from
    // Vercel's cache instead of a slow origin.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "summerofcode.withgoogle.com",
        pathname: "/media/org/**",
      },
    ],
    formats: ["image/webp"],
    // Logos rarely change; keep the resized copies for a month.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
