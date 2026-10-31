import type { MetadataRoute } from "next";

const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
const base = URL.canParse(raw)
  ? raw.replace(/\/+$/, "")
  : "https://contributable.vercel.app";

// Live reports are generated on demand; crawlers should not spend API quota on them.
const NEVER = ["/report/", "/api/analyze"];

// Filters and searches make endless addresses for the same few pages, each one rendered
// on request. The pages themselves stay open; their canonical address has no query.
const FILTERS = ["/explore?", "/issues?", "/compare?", "/match?"];

// Bulk crawlers that collect training data or SEO metrics. They may read the main pages
// but not walk the 1,800 repository and organisation pages, which are rendered per visit.
const BULK = [
  "GPTBot",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "cohere-ai",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "DataForSeoBot",
  "BLEXBot",
  "Barkrowler",
];

// Link previews (LinkedIn, X, Slack...) read one shared address and honour robots.txt,
// so a shared filtered view must stay readable to them.
const PREVIEWS = [
  "LinkedInBot",
  "Twitterbot",
  "facebookexternalhit",
  "Slackbot",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...NEVER, ...FILTERS] },
      { userAgent: PREVIEWS, allow: "/", disallow: NEVER },
      {
        userAgent: BULK,
        allow: "/",
        disallow: [...NEVER, ...FILTERS, "/repo/", "/gsoc/", "/feed/", "/badge/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
