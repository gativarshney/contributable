import type { Metadata } from "next";
import Link from "next/link";
import { RepoCard, RepoTable } from "@/components/data/RepoList";
import { FilterClose, FilterForm, FilterToggle } from "@/components/explore/FilterForm";
import { getIndex } from "@/lib/data";
import {
  DEFAULT_TZ_MINUTES,
  explore,
  facet,
  parseQuery,
  SORTS,
  toSearch,
  type ExploreQuery,
  type Facet,
} from "@/lib/explore/query";
import { count, date } from "@/lib/format";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Search open source repositories by language, first reply time, outside merge rate and available starter issues.",
};

const REPLY_OPTIONS = [
  ["24", "Within 1 day"],
  ["48", "Within 2 days"],
  ["168", "Within 1 week"],
];
const MERGE_OPTIONS = [
  ["0.5", "At least 50%"],
  ["0.7", "At least 70%"],
  ["0.85", "At least 85%"],
];

function Select({
  name,
  label,
  value,
  options,
  any,
}: {
  name: string;
  label: string;
  value: string;
  options: (readonly [string, string])[] | string[][];
  any: string;
}) {
  return (
    <label className="block">
      <span className="text-ink-2 mb-1.5 block text-xs">{label}</span>
      <select name={name} defaultValue={value} className="field">
        <option value="">{any}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="accent-accent size-4"
      />
      {label}
    </label>
  );
}

const facetOptions = (facets: Facet[]) =>
  facets.map((f) => [f.value, `${f.value} (${f.count})`]);

function Fields({
  query,
  facets,
}: {
  query: ExploreQuery;
  facets: { lang: Facet[]; fw: Facet[]; topic: Facet[]; years: number[] };
}) {
  return (
    <div className="space-y-4">
      <Select
        name="lang"
        label="Language"
        value={query.lang ?? ""}
        options={facetOptions(facets.lang)}
        any="Any language"
      />
      <Select
        name="fw"
        label="Framework"
        value={query.fw ?? ""}
        options={facetOptions(facets.fw)}
        any="Any framework"
      />
      <Select
        name="topic"
        label="Topic"
        value={query.topic ?? ""}
        options={facetOptions(facets.topic)}
        any="Any topic"
      />
      <Select
        name="program"
        label="Programme"
        value={query.program ?? ""}
        options={[["gsoc", "Google Summer of Code"]]}
        any="Any programme"
      />
      <Select
        name="year"
        label="GSoC year"
        value={query.year ? String(query.year) : ""}
        options={facets.years.map((y) => [String(y), String(y)])}
        any="Any year"
      />
      <Select
        name="reply"
        label="First reply to outside PRs"
        value={query.reply ? String(query.reply) : ""}
        options={REPLY_OPTIONS}
        any="Any reply time"
      />
      <Select
        name="merge"
        label="Outside PRs merged"
        value={query.merge ? String(query.merge) : ""}
        options={MERGE_OPTIONS}
        any="Any merge rate"
      />
      <div className="border-hair border-t pt-2">
        <Check
          name="issues"
          label="Has available starter issues"
          checked={query.issues}
        />
        <Check name="active" label="Commits in the last 90 days" checked={query.active} />
        <Check name="nocla" label="No CLA or DCO sign-off" checked={query.noCla} />
        <Check
          name="overlap"
          label="Replies mostly during my day"
          checked={query.overlap}
        />
        <p className="text-ink-3 mt-1 text-xs">
          Your day is 08:00 to midnight, India time by default. At least half of the
          maintainers&apos; replies must fall inside it.
        </p>
      </div>
      {query.tz !== DEFAULT_TZ_MINUTES ? (
        <input type="hidden" name="tz" value={query.tz} />
      ) : null}
      <noscript>
        <button className="btn w-full">Apply filters</button>
      </noscript>
    </div>
  );
}

