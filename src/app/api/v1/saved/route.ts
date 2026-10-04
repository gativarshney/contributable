import { getIndex } from "@/lib/data";
import { MAX_SAVED } from "@/lib/saved";

/**
 * GET /api/v1/saved?ids=owner/name,owner/name
 * Index rows for a list of repositories, in the order asked. Names that are not in the
 * index are left out.
 */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[\w.-]+\/[\w.-]+$/.test(id))
    .slice(0, MAX_SAVED);
  const index = await getIndex();
  const byId = new Map(index.rows.map((row) => [row.id.toLowerCase(), row]));
  return Response.json(
    { generatedAt: index.generatedAt, rows: ids.flatMap((id) => byId.get(id) ?? []) },
    { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
