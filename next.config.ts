import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Titles and descriptions are sent in the page head for every visitor and crawler,
  // rather than streamed in later, so link previews and audits always find them.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
