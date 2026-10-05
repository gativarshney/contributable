import Link from "next/link";
import { OrgLogo } from "@/components/data/OrgLogo";
import type { AvailableIssue, IndexRow } from "@/core/published";
import { compact, duration, percent } from "@/lib/format";
import { allOrgStats, GSOC_ORGS, isRanked, rankOrgs } from "@/lib/gsoc/orgs";
import { GsocMark } from "@/components/data/GsocMark";
import { LogoDrift } from "./LogoDrift";
import { famousPair } from "./Story";

/** Enough outside pull requests that a figure is not luck. */
const SOLID = 20;

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    className="size-[18px]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  explore: "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm9 15-4.5-4.5",
  gsoc: "M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0zm10 1h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4",
  issues: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  check: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zm-3 9 2 2 4-4",
  match:
    "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zm7 12 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
  compare: "M4 5h6v14H4zm10 4h6v10h-6z",
  hours: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
  start: "M5 21V4m0 0h11l-2 4 2 4H5",
  saved: "M6 4h12v16l-6-4-6 4z",
} as const;

function Tile({
  href,
  label,
  icon,
  title,
  className = "",
  children,
}: {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`min-w-0 ${className}`}>
      <Link
        href={href}
        className="card door group relative flex h-full flex-col overflow-hidden p-6 md:p-7"
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 55%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5">
            <span className="bg-accent-soft text-accent grid size-9 shrink-0 place-items-center rounded-xl">
              <Icon d={ICONS[icon]} />
            </span>
            <span className="eyebrow !text-accent">{label}</span>
          </span>
          <span
            className="border-hair-strong group-hover:bg-accent group-hover:text-accent-ink group-hover:border-accent grid size-8 shrink-0 place-items-center rounded-full border text-sm transition-colors duration-200"
            aria-hidden="true"
          >
            →
          </span>
        </div>
        <h3 className="font-display relative mt-5 text-[1.5rem] leading-tight">
          {title}
        </h3>
        <div
          className="relative mt-6 flex flex-1 flex-col justify-end"
          aria-hidden="true"
        >
          {children}
        </div>
      </Link>
    </li>
  );
}

/** One large figure with a short caption beside it. */
const Big = ({
  value,
  caption,
  tone = "text-ink",
}: {
  value: string;
  caption: string;
  tone?: string;
}) => (
  <p className="flex items-baseline gap-2.5">
    <span className={`num text-[2.6rem] leading-none font-medium tracking-tight ${tone}`}>
      {value}
    </span>
    <span className="text-ink-2 text-sm leading-tight">{caption}</span>
  </p>
);

/** A thin horizontal bar for a share between 0 and 1. */
const Bar = ({ share, tone = "bg-accent" }: { share: number; tone?: string }) => (
  <span className="bg-bg-3 block h-1.5 w-full overflow-hidden rounded-full">
    <span
      className={`block h-full rounded-full ${tone}`}
      style={{ width: `${Math.max(4, Math.round(share * 100))}%` }}
    />
  </span>
);

