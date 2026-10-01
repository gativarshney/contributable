import { unstable_cache } from "next/cache";
import { createGitHubClient, GitHubError } from "@/lib/github/client";
import { parseErrorMessage, parseRepoInput } from "@/lib/github/parse";
import { analyzeRepository, toReportError, type AnalysisEvent } from "@/lib/report/run";
import { createThrottle } from "@/lib/report/throttle";

export const dynamic = "force-dynamic";

// A finished report is shared by every visitor for an hour, so a popular repository
// costs GitHub requests once, not once per person.
const REPORT_TTL_SECONDS = 60 * 60;
// Each deployment keeps its own entries: a new version never reads an old report shape.
const CACHE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
// Fresh analyses one address may start. Cached reports are free and never counted.
const allowFresh = createThrottle(20, 10 * 60 * 1000);

/** Streams newline-delimited JSON events: one per completed stage, then the report. */
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("repo") ?? "";
  const parsed = parseRepoInput(input);
  if (!parsed.ok) {
    return Response.json(
      {
        error: {
          code: "invalid",
          title: "Invalid repository",
          message: parseErrorMessage(parsed.reason),
        },
      },
      { status: 400 },
    );
  }
  const { ref } = parsed;
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AnalysisEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      // On a cache miss the function below runs and reports its progress; on a hit it
      // is skipped and the stored report is returned at once. Failures are not stored.
      const load = unstable_cache(
        () => {
          // Over the limit, the browser is told to use its own GitHub allowance instead.
          if (!allowFresh(address)) throw new GitHubError("rate_limited", 429);
          return analyzeRepository(
            ref,
            createGitHubClient({ token: process.env.GITHUB_TOKEN }),
            (stage, detail) => emit({ type: "stage", stage, detail }),
          );
        },
        ["report", CACHE_VERSION, `${ref.owner}/${ref.name}`.toLowerCase()],
        { revalidate: REPORT_TTL_SECONDS },
      );

      try {
        emit({ type: "result", report: await load() });
      } catch (error) {
        emit({ type: "error", error: toReportError(error) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
