import { getAvailableIssues, getIndex } from "@/lib/data";
import { matchesText } from "@/lib/explore/query";
import { atom } from "@/lib/feed/atom";
import { duration, percent } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

/**
 * Atom feed of available starter issues for a saved search, or for one GSoC organisation.
 * GET /feed/issues?lang=Python&fw=django&q=docs
 * GET /feed/issues?org=kubeflow
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") ?? "";
  const fw = url.searchParams.get("fw") ?? "";
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const org = url.searchParams.get("org") ?? "";
  const orgName = GSOC_ORGS.find((o) => o.slug === org)?.name ?? org;
  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  const repos = new Map(index.rows.map((r) => [r.id, r]));
  const entries = issues
    .flatMap((issue) => {
      const repo = repos.get(issue.id);
      if (!repo || issue.label !== "beginner") return [];
      if (org && repo.gsoc !== org) return [];
      if (lang && !repo.lang.includes(lang)) return [];
      if (fw && !repo.fw.includes(fw)) return [];
      if (
        q &&
        !matchesText(repo, q) &&
        !issue.title.toLowerCase().includes(q.toLowerCase())
      )
        return [];
      return [
        {
          id: `https://github.com/${issue.id}/issues/${issue.n}`,
          title: `${issue.id}: ${issue.title}`,
          url: `https://github.com/${issue.id}/issues/${issue.n}`,
          updated: issue.updatedAt,
          summary: `First reply ${repo.replyHours === null ? "n/a" : duration(repo.replyHours)}, outside PRs merged ${repo.mergeRate === null ? "n/a" : percent(repo.mergeRate)}.`,
        },
      ];
    })
    .slice(0, 100);
  const filter = [org ? orgName : "", lang, fw, q].filter(Boolean).join(", ");
  return atom({
    title: `Available starter issues${filter ? `: ${filter}` : ""}`,
    path: `/feed/issues${url.search}`,
    updated: index.generatedAt,
    entries,
  });
}
