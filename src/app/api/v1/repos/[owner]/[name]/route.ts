import { API_HEADERS, ATTRIBUTION } from "@/lib/api";
import { getRepoDetail } from "@/lib/data";

/** GET /api/v1/repos/{owner}/{name}: every figure shown on the repo page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await params;
  const detail = await getRepoDetail(owner, name);
  if (!detail) {
    return Response.json(
      { error: "not_indexed", message: "This repository is not in the index." },
      { status: 404, headers: API_HEADERS },
    );
  }
  return Response.json({ ...ATTRIBUTION, ...detail }, { headers: API_HEADERS });
}
