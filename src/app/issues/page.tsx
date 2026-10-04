import type { Metadata } from "next";
import { Drift, DriftPill, PageMark } from "@/components/site/Drift";
import Link from "next/link";
import { FilterForm } from "@/components/explore/FilterForm";
import type { IndexRow } from "@/core/published";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { facet, matchesText } from "@/lib/explore/query";
import { count, date, firstReply, percent, replySpeed, type Speed } from "@/lib/format";

const SPEED_CLASS: Record<Speed, string> = {
  fast: "text-fast",
  ok: "text-ink",
  slow: "text-slow",
  unknown: "text-ink-3",
};

export const metadata: Metadata = {
  title: "Good first issues that are actually available",
  description:
    "Beginner issues across the index that are open, unassigned, unclaimed and have no pull request yet, each with its repository's reply time and merge rate.",
  alternates: { canonical: "/issues" },
};

const PAGE_SIZE = 40;
const PER_REPO = 3;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

function href(params: Record<string, string>, page: number) {
  const out = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== ""),
  );
  if (page > 1) out.set("page", String(page));
  const text = out.toString();
  return `/issues${text ? `?${text}` : ""}`;
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const q = one(params.q).slice(0, 60);
  const lang = one(params.lang);
  const fw = one(params.fw);
  const kind = one(params.kind) === "all" ? "all" : "beginner";
  const sort = one(params.sort) === "new" ? "new" : "reply";
  const page = Math.max(1, Number(one(params.page)) || 1);

  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  const repos = new Map<string, IndexRow>(index.rows.map((r) => [r.id, r]));

  const ordered = issues
    .flatMap((issue) => {
      const repo = repos.get(issue.id);
      return repo ? [{ issue, repo }] : [];
    })
    .filter(({ issue, repo }) => {
      if (kind === "beginner" && issue.label !== "beginner") return false;
      if (lang && !repo.lang.includes(lang)) return false;
      if (fw && !repo.fw.includes(fw)) return false;
      if (
        q &&
        !matchesText(repo, q) &&
        !issue.title.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "new") return b.issue.createdAt.localeCompare(a.issue.createdAt);
      // Fastest-replying repository first; unmeasured repositories last.
      const x = a.repo.replyHours ?? Infinity;
      const y = b.repo.replyHours ?? Infinity;
      return x - y || b.issue.updatedAt.localeCompare(a.issue.updatedAt);
    });

  // One busy repository should not fill the first page. Each repository shows its
  // three most recently updated issues; a search or the repo page reaches the rest.
  const perRepo = new Map<string, number>();
  const matched = q
    ? ordered
    : ordered.filter(({ issue }) => {
        const seen = perRepo.get(issue.id) ?? 0;
        perRepo.set(issue.id, seen + 1);
        return seen < PER_REPO;
      });
  const hidden = ordered.length - matched.length;

  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = matched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const withIssues = index.rows.filter((r) => r.available + r.helpWanted > 0);
  const state = {
    q,
    lang,
    fw,
    kind: kind === "all" ? "all" : "",
    sort: sort === "new" ? "new" : "",
  };

  return (
    <div className="page-glow shell py-10 md:py-14">
      <header className="max-w-3xl">
        <div className="flex items-center gap-3">
          <PageMark icon="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
          <p className="eyebrow">Good first issues, checked</p>
        </div>
        <h1 className="display mt-5 text-[clamp(2rem,5vw,3.25rem)]">
          Issues nobody has <em>taken yet.</em>
        </h1>
        <p className="text-ink-2 mt-4">
          Open, unassigned, no linked pull request, nobody claimed it in the last 14 days,
          and updated in the last 60 days. Sorted so the repositories that reply fastest
          come first.
        </p>
      </header>

      <div className="mt-10">
        <Drift
          seconds={110}
          items={issues
            .filter((i) => i.label === "beginner")
            .slice(0, 24)
            .map((i) => (
              <DriftPill key={`${i.id}#${i.n}`} accent>
                <span className="max-w-[22rem] truncate">{i.title}</span>
              </DriftPill>
            ))}
        />
      </div>

      <FilterForm
        action="/issues"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="block lg:col-span-2">
          <span className="text-ink-2 mb-1.5 block text-xs">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="docs, parser, tests"
            className="field"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Language</span>
          <select name="lang" defaultValue={lang} className="field">
            <option value="">Any language</option>
            {facet(withIssues, (r) => r.lang).map((f) => (
              <option key={f.value} value={f.value}>
                {f.value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Framework</span>
          <select name="fw" defaultValue={fw} className="field">
            <option value="">Any framework</option>
            {facet(withIssues, (r) => r.fw).map((f) => (
              <option key={f.value} value={f.value}>
                {f.value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Show</span>
          <select
            name="kind"
            defaultValue={kind === "all" ? "all" : ""}
            className="field"
          >
            <option value="">Beginner labels only</option>
            <option value="all">Also &quot;help wanted&quot;</option>
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Sort by</span>
          <select
            name="sort"
            defaultValue={sort === "new" ? "new" : ""}
            className="field"
          >
            <option value="">Fastest repo first</option>
            <option value="new">Newest issue</option>
          </select>
        </label>
      </FilterForm>

      <p className="mt-6 text-sm" aria-live="polite">
        <span className="num font-medium">{count(ordered.length)}</span>{" "}
        <span className="text-ink-2">
          available {ordered.length === 1 ? "issue" : "issues"}
          {index.rows.length > 0 ? `. Index updated ${date(index.generatedAt)}.` : ""}
        </span>
      </p>

      {shown.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-medium">
            {issues.length === 0 ? "Preparing the list" : "No available issue matches"}
          </p>
          <p className="text-ink-2 mx-auto mt-2 max-w-md text-sm">
            {issues.length === 0
              ? "Issues appear here as repositories are measured. This page fills in on its own."
              : "Try another language, or include issues marked help wanted."}
          </p>
        </div>
      ) : (
        <ul className="border-hair mt-4 divide-y divide-[var(--hair)] rounded-2xl border">
          {shown.map(({ issue, repo }) => (
            <li
              key={`${issue.id}#${issue.n}`}
              className="hover:bg-bg-2/60 relative flex items-start gap-4 p-4 transition-colors sm:px-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${issue.id.split("/")[0]}.png?size=80`}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="border-hair bg-bg-3 mt-0.5 size-10 shrink-0 rounded-xl border"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={`https://github.com/${issue.id}/issues/${issue.n}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium [overflow-wrap:anywhere] after:absolute after:inset-0 hover:underline"
                >
                  {issue.title}
                </a>
                <p className="text-ink-2 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link href={`/repo/${issue.id}`} className="link relative z-10">
                    {issue.id}
                  </Link>
                  <span className="num text-ink-3">#{issue.n}</span>
                  {repo.lang[0] ? <span className="tag">{repo.lang[0]}</span> : null}
                  {issue.label === "help-wanted" ? (
                    <span className="tag">help wanted</span>
                  ) : null}
                  <span className="text-ink-3 num text-xs">
                    Opened {date(issue.createdAt)}
                  </span>
                </p>
                <p className="text-ink-3 num mt-1.5 text-xs sm:hidden">
                  First reply{" "}
                  <span className={SPEED_CLASS[replySpeed(repo.replyHours)]}>
                    {repo.replyHours === null && repo.replyN < 5
                      ? "n/a"
                      : firstReply(repo.replyHours, repo.replyN)}
                  </span>
                  {" · "}Merged{" "}
                  <span className="text-ink-2">
                    {repo.mergeRate === null ? "n/a" : percent(repo.mergeRate)}
                  </span>
                </p>
              </div>
              <dl className="hidden shrink-0 grid-cols-2 gap-x-5 text-right sm:grid">
                <div>
                  <dt className="text-ink-3 text-[11px]">First reply</dt>
                  <dd
                    className={`num font-medium ${SPEED_CLASS[replySpeed(repo.replyHours)]}`}
                  >
                    {repo.replyHours === null && repo.replyN < 5
                      ? "n/a"
                      : firstReply(repo.replyHours, repo.replyN)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3 text-[11px]">Merged</dt>
                  <dd className="num font-medium">
                    {repo.mergeRate === null ? "n/a" : percent(repo.mergeRate)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <p className="text-ink-3 mt-3 text-xs">
          Showing at most {PER_REPO} issues per repository, so one project does not fill
          the page. {count(hidden)} more are on the repository pages, or search for a
          repository by name.
        </p>
      ) : null}

      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-between text-sm"
        >
          {current > 1 ? (
            <Link href={href(state, current - 1)} className="btn btn-ghost">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-2 num">
            Page {current} of {pages}
          </span>
          {current < pages ? (
            <Link href={href(state, current + 1)} className="btn btn-ghost">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
