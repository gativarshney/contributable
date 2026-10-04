import Link from "next/link";
import { OrgLogo } from "@/components/data/OrgLogo";
import type { AvailableIssue, IndexRow } from "@/core/published";
import { duration, inTen, percent } from "@/lib/format";
import { allOrgStats, isRanked, rankOrgs } from "@/lib/gsoc/orgs";
import { famousPair } from "./Story";

/** Enough outside pull requests that a figure is not luck. */
const SOLID = 20;

function Tile({
  href,
  label,
  title,
  className = "",
  children,
}: {
  href: string;
  label: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={className}>
      <Link href={href} className="card door group flex h-full flex-col p-6 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow !text-accent">{label}</p>
          <span
            className="border-hair-strong group-hover:bg-accent group-hover:text-accent-ink group-hover:border-accent grid size-8 shrink-0 place-items-center rounded-full border text-sm transition-colors duration-200"
            aria-hidden="true"
          >
            →
          </span>
        </div>
        <h3 className="font-display mt-4 text-[1.35rem] leading-snug">{title}</h3>
        <div className="mt-6 flex flex-1 flex-col justify-end" aria-hidden="true">
          {children}
        </div>
      </Link>
    </li>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="border-hair flex items-center justify-between gap-3 border-t py-2.5 text-sm first:border-t-0">
    {children}
  </div>
);

/**
 * Everything the site does, as a grid of live miniatures: each tile is a small piece
 * of the page it opens, filled with the current data.
 */
export function Features({
  rows,
  issues,
}: {
  rows: readonly IndexRow[];
  issues: readonly AvailableIssue[];
}) {
  if (rows.length === 0) return null;

  const solid = rows.filter((r) => r.replyN >= SOLID && r.replyHours !== null);
  const fastest = [...solid]
    .filter((r) => r.mergeRate !== null)
    .sort((a, b) => a.replyHours! - b.replyHours!)
    .slice(0, 4);
  const orgs = rankOrgs(allOrgStats(rows)).filter(isRanked).slice(0, 3);
  const free = issues.filter((i) => i.label === "beginner").slice(0, 3);
  const pair = famousPair(rows);
  const example =
    solid.find((r) => r.hours !== null && r.mergeRate !== null) ?? fastest[0];
  const hours = solid.find((r) => r.hours !== null)?.hours ?? null;
  const languages = [...new Set(rows.flatMap((r) => r.lang))].length;
  // What "help me choose" would put first for a Python beginner, by its own rule.
  const pick = solid
    .filter((r) => r.lang.includes("Python") && r.within48h !== null && r.guide)
    .sort(
      (a, b) => b.within48h! - a.within48h! || (b.mergeRate ?? 0) - (a.mergeRate ?? 0),
    )[0];

  return (
    <section id="inside" className="relative scroll-mt-20 pt-6 pb-20 md:pt-10 md:pb-28">
      <div className="shell reveal">
        <p className="eyebrow">Everything here</p>
        <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
          One place to pick, <em>check and start.</em>
        </h2>

        <ul className="mt-12 grid gap-4 md:grid-cols-6">
          <Tile
            href="/explore"
            label="Explore"
            title={`Search ${rows.length.toLocaleString("en-US")} repositories by how they treat newcomers`}
            className="md:col-span-4"
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              {["Language", "Reply within 2 days", "Merged 70%+", "Has free issues"].map(
                (filter) => (
                  <span key={filter} className="tag">
                    {filter}
                  </span>
                ),
              )}
            </div>
            {fastest.map((r) => (
              <Row key={r.id}>
                <span className="min-w-0 truncate">{r.id}</span>
                <span className="num flex shrink-0 gap-4 text-xs">
                  <span className="text-accent">{duration(r.replyHours)}</span>
                  <span className="text-ink-2 w-10 text-right">
                    {percent(r.mergeRate)}
                  </span>
                </span>
              </Row>
            ))}
            <p className="text-ink-3 mt-2 text-[11px]">
              {languages} languages · first reply · outside PRs merged
            </p>
          </Tile>

          <Tile
            href="/gsoc"
            label="Google Summer of Code"
            title="GSoC organisations ranked by who answers"
            className="md:col-span-2"
          >
            {orgs.map((stats, i) => (
              <Row key={stats.org.slug}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="num text-ink-3 w-3 text-xs">{i + 1}</span>
                  <OrgLogo src={stats.org.logo} name={stats.org.name} size={28} />
                  <span className="truncate">{stats.org.name}</span>
                </span>
                <span className="num text-accent shrink-0 text-xs">
                  {percent(stats.within7d)}
                </span>
              </Row>
            ))}
            <p className="text-ink-3 mt-2 text-[11px]">replied within 7 days</p>
          </Tile>

          <Tile
            href="/issues"
            label="First issues"
            title="Issues nobody has taken yet"
            className="md:col-span-2"
          >
            {free.map((issue) => (
              <Row key={`${issue.id}#${issue.n}`}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-accent size-1.5 shrink-0 rounded-full" />
                  <span className="truncate">{issue.title}</span>
                </span>
              </Row>
            ))}
            <p className="text-ink-3 mt-2 text-[11px]">
              open · unassigned · unclaimed · no pull request
            </p>
          </Tile>

          <Tile
            href="/check"
            label="Check a repo"
            title="Paste any repository, get the verdict"
            className="md:col-span-2"
          >
            <div className="border-hair-strong bg-bg flex items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-xs">
              <span className="text-ink-3">github.com/</span>
              <span className="truncate">{example?.id ?? "owner/name"}</span>
            </div>
            {example && example.mergeRate !== null ? (
              <p className="mt-4 text-sm leading-snug">
                Outside PRs: {inTen(example.mergeRate)} merged. First reply within{" "}
                <span className="text-accent">{duration(example.replyHours)}</span>.
              </p>
            ) : null}
          </Tile>

          <Tile
            href="/match"
            label="Help me choose"
            title="Your stack in, a shortlist with reasons out"
            className="md:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {["python", "beginner", "6 h a week"].map((chip) => (
                <span
                  key={chip}
                  className="border-accent text-accent rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
                >
                  {chip}
                </span>
              ))}
            </div>
            {pick ? (
              <div className="border-hair mt-4 space-y-1.5 border-l-2 pl-3 text-xs">
                <p className="text-ink truncate">Pick 1: {pick.id}</p>
                <p className="text-ink-2">
                  Answers {percent(pick.within48h)} of outside PRs within 48 hours
                </p>
                <p className="text-ink-2">
                  {pick.available > 0
                    ? `${pick.available} free first ${pick.available === 1 ? "issue" : "issues"} now`
                    : `${inTen(pick.mergeRate ?? 0)} outside PRs merged`}
                </p>
              </div>
            ) : null}
          </Tile>

          {pair ? (
            <Tile
              href={`/compare?repos=${pair.slow.id},${pair.fast.id}`}
              label="Compare"
              title="Two to four repositories, side by side"
              className="md:col-span-3"
            >
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-5 gap-y-2 text-sm">
                <span />
                <span className="text-ink-3 text-[11px]">First reply</span>
                <span className="text-ink-3 text-[11px]">Merged</span>
                {[pair.fast, pair.slow].map((r, i) => (
                  <div key={r.id} className="contents">
                    <span className="min-w-0 truncate">{r.id}</span>
                    <span
                      className={`num text-xs ${i === 0 ? "text-accent" : "text-slow"}`}
                    >
                      {duration(r.replyHours)}
                    </span>
                    <span className="num text-ink-2 text-xs">{percent(r.mergeRate)}</span>
                  </div>
                ))}
              </div>
            </Tile>
          ) : null}

          <Tile
            href={example ? `/repo/${example.id}#hours` : "/explore"}
            label="Reply hours"
            title="When replies arrive, in your time zone"
            className={pair ? "md:col-span-3" : "md:col-span-6"}
          >
            {hours ? (
              <>
                <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">
                  {hours.map((value, h) => (
                    <span
                      key={h}
                      className="h-8 rounded-[3px]"
                      style={{
                        background:
                          value === 0
                            ? "var(--bg-3)"
                            : `color-mix(in oklch, var(--accent) ${20 + value * 9}%, var(--bg-3))`,
                      }}
                    />
                  ))}
                </div>
                <div className="text-ink-3 num mt-1.5 flex justify-between text-[11px]">
                  <span>00</span>
                  <span>06</span>
                  <span>12</span>
                  <span>18</span>
                  <span>24</span>
                </div>
              </>
            ) : null}
          </Tile>

          <Tile
            href="/start"
            label="Start here"
            title="Your first pull request in five steps"
            className="md:col-span-3"
          >
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <span key={step} className="flex flex-1 items-center last:flex-none">
                  <span
                    className={`num grid size-8 place-items-center rounded-full border text-xs ${
                      step === 1
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-hair-strong text-ink-3"
                    }`}
                  >
                    {step}
                  </span>
                  {step < 5 ? <span className="bg-hair-strong h-px flex-1" /> : null}
                </span>
              ))}
            </div>
            <p className="text-ink-3 mt-3 text-[11px]">
              pick · check · find an issue · claim it · open a small PR
            </p>
          </Tile>

          <Tile
            href="/saved"
            label="Saved, badges and feeds"
            title="Keep a shortlist, follow new issues, show your numbers"
            className="md:col-span-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {[
                ["first reply", duration(example?.replyHours ?? null)],
                ["outside PRs merged", percent(example?.mergeRate ?? null)],
              ].map(([key, value]) => (
                <span key={key} className="flex overflow-hidden rounded font-mono">
                  <span className="bg-bg-3 px-2 py-1">{key}</span>
                  <span className="bg-accent text-accent-ink px-2 py-1">{value}</span>
                </span>
              ))}
              <span className="tag">Atom feed</span>
              <span className="tag">JSON API</span>
              <span className="tag">No account</span>
            </div>
          </Tile>
        </ul>
      </div>
    </section>
  );
}
