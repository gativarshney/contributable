import type { Metadata } from "next";
import Link from "next/link";
import { FilterForm } from "@/components/explore/FilterForm";
import { getIndex } from "@/lib/data";
import { count, date, percent } from "@/lib/format";
import {
  allOrgStats,
  GSOC_YEARS,
  isRanked,
  RANK_MIN_SAMPLE,
  ORG_SORTS,
  rankOrgs,
  type OrgSort,
  type OrgStats,
} from "@/lib/gsoc/orgs";

export const metadata: Metadata = {
  title: "GSoC organisations ranked by how they treat newcomers",
  description:
    "Google Summer of Code organisations from 2024 to 2026, ranked by how often they answer outside pull requests within 7 days and how often they merge them.",
  alternates: { canonical: "/gsoc" },
};

const PAGE_SIZE = 30;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

function matches(stats: OrgStats, q: string, year: number | null, minYears: number) {
  if (year && !stats.org.years.includes(year)) return false;
  if (stats.org.years.length < minYears) return false;
  if (!q) return true;
  const haystack = [
    stats.org.name,
    ...stats.org.tech,
    ...stats.org.topics,
    ...stats.repos.flatMap((r) => [...r.lang, ...r.fw]),
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export default async function GsocPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const q = one(params.q).slice(0, 60);
  const year = Number(one(params.year)) || null;
  const minYears = Math.min(3, Math.max(1, Number(one(params.years)) || 1));
  const sort = (one(params.sort) in ORG_SORTS ? one(params.sort) : "reply") as OrgSort;

  const index = await getIndex();
  const all = allOrgStats(index.rows);
  const measurable = all.filter((s) => !s.org.unmappable);
  const ranked = rankOrgs(
    measurable.filter((s) => matches(s, q, year, minYears)),
    sort,
  );
  const pages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(one(params.page)) || 1));
  const shown = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (target: number) => {
    const out = new URLSearchParams();
    if (q) out.set("q", q);
    if (year) out.set("year", String(year));
    if (minYears > 1) out.set("years", String(minYears));
    if (sort !== "reply") out.set("sort", sort);
    if (target > 1) out.set("page", String(target));
    const text = out.toString();
    return `/gsoc${text ? `?${text}` : ""}`;
  };
  const withData = measurable.filter((s) => s.repos.length > 0).length;
  // Rank positions, counted only for organisations with enough pull requests.
  const positions = new Map<string, number>();
  if (sort === "reply") {
    for (const stats of ranked) {
      if (isRanked(stats)) positions.set(stats.org.slug, positions.size + 1);
    }
  }

  return (
    <div className="shell py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Google Summer of Code</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
          Which organisations <em>answer newcomers?</em>
        </h1>
        <p className="text-ink-2 mt-4">
          {count(all.length)} organisations took part between {GSOC_YEARS.at(-1)} and{" "}
          {GSOC_YEARS[0]}. {count(withData)} have repositories measured so far
          {index.rows.length > 0 ? `, last updated ${date(index.generatedAt)}` : ""}.
        </p>
        <p className="border-hair-strong text-ink-2 mt-5 border-l-2 pl-4 text-sm">
          <strong className="text-ink font-medium">The ranking rule.</strong> Share of
          pull requests from outside the core team that got a reply from a person within 7
          days, across all of the organisation&apos;s measured repositories. Ties go to
          the higher outside merge rate. An organisation needs at least {RANK_MIN_SAMPLE}{" "}
          outside pull requests to take a place; smaller ones follow, unranked.
        </p>
      </header>

      <FilterForm
        action="/gsoc"
        className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Technology or name</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="python, rust, machine learning"
            className="field"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Took part in</span>
          <select name="year" defaultValue={year ? String(year) : ""} className="field">
            <option value="">Any year</option>
            {GSOC_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Years participated</span>
          <select name="years" defaultValue={String(minYears)} className="field">
            <option value="1">1 or more</option>
            <option value="2">2 or more</option>
            <option value="3">All 3</option>
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Sort by</span>
          <select name="sort" defaultValue={sort} className="field">
            {Object.entries(ORG_SORTS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </FilterForm>

      <p className="mt-6 text-sm" aria-live="polite">
        <span className="num font-medium">{ranked.length}</span>{" "}
        <span className="text-ink-2">organisations</span>
      </p>

      <ol className="mt-4 space-y-3">
        {shown.map((stats) => {
          const position = positions.get(stats.org.slug);
          const rankable = position !== undefined;
          return (
            <li key={stats.org.slug} className="card relative p-5">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
                <span
                  className="num text-ink-3 w-8 shrink-0 pt-0.5 text-lg"
                  aria-label={rankable ? `Rank ${position}` : "Not ranked"}
                >
                  {rankable ? position : ""}
                </span>
                <div className="min-w-0 flex-1 basis-60">
                  <h2 className="text-base font-medium">
                    <Link
                      href={`/gsoc/${stats.org.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {stats.org.name}
                    </Link>
                  </h2>
                  <p className="text-ink-3 num mt-1 text-xs">
                    GSoC {stats.org.years.join(", ")} · {stats.repos.length}{" "}
                    {stats.repos.length === 1 ? "repository" : "repositories"} measured
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {stats.org.tech.slice(0, 5).map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </p>
                </div>
                <dl className="grid shrink-0 grid-cols-3 gap-x-6 text-right">
                  <div>
                    <dt className="text-ink-3 text-xs">Reply in 7 days</dt>
                    <dd className="num text-xl font-medium">
                      {stats.within7d === null ? (
                        <span className="text-ink-3 text-sm font-normal">n/a</span>
                      ) : (
                        percent(stats.within7d)
                      )}
                    </dd>
                    <dd className="text-ink-3 num text-[11px]">{stats.replyN} PRs</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3 text-xs">Merged</dt>
                    <dd className="num text-xl font-medium">
                      {stats.mergeRate === null ? (
                        <span className="text-ink-3 text-sm font-normal">n/a</span>
                      ) : (
                        percent(stats.mergeRate)
                      )}
                    </dd>
                    <dd className="text-ink-3 num text-[11px]">
                      {stats.decided} decided
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-3 text-xs">Starter issues</dt>
                    <dd className="num text-xl font-medium">{stats.available}</dd>
                    <dd className="text-ink-3 text-[11px]">available</dd>
                  </div>
                </dl>
              </div>
              {stats.start ? (
                <p className="text-ink-2 mt-3 pl-14 text-sm">
                  Start with{" "}
                  <Link
                    href={`/repo/${stats.start.id}`}
                    className="link text-ink relative z-10"
                  >
                    {stats.start.id}
                  </Link>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-ghost">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-2 num">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="btn btn-ghost">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      {ranked.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-medium">No organisation matches</p>
          <p className="text-ink-2 mt-2 text-sm">
            Try a broader technology, or{" "}
            <Link href="/gsoc" className="link">
              clear the filters
            </Link>
            .
          </p>
        </div>
      ) : null}

      <section className="border-hair mt-14 border-t pt-10">
        <h2 className="font-display text-2xl">Not measured</h2>
        <p className="text-ink-2 mt-2 max-w-2xl text-sm">
          {all.length - measurable.length} organisations cannot be measured on GitHub.
          They host their code elsewhere, or they are umbrella organisations whose
          projects change every year. They are listed so the ranking does not pretend they
          do not exist.
        </p>
        <ul className="text-ink-2 mt-4 columns-1 gap-8 text-sm sm:columns-2 lg:columns-3">
          {all
            .filter((s) => s.org.unmappable)
            .map((s) => (
              <li key={s.org.slug} className="mb-1.5 break-inside-avoid">
                {s.org.name}
              </li>
            ))}
        </ul>
        <p className="text-ink-3 mt-8 text-xs">
          Dates for the next round are published by Google on the{" "}
          <a
            href="https://developers.google.com/open-source/gsoc/timeline"
            className="link"
            target="_blank"
            rel="noreferrer"
          >
            official timeline
          </a>
          . Contributable is independent and not affiliated with Google.
        </p>
      </section>
    </div>
  );
}
