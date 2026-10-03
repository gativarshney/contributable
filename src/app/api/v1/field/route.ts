import { getIndex } from "@/lib/data";

export const revalidate = 900;

/**
 * The points of the home page field: every repository with both a reply time and a
 * merge rate, as [id, median reply hours, merge rate, share answered in 48 h, terms].
 */
export async function GET() {
  const index = await getIndex();
  const points = index.rows
    .filter((r) => r.replyHours !== null && r.mergeRate !== null)
    .map((r) => [
      r.id,
      r.replyHours,
      r.mergeRate,
      r.within48h,
      [...r.lang, ...r.fw, ...r.topics].join(" ").toLowerCase(),
    ]);
  return Response.json(
    { generatedAt: index.generatedAt, total: index.rows.length, points },
    {
      headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=86400" },
    },
  );
}
