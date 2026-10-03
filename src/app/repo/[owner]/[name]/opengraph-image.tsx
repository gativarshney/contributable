import { getRepoDetail } from "@/lib/data";
import { date, duration, percent } from "@/lib/format";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Reply time and merge rate for outside contributors";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function RepoImage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  const detail = await getRepoDetail(owner, name);
  if (!detail) {
    return ogCard({
      eyebrow: "Repository report",
      title: `${owner}/${name}`,
      stats: [],
      footer: "How this repository treats outside contributors",
    });
  }
  const { metrics } = detail;
  const short = (text: string) => (text.startsWith("Not enough") ? "n/a" : text);
  return ogCard({
    eyebrow: "For outside contributors",
    title: `${detail.owner}/${detail.name}`,
    stats: [
      {
        value: short(duration(metrics.pullFirstResponse.medianHours)),
        label: "first reply (median)",
      },
      {
        value: short(percent(metrics.outsidePulls.cohort.mergeRate)),
        label: "outside PRs merged",
      },
      {
        value: String(metrics.starter.counts.available),
        label: "starter issues available",
      },
    ],
    footer: `${metrics.pullFirstResponse.n} outside pull requests measured. Updated ${date(detail.updatedAt)}.`,
  });
}
