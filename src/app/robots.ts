import type { MetadataRoute } from "next";

const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
const base = URL.canParse(raw)
  ? raw.replace(/\/+$/, "")
  : "https://contributable.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    // Live reports are generated on demand; crawlers should not spend API quota on them.
    rules: { userAgent: "*", allow: "/", disallow: ["/report/", "/api/analyze"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
