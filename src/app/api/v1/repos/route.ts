import { API_HEADERS, ATTRIBUTION } from "@/lib/api";
import { getIndex } from "@/lib/data";
import { explore, parseQuery } from "@/lib/explore/query";

/**
 * GET /api/v1/repos
 * The index, with the same filters and sorting as the Explore page:
 * q, lang, fw, topic, program, year, reply, merge, issues, active, nocla, overlap, tz,
 * sort and page. Thirty rows per page.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const index = await getIndex();
  const result = explore(index.rows, parseQuery(params));
  return Response.json(
    {
      ...ATTRIBUTION,
      generatedAt: index.generatedAt,
      total: result.total,
      page: result.page,
      pages: result.pages,
      rows: result.rows,
    },
    { headers: API_HEADERS },
  );
}
