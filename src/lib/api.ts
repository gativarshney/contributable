/** Shared headers for the public, read-only API: open to any origin, cached at the edge. */
export const API_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, s-maxage=900, stale-while-revalidate=86400",
};

export const ATTRIBUTION = {
  source: "https://contributable.vercel.app",
  licence: "CC BY 4.0",
  methodology: "https://contributable.vercel.app/methodology",
};
