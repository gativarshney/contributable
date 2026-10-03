import { API_HEADERS } from "@/lib/api";
import { getStatus } from "@/lib/data";

/** GET /api/v1/status: freshness and coverage of the index. */
export async function GET() {
  const status = await getStatus();
  return Response.json(
    status ?? { indexed: 0, message: "The index is being prepared." },
    { headers: API_HEADERS },
  );
}
