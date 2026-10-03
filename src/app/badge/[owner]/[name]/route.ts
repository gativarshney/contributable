import { getRepoDetail } from "@/lib/data";
import { duration, percent } from "@/lib/format";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rough text width for the 11px badge font: wide enough that nothing is clipped. */
const widthOf = (text: string) => Math.round(text.length * 6.4) + 14;

function badge(label: string, value: string, colour: string): string {
  const left = widthOf(label);
  const right = widthOf(value);
  const total = left + right;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escape(label)}: ${escape(value)}">
<title>${escape(label)}: ${escape(value)}</title>
<clipPath id="r"><rect width="${total}" height="20" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${left}" height="20" fill="#2b3036"/><rect x="${left}" width="${right}" height="20" fill="${colour}"/></g>
<g fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${left / 2}" y="14">${escape(label)}</text><text x="${left + right / 2}" y="14">${escape(value)}</text>
</g></svg>`;
}

/**
 * GET /badge/{owner}/{name}?metric=reply|merge
 * A README badge. Shows "not enough data" instead of guessing.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await params;
  const metric =
    new URL(request.url).searchParams.get("metric") === "merge" ? "merge" : "reply";
  const detail = await getRepoDetail(owner, name);
  const label = metric === "merge" ? "outside PRs merged" : "first reply";
  const figure = !detail
    ? null
    : metric === "merge"
      ? detail.metrics.outsidePulls.cohort.mergeRate
      : detail.metrics.pullFirstResponse.medianHours;
  const value = !detail
    ? "not indexed"
    : figure === null
      ? "not enough data"
      : metric === "merge"
        ? percent(figure)
        : duration(figure);
  const svg = badge(label, value, figure === null ? "#6b7280" : "#0f766e");
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
