import type { Metadata } from "next";
import Link from "next/link";
import { GsocMark } from "@/components/data/GsocMark";
import { GsocTimeline } from "@/components/data/GsocTimeline";
import { OrgLogo } from "@/components/data/OrgLogo";
import { FilterForm } from "@/components/explore/FilterForm";
import { ScrollToList } from "@/components/explore/ScrollToList";
import {
  InfoTip,
  MERGED_INFO,
  REPLY_7D_INFO,
  STARTER_INFO,
} from "@/components/site/InfoTip";
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

const PAGE_SIZE = 10;

/** A slow, endless row of the organisations' logos. Decorative: the list below names them. */
function LogoWall({
  orgs,
}: {
  orgs: { slug: string; name: string; logo: string | null }[];
}) {
  const logos = orgs.filter((o) => o.logo).slice(0, 36);
  if (logos.length < 12) return null;
  return (
    <div className="logo-wall mt-10" aria-hidden="true">
      <div className="logo-wall-track">
        {[...logos, ...logos].map((org, i) => (
          <OrgLogo
            key={`${org.slug}-${i}`}
            src={org.logo}
            name={org.name}
            size={48}
            eager
          />
        ))}
      </div>
    </div>
  );
}
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

function matches(
  stats: OrgStats,
  q: string,
  year: number | null,
  minYears: number,
  category: string,
) {
  if (year && !stats.org.years.includes(year)) return false;
  if (stats.org.years.length < minYears) return false;
  if (category && !stats.org.categories.includes(category)) return false;
  if (!q) return true;
  const haystack = [
    stats.org.name,
    stats.org.tagline ?? "",
    ...stats.org.categories,
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
  const category = one(params.category);
  const activeFilters = [category, year, minYears > 1, sort !== "reply"].filter(
    Boolean,
  ).length;

  const index = await getIndex();
  const all = allOrgStats(index.rows);
  const measurable = all.filter((s) => !s.org.unmappable);
  const categories = [...new Set(all.flatMap((s) => s.org.categories))].sort();
  const ranked = rankOrgs(
    measurable.filter((s) => matches(s, q, year, minYears, category)),
    sort,
  );
  const pages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(one(params.page)) || 1));
  const shown = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const upNext = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const pageHref = (target: number) => {
    const out = new URLSearchParams();
    if (q) out.set("q", q);
    if (year) out.set("year", String(year));
    if (category) out.set("category", category);
    if (minYears > 1) out.set("years", String(minYears));
    if (sort !== "reply") out.set("sort", sort);
    if (target > 1) out.set("page", String(target));
    const text = out.toString();
    // Page links land on the list itself, not the top of the page.
    return `/gsoc${text ? `?${text}` : ""}#organisations`;
  };
  const withData = measurable.filter((s) => s.repos.length > 0).length;
  // Headline figures across every measured GSoC repository, pooled by sample size.
  const gsocRows = index.rows.filter((r) => r.gsoc && r.within7d !== null);
  const replySample = gsocRows.reduce((sum, r) => sum + r.replyN, 0);
  const answered7d = replySample
    ? gsocRows.reduce((sum, r) => sum + r.within7d! * r.replyN, 0) / replySample
    : null;
  const freeIssues = index.rows
    .filter((r) => r.gsoc)
    .reduce((sum, r) => sum + r.available, 0);
  // Rank positions, counted only for organisations with enough pull requests.
  const positions = new Map<string, number>();
  if (sort === "reply") {
    for (const stats of ranked) {
      if (isRanked(stats)) positions.set(stats.org.slug, positions.size + 1);
    }
  }

  return (
    <div className="page-glow shell py-10 md:py-14">
      <header className="max-w-3xl">
        <div className="flex items-center gap-3">
          <GsocMark size={44} />
          <p className="eyebrow">Google Summer of Code (GSoC)</p>
        </div>
        <h1 className="display mt-5 text-[clamp(2rem,5vw,3.25rem)]">
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

      {index.rows.length > 0 ? (
        <dl className="border-hair mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border md:grid-cols-4">
          {(
            [
              [count(all.length), "organisations", "in GSoC 2024 to 2026"],
              [count(withData), "measured", "with repositories on GitHub"],
              [
                percent(answered7d),
                "answered in 7 days",
                `of ${count(replySample)} outside PRs, all organisations`,
              ],
              [count(freeIssues), "free first issues", "unclaimed right now"],
            ] as const
          ).map(([value, label, note], i) => (
            <div
              key={label}
              className={`border-hair p-5 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}
            >
              <dt className="text-ink-3 text-xs">{label}</dt>
              <dd
                className={`num mt-1.5 text-3xl leading-none font-medium tracking-tight ${i >= 2 ? "text-accent" : ""}`}
              >
                {value}
              </dd>
              <dd className="text-ink-3 mt-2 text-[11px]">{note}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <LogoWall orgs={all.map((s) => s.org)} />

      <section aria-labelledby="what-is-gsoc" className="mt-10">
        <h2 id="what-is-gsoc" className="font-display text-xl">
          New to it? What Google Summer of Code is
        </h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            [
              "A paid summer of open source",
              "Each year Google funds new contributors to spend about 12 weeks building something for an open source project.",
            ],
            [
              "With a mentor",
              "You work with a mentor from the organisation you applied to. You do not need to be a student, only new to open source and 18 or older.",
            ],
            [
              "You apply to an organisation",
              "You write a proposal to one of the organisations below. That is why it matters which of them reply to newcomers.",
            ],
          ].map(([title, text], i) => (
            <li key={title} className="card p-5">
              <span className="text-accent num text-sm">{i + 1}</span>
              <h3 className="mt-2 font-medium">{title}</h3>
              <p className="text-ink-2 mt-1.5 text-sm">{text}</p>
            </li>
          ))}
        </ul>
        <p className="text-ink-3 mt-3 text-xs">
          Details and dates are on the{" "}
          <a
            href="https://summerofcode.withgoogle.com/"
            className="link"
            target="_blank"
            rel="noreferrer"
          >
            official Google Summer of Code site
          </a>
          .
        </p>
      </section>

      <GsocTimeline />

      <FilterForm
        action="/gsoc"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]"
      >
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">
            Organisation or technology
          </span>
          <input
            type="search"
            name="q"
            id="gsoc-search"
            defaultValue={q}
            placeholder="Linux Foundation, python, rust"
            className="field"
            autoComplete="off"
          />
        </label>
        {/* On a phone the other filters fold away behind one button. */}
        <input
          type="checkbox"
          id="gsoc-more"
          data-ui
          defaultChecked={activeFilters > 0}
          className="peer sr-only"
        />
        <label
          htmlFor="gsoc-more"
          className="btn btn-ghost w-full cursor-pointer peer-focus-visible:outline-2 sm:hidden"
        >
          More filters
          {activeFilters > 0 ? (
            <span className="num text-accent">{activeFilters}</span>
          ) : null}
        </label>
        <div className="hidden gap-3 peer-checked:grid sm:contents">
          <label className="block">
            <span className="text-ink-2 mb-1.5 block text-xs">Category</span>
            <select name="category" defaultValue={category} className="field">
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
        </div>
      </FilterForm>

      <ScrollToList id="organisations" page={page} />
      <p id="organisations" className="mt-6 text-sm" aria-live="polite">
        <span className="num font-medium">{ranked.length}</span>{" "}
        <span className="text-ink-2">
          {ranked.length === 1 ? "organisation" : "organisations"} measured on GitHub
        </span>
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
                <OrgLogo src={stats.org.logo} name={stats.org.name} />
                <div className="min-w-0 flex-1 basis-40 sm:basis-60">
                  <h2 className="text-base font-medium">
                    <Link
                      href={`/gsoc/${stats.org.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {stats.org.name}
                    </Link>
                  </h2>
                  {stats.org.tagline ? (
                    <p className="text-ink-2 mt-0.5 line-clamp-1 text-sm">
                      {stats.org.tagline}
                    </p>
                  ) : null}
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
                <dl className="grid w-full shrink-0 grid-cols-3 gap-x-4 text-right sm:w-auto sm:gap-x-6">
                  <div>
                    <dt className="text-ink-3 flex items-center justify-end gap-1 text-xs sm:whitespace-nowrap">
                      Reply in 7 days
                      <InfoTip text={REPLY_7D_INFO} align="right" />
                    </dt>
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
                    <dt className="text-ink-3 flex items-center justify-end gap-1 text-xs sm:whitespace-nowrap">
                      Merged
                      <InfoTip text={MERGED_INFO} align="right" />
                    </dt>
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
                    <dt className="text-ink-3 flex items-center justify-end gap-1 text-xs sm:whitespace-nowrap">
                      Free issues
                      <InfoTip text={STARTER_INFO} align="right" />
                    </dt>
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

      {upNext.length > 0 ? (
        <Link
          href={pageHref(page + 1)}
          className="card door group mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 p-5 md:p-6"
        >
          <span className="flex shrink-0 -space-x-3" aria-hidden="true">
            {upNext.slice(0, 5).map((s) => (
              <span key={s.org.slug} className="ring-bg-2 rounded-xl ring-4">
                <OrgLogo src={s.org.logo} name={s.org.name} size={44} />
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1 basis-56">
            <span className="text-accent block text-xs">
              Next {upNext.length} organisations
            </span>
            <span className="mt-1 block font-medium">
              {upNext
                .slice(0, 3)
                .map((s) => s.org.name)
                .join(", ")}
              {upNext.length > 3 ? (
                <span className="text-ink-2 font-normal">
                  {" "}
                  and {upNext.length - 3} more
                </span>
              ) : null}
            </span>
          </span>
          <span className="border-hair-strong group-hover:bg-accent group-hover:text-accent-ink group-hover:border-accent grid size-11 shrink-0 place-items-center rounded-full border text-lg transition-colors">
            →
          </span>
        </Link>
      ) : null}

      {pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            {page > 1 ? (
              <li className="mr-1.5">
                <Link
                  href={pageHref(page - 1)}
                  rel="prev"
                  className="border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3 inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 transition-colors"
                >
                  <span aria-hidden="true">←</span> Prev
                </Link>
              </li>
            ) : null}
            {pageNumbers.map((n, i) => (
              <li key={n} className="flex items-center gap-1.5">
                {i > 0 && n - pageNumbers[i - 1] > 1 ? (
                  <span className="text-ink-3 px-1" aria-hidden="true">
                    …
                  </span>
                ) : null}
                <Link
                  href={pageHref(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`num grid size-9 place-items-center rounded-full border transition-colors ${
                    n === page
                      ? "border-accent bg-accent text-accent-ink font-medium"
                      : "border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3"
                  }`}
                >
                  {n}
                </Link>
              </li>
            ))}
          </ol>
          <a
            href="#gsoc-search"
            className="text-ink-2 hover:text-ink inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Looking for one? Search by organisation or technology
          </a>
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
