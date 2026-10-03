import { getIndex } from "@/lib/data";
import { count } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Contributable: find a project that answers newcomers";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OpenGraphImage() {
  const index = await getIndex();
  return ogCard({
    eyebrow: "contributable.vercel.app",
    title: "Find a project that answers newcomers.",
    stats: [
      { value: count(index.rows.length), label: "repositories measured" },
      { value: count(GSOC_ORGS.length), label: "GSoC organisations" },
    ],
    footer:
      "Reply times and merge rates for outside contributors, from public GitHub data",
  });
}
