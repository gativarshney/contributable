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
  async headers() {
    // These pages read the address (a repository, an organisation or filters), so
    // Next.js renders them on every request and marks them uncacheable. Their output
    // depends only on the address and the data, which is itself cached for 15 minutes,
    // so Vercel's CDN may keep each address for the same time. Only full page loads
    // are cached; in-app navigations (the "rsc" requests) are left alone.
    const cdn = [{ key: "Vercel-CDN-Cache-Control", value: "max-age=900" }];
    const pageLoad = [{ type: "header" as const, key: "rsc" }];
    return [
      "/repo/:owner/:name",
      "/gsoc",
      "/gsoc/:slug",
      "/explore",
      "/issues",
      "/compare",
      "/match",
    ].map((source) => ({ source, missing: pageLoad, headers: cdn }));
  },
};

export default nextConfig;