/** A small ring for a share between 0 and 1. */
const Ring = ({ share }: { share: number }) => {
  const r = 22;
  const length = 2 * Math.PI * r;
  return (
    <span className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${length * share} ${length}`}
        />
      </svg>
      <span className="num text-sm font-medium">{percent(share)}</span>
    </span>
  );
};

const STEPS = ["Pick", "Check", "Find", "Claim", "Open PR"];

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

  // Two rows of organisation logos, alternating so neighbours differ.
  const withLogos = GSOC_ORGS.filter((o) => o.logo);
  const logoRow = (half: number) =>
    withLogos
      .filter((_, i) => i % 2 === half)
      .slice(0, 26)
      .map((org) => [org.name, org.logo!] as const);

  const solid = rows.filter((r) => r.replyN >= SOLID && r.replyHours !== null);
  const fastest = [...solid]
    .filter((r) => r.mergeRate !== null)
    .sort((a, b) => a.replyHours! - b.replyHours!)
    .slice(0, 4);
  const orgs = rankOrgs(allOrgStats(rows)).filter(isRanked).slice(0, 3);
  const beginner = issues.filter((i) => i.label === "beginner");
  const free = beginner.slice(0, 2);
  const pair = famousPair(rows);
  // A responsive repository not already listed above, so the example reads as typical.
  const example =
    solid.find(
      (r) =>
        r.hours !== null &&
        r.replyHours! <= 24 &&
        (r.mergeRate ?? 0) >= 0.7 &&
        !fastest.includes(r),
    ) ??
    solid.find((r) => r.hours !== null && r.mergeRate !== null) ??
    fastest[0];
  const hours = example?.hours ?? null;
  const peak = hours ? hours.indexOf(Math.max(...hours)) : -1;
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
        <Link
          href="/gsoc"
          className="group text-ink-2 hover:text-ink mx-auto flex w-fit items-center gap-2.5 text-sm transition-colors"
        >
          <GsocMark size={22} />
          Every Google Summer of Code organisation, 2024 to 2026
          <span
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
        <div className="mt-6 mb-20 space-y-4 md:mb-28">
          <LogoDrift seconds={80} logos={logoRow(0)} />
          <LogoDrift seconds={95} reverse logos={logoRow(1)} />
        </div>

        <p className="eyebrow">Everything here</p>
        <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
          One place to pick, <em>check and start.</em>
        </h2>
        <p className="text-ink-2 mt-4 max-w-xl text-lg">
          Every tile shows today&apos;s data. Open one for the full page.
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
          <Tile
            href="/explore"
            label="Explore"
            icon="explore"
            title="Every repository, sorted by how it treats newcomers"
            className="md:col-span-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <Big
                value={rows.length.toLocaleString("en-US")}
                caption="repositories measured"
              />
              <span className="text-ink-3 text-xs">{languages} languages</span>
            </div>
            <div className="text-ink-3 mt-6 grid grid-cols-[minmax(0,1fr)_5rem_4.5rem] gap-x-4 text-[11px] sm:grid-cols-[minmax(0,1fr)_9rem_4.5rem]">
              <span>Fastest to reply</span>
              <span>Merged</span>
              <span className="text-right">First reply</span>
            </div>
            {fastest.map((r, i) => (
              <div
                key={r.id}
                className={`grid grid-cols-[minmax(0,1fr)_5rem_4.5rem] items-center gap-x-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_9rem_4.5rem] ${i > 0 ? "border-hair border-t" : ""}`}
              >
                <span className="min-w-0 truncate">{r.id}</span>
                <span className="flex items-center gap-2">
                  <Bar share={r.mergeRate ?? 0} />
                  <span className="num text-ink-2 w-8 shrink-0 text-right text-xs max-sm:hidden">
                    {percent(r.mergeRate)}
                  </span>
                </span>
                <span className="num bg-accent-soft text-accent justify-self-end rounded-full px-2 py-0.5 text-xs">
                  {duration(r.replyHours)}
                </span>
              </div>
            ))}
          </Tile>

          <Tile
            href="/gsoc"
            label="GSoC"
            icon="gsoc"
            title="Organisations ranked by who answers"
            className="md:col-span-2"
          >
            <div className="space-y-4">
              {orgs.map((stats, i) => (
                <div key={stats.org.slug}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="num text-ink-3 w-3 text-xs">{i + 1}</span>
                      <OrgLogo src={stats.org.logo} name={stats.org.name} size={26} />
                      <span className="truncate">{stats.org.name}</span>
                    </span>
                    <span className="num text-accent shrink-0 font-medium">
                      {percent(stats.within7d)}
                    </span>
                  </div>
                  <span className="mt-2 block pl-5">
                    <Bar share={stats.within7d ?? 0} />
                  </span>
                </div>
              ))}
            </div>
            <p className="text-ink-3 mt-4 text-xs">Outside PRs answered within 7 days</p>
          </Tile>

          <Tile
            href="/issues"
            label="First issues"
            icon="issues"
            title="Issues nobody has taken yet"
            className="md:col-span-2"
          >
            <Big
              value={beginner.length.toLocaleString("en-US")}
              caption="free right now"
              tone="text-accent"
            />
            <div className="mt-5 space-y-2">
              {free.map((issue) => (
                <div
                  key={`${issue.id}#${issue.n}`}
                  className="border-hair bg-bg rounded-xl border px-3 py-2.5"
                >
                  <p className="flex items-center gap-2 text-sm">
                    <span className="bg-accent size-1.5 shrink-0 rounded-full" />
                    <span className="truncate">{issue.title}</span>
                  </p>
                  <p className="text-ink-3 mt-0.5 truncate pl-3.5 font-mono text-[11px]">
                    {issue.id} #{issue.n}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-ink-3 mt-3 text-xs">Unassigned, unclaimed, no open PR</p>
          </Tile>

          <Tile
            href="/check"
            label="Check a repo"
            icon="check"
            title="Paste any repo, GSoC or not"
            className="md:col-span-2"
          >
            <div className="border-hair-strong bg-bg flex items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-xs">
              <span className="text-ink-3">github.com/</span>
              <span className="truncate">{example?.id ?? "owner/name"}</span>
            </div>
            {example && example.mergeRate !== null ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-bg-3/60 rounded-xl p-3">
                  <p className="text-ink-3 text-[11px]">First reply</p>
                  <p className="num text-accent mt-1 text-xl font-medium">
                    {duration(example.replyHours)}
                  </p>
                </div>
                <div className="bg-bg-3/60 rounded-xl p-3">
                  <p className="text-ink-3 text-[11px]">Outside PRs merged</p>
                  <p className="num mt-1 text-xl font-medium">
                    {percent(example.mergeRate)}
                  </p>
                </div>
              </div>
            ) : null}
            <p className="text-ink-3 mt-3 text-xs">Ready in seconds, no sign-in</p>
          </Tile>

          <Tile
            href="/match"
            label="Help me choose"
            icon="match"
            title="Your stack in, a shortlist out"
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
            <span className="bg-hair-strong my-3 ml-4 block h-5 w-px" />
            {pick ? (
              <div className="border-hair bg-bg flex items-center gap-4 rounded-xl border p-3">
                <Ring share={pick.within48h!} />
                <span className="min-w-0">
                  <span className="text-ink-3 block text-[11px]">Pick 1</span>
                  <span className="block truncate text-sm">{pick.id}</span>
                  <span className="text-ink-2 block text-xs">
                    of PRs answered within 48 hours
                  </span>
                </span>
              </div>
            ) : null}
          </Tile>

          {pair ? (
            <Tile
              href={`/compare?repos=${pair.slow.id},${pair.fast.id}`}
              label="Compare"
              icon="compare"
              title="Same stars. Very different welcome."
              className="md:col-span-3"
            >
              <div className="relative grid grid-cols-2 gap-3">
                {[pair.fast, pair.slow].map((r, i) => (
                  <div
                    key={r.id}
                    className="border-hair bg-bg min-w-0 rounded-xl border p-4"
                  >
                    <p className="truncate text-sm">{r.id}</p>
                    <p className="text-ink-3 num text-[11px]">★ {compact(r.stars)}</p>
                    <p
                      className={`num mt-4 text-[1.75rem] leading-none font-medium ${i === 0 ? "text-accent" : "text-slow"}`}
                    >
                      {duration(r.replyHours)}
                    </p>
                    <p className="text-ink-3 mt-1 text-[11px]">first reply</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Bar
                        share={r.mergeRate ?? 0}
                        tone={i === 0 ? "bg-accent" : "bg-slow"}
                      />
                      <span className="num text-ink-2 shrink-0 text-xs">
                        {percent(r.mergeRate)}
                      </span>
                    </div>
                    <p className="text-ink-3 mt-1 text-[11px]">merged</p>
                  </div>
                ))}
                <span className="border-hair-strong bg-bg-2 text-ink-2 absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xs font-medium">
                  vs
                </span>
              </div>
            </Tile>
          ) : null}

          <Tile
            href={example ? `/repo/${example.id}#hours` : "/explore"}
            label="Reply hours"
            icon="hours"
            title="When replies arrive, in your time zone"
            className={pair ? "md:col-span-3" : "md:col-span-6"}
          >
            {hours ? (
              <>
                <div className="flex h-28 items-end gap-[3px]">
                  {hours.map((value, h) => (
                    <span
                      key={h}
                      className={`flex-1 rounded-t-[3px] ${h === peak ? "bg-accent" : "bg-accent/35"}`}
                      style={{ height: `${Math.max(6, (value / 9) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="text-ink-3 num border-hair mt-1.5 flex justify-between border-t pt-1.5 text-[11px]">
                  <span>00</span>
                  <span>06</span>
                  <span>12</span>
                  <span>18</span>
                  <span>24</span>
                </div>
                <p className="text-ink-2 mt-3 truncate text-sm">
                  Busiest around{" "}
                  <span className="num text-accent">
                    {String(peak).padStart(2, "0")}:00 UTC
                  </span>{" "}
                  for {example?.id}
                </p>
              </>
            ) : null}
          </Tile>

          <Tile
            href="/start"
            label="Start here"
            icon="start"
            title="Your first pull request in five steps"
            className="md:col-span-3"
          >
            <ol className="grid grid-cols-5">
              {STEPS.map((step, i) => (
                <li key={step} className="relative flex flex-col items-center gap-2">
                  {i > 0 ? (
                    <span className="bg-hair-strong absolute top-4 right-1/2 h-px w-full" />
                  ) : null}
                  <span
                    className={`num relative grid size-8 place-items-center rounded-full border text-xs ${
                      i === 0
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-hair-strong bg-bg-2 text-ink-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-ink-2 text-center text-[11px] leading-tight sm:text-xs">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-ink-3 mt-5 text-xs">
              With the expected GSoC 2027 timeline and what to do each month
            </p>
          </Tile>

          <Tile
            href="/saved"
            label="Save and follow"
            icon="saved"
            title="Keep a shortlist, follow new issues"
            className="md:col-span-3"
          >
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["saved", "Shortlist", "Share it as a link"],
                  ["issues", "Feeds", "New free issues"],
                  ["check", "Badge", "For your README"],
                ] as const
              ).map(([icon, name, note]) => (
                <div key={name} className="bg-bg-3/60 min-w-0 rounded-xl p-3">
                  <span className="text-accent">
                    <Icon d={ICONS[icon]} />
                  </span>
                  <p className="mt-2 text-sm font-medium">{name}</p>
                  <p className="text-ink-3 text-[11px] leading-tight">{note}</p>
                </div>
              ))}
            </div>
            <p className="text-ink-3 mt-3 text-xs">No account. Stays in your browser.</p>
          </Tile>
        </ul>
      </div>
    </section>
  );
}
