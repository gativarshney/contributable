import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Reports are generated on demand; there is no reason for crawlers to spend API quota.
    rules: { userAgent: "*", allow: "/", disallow: ["/report/", "/api/"] },
  };
}