function activeCount(query: ExploreQuery): number {
  return [
    query.lang,
    query.fw,
    query.topic,
    query.program,
    query.year,
    query.reply,
    query.merge,
    query.issues,
    query.active,
    query.noCla,
    query.overlap,
  ].filter(Boolean).length;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseQuery(await searchParams);
  const index = await getIndex();
  const result = explore(index.rows, query);
  const facets = {
    lang: facet(index.rows, (r) => r.lang),
    fw: facet(index.rows, (r) => r.fw),
    topic: facet(index.rows, (r) => r.topics),
    years: [...new Set(index.rows.flatMap((r) => r.years))].sort((a, b) => b - a),
  };
  const filters = activeCount(query);

  const controls = (
    <>
      <input type="hidden" name="view" value={query.view} />
      <Fields query={query} facets={facets} />
    </>
  );

  return (
    <div className="shell py-10 md:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Explore</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
          Find a project that <em>answers newcomers.</em>
        </h1>
        <p className="text-ink-2 mt-4">
          {index.rows.length > 0
            ? `${count(index.rows.length)} repositories measured. Index updated ${date(index.generatedAt)}.`
            : "The index is being prepared. Repositories appear here as they are measured."}
        </p>
      </header>

      <FilterForm
        action="/explore"
        className="mt-8 grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-10"
      >
        <aside id="filters" aria-label="Filters" className="filter-panel">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h2 className="text-base font-medium">Filters</h2>
            <FilterClose />
          </div>
          {controls}
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-ink-2 mb-1.5 block text-xs">
                Search by name, language, framework or topic
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query.q}
                placeholder="python, react, compilers"
                className="field"
                autoComplete="off"
              />
            </label>
            <label className="block sm:w-64">
              <span className="text-ink-2 mb-1.5 block text-xs">Sort by</span>
              <select name="sort" defaultValue={query.sort} className="field">
                {Object.entries(SORTS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 lg:hidden">
            <FilterToggle count={filters} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" aria-live="polite">
              <span className="num font-medium">{count(result.total)}</span>{" "}
              <span className="text-ink-2">
                {result.total === 1 ? "repository" : "repositories"}
                {filters > 0 || query.q ? " match" : ""}
              </span>
              {filters > 0 || query.q ? (
                <Link href="/explore" className="link text-ink-2 ml-3 text-sm">
                  Clear all
                </Link>
              ) : null}
            </p>
            <div className="border-hair-strong flex rounded-full border p-0.5 text-sm">
              {(["cards", "table"] as const).map((view) => (
                <Link
                  key={view}
                  href={`/explore${toSearch(query, { view, page: query.page })}`}
                  aria-current={query.view === view ? "true" : undefined}
                  className={`rounded-full px-4 py-1.5 capitalize transition-colors ${
                    query.view === view ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {view}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="sr-only">Results</h2>
            {result.rows.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="font-medium">
                  {index.rows.length === 0
                    ? "Preparing the index"
                    : "No repository matches these filters"}
                </p>
                <p className="text-ink-2 mx-auto mt-2 max-w-md text-sm">
                  {index.rows.length === 0
                    ? "Repositories are measured in batches every hour. This page fills in on its own."
                    : "Loosen one filter at a time. Reply time and merge rate need at least 5 outside pull requests, so small projects drop out of those two."}
                </p>
              </div>
            ) : query.view === "table" ? (
              <RepoTable rows={result.rows} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {result.rows.map((row) => (
                  <RepoCard key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>

          {result.pages > 1 ? (
            <nav
              aria-label="Pages"
              className="mt-8 flex items-center justify-between gap-4 text-sm"
            >
              {result.page > 1 ? (
                <Link
                  href={`/explore${toSearch(query, { page: result.page - 1 })}`}
                  className="btn btn-ghost"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-ink-2 num">
                Page {result.page} of {result.pages}
              </span>
              {result.page < result.pages ? (
                <Link
                  href={`/explore${toSearch(query, { page: result.page + 1 })}`}
                  className="btn btn-ghost"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </FilterForm>
    </div>
  );
}
