import { getIndex } from "@/lib/data";
import { percent } from "@/lib/format";
import { GSOC_ORGS, orgStats } from "@/lib/gsoc/orgs";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "How this GSoC organisation treats outside contributors";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OrgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = GSOC_ORGS.find((o) => o.slug === slug);
  if (!org) {
    return ogCard({ eyebrow: "GSoC", title: "Organisation", stats: [], footer: "" });
  }
  const stats = orgStats(org, (await getIndex()).rows);
  const na = (value: number | null) => (value === null ? "n/a" : percent(value));
  return ogCard({
    eyebrow: `GSoC ${org.years.join(", ")}`,
    title: org.name,
    stats:
      stats.repos.length === 0
        ? []
        : [
            { value: na(stats.within7d), label: "replied within 7 days" },
            { value: na(stats.mergeRate), label: "outside PRs merged" },
            { value: String(stats.available), label: "starter issues available" },
          ],
    footer:
      stats.repos.length === 0
        ? "How this organisation treats outside contributors"
        : `${stats.replyN} outside pull requests across ${stats.repos.length} repositories`,
  });
}
