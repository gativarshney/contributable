import type { MetadataRoute } from "next";
import { getIndex } from "@/lib/data";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const revalidate = 3600;

const STATIC = [
  "",
  "/explore",
  "/gsoc",
  "/issues",
  "/match",
  "/check",
  "/compare",
  "/guide",
  "/methodology",
  "/status",
  "/about",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getIndex();
  return [
    ...STATIC.map((path) => ({ url: path || "/" })),
    ...GSOC_ORGS.map((org) => ({ url: `/gsoc/${org.slug}` })),
    ...index.rows.map((row) => ({ url: `/repo/${row.id}`, lastModified: row.updatedAt })),
  ].map((entry) => ({ ...entry, url: absolute(entry.url) }));
}

function absolute(path: string): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const base = URL.canParse(raw)
    ? raw.replace(/\/+$/, "")
    : "https://contributable.vercel.app";
  return `${base}${path === "/" ? "" : path}` || base;
}
