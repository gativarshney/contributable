import { getRepoDetail } from "@/lib/data";
import { atom } from "@/lib/feed/atom";

/** Atom feed of one repository's available starter issues. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await params;
  const detail = await getRepoDetail(owner, name);
  if (!detail) return new Response("Not indexed", { status: 404 });
  const id = `${detail.owner}/${detail.name}`;
  return atom({
    title: `${id}: available starter issues`,
    path: `/feed/repo/${id}`,
    updated: detail.updatedAt,
    entries: detail.metrics.starter.issues
      .filter((issue) => issue.state === "available")
      .slice(0, 50)
      .map((issue) => ({
        id: `https://github.com/${id}/issues/${issue.n}`,
        title: issue.title,
        url: `https://github.com/${id}/issues/${issue.n}`,
        updated: issue.updatedAt,
        summary: `Available ${issue.label === "beginner" ? "beginner" : "help wanted"} issue in ${id}.`,
      })),
  });
}
