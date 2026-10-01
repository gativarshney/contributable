import { parseErrorMessage, parseRepoInput } from "@/lib/github/parse";
import { runAnalysis, type AnalysisEvent } from "@/lib/report/run";

export const dynamic = "force-dynamic";

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AnalysisEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      await runAnalysis(parsed.ref, emit);
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
