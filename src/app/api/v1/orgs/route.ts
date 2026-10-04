import { API_HEADERS } from "@/lib/api";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const dynamic = "force-static";

/**
 * GET /api/v1/orgs: every GSoC organisation as [name, slug]. The search box loads this
 * when it opens, so the list is not sent with every page.
 */
export function GET() {
  return Response.json(
    GSOC_ORGS.map((org) => [org.name, org.slug]),
    { headers: API_HEADERS },
  );
}
