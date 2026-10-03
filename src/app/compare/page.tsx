import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline } from "@/components/data/Sparkline";
import type { IndexRow } from "@/core/published";
import { getIndex } from "@/lib/data";
import { compact, date, duration, firstReply, percent, TREND_LABEL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Compare repositories",
  description:
    "Put two to four repositories side by side: first reply time, outside merge rate, starter issues and activity.",
  alternates: { canonical: "/compare" },
};

const MAX = 4;
type Params = Record<string, string | string[] | undefined>;

const na = (text: string | null) => text ?? "n/a";

/** Each line: label, value per repository, and which direction is better (if any). */
const LINES: {
  label: string;
  note?: string;
  value: (r: IndexRow) => string;
  score?: (r: IndexRow) => number | null;
  better?: "low" | "high";
}[] = [
  {
    label: "First reply to outside PRs",
    note: "median",
    value: (r) =>
      r.replyHours === null && r.replyN < 5 ? "n/a" : firstReply(r.replyHours, r.replyN),
    score: (r) => r.replyHours,
    better: "low",
  },
  {
    label: "Replied within 48 hours",
    value: (r) => na(r.within48h === null ? null : percent(r.within48h)),
    score: (r) => r.within48h,
    better: "high",
  },
  {
    label: "Replied within 7 days",
    value: (r) => na(r.within7d === null ? null : percent(r.within7d)),
    score: (r) => r.within7d,
    better: "high",
  },
  { label: "Outside PRs in the sample", value: (r) => String(r.replyN) },
  {
    label: "Outside PRs merged",
    value: (r) => na(r.mergeRate === null ? null : percent(r.mergeRate)),
    score: (r) => r.mergeRate,
    better: "high",
  },
  {
    label: "First-time contributors merged",
    value: (r) => na(r.firstTimerRate === null ? null : percent(r.firstTimerRate)),
    score: (r) => r.firstTimerRate,
    better: "high",
  },
  {
    label: "Time to merge",
    note: "median",
    value: (r) => na(r.mergeHours === null ? null : duration(r.mergeHours)),
    score: (r) => r.mergeHours,
    better: "low",
  },
  {
    label: "First reply to issues",
    note: "median",
    value: (r) => na(r.issueReplyHours === null ? null : duration(r.issueReplyHours)),
    score: (r) => r.issueReplyHours,
    better: "low",
  },
  {
    label: "Starter issues available",
    value: (r) => String(r.available),
    score: (r) => r.available,
    better: "high",
  },
  {
    label: "Commits, 90 days",
    value: (r) => na(r.commits90d?.toLocaleString("en-US") ?? null),
  },
  { label: "Active maintainers", value: (r) => String(r.maintainers) },
  { label: "Stars", value: (r) => compact(r.stars) },
  { label: "Main language", value: (r) => r.lang[0] ?? "n/a" },
  {
    label: "Sign-off",
    value: (r) =>
      ({
        cla: "CLA required",
        dco: "DCO sign-off",
        none: "None found",
        unknown: "Unknown",
      })[r.cla],
  },
  { label: "Trend", value: (r) => TREND_LABEL[r.trend] || "n/a" },
  { label: "Updated", value: (r) => date(r.updatedAt) },
];

function bestIndex(rows: IndexRow[], line: (typeof LINES)[number]): number {
  if (!line.score || !line.better || rows.length < 2) return -1;
  const scores = rows.map(line.score);
  const present = scores.filter((s): s is number => s !== null);
  if (present.length < 2) return -1;
  const target = line.better === "low" ? Math.min(...present) : Math.max(...present);
  // No winner on a tie.
  return present.filter((s) => s === target).length === 1 ? scores.indexOf(target) : -1;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const raw = [params.repos, params.add]
    .flatMap((v) => (Array.isArray(v) ? v : [v ?? ""]))
    .join(",");
  const wanted = [
    ...new Set(
      raw
        .split(/[,\s]+/)
        .map((id) =>
          id
            .trim()
            .replace(/^https?:\/\/github\.com\//i, "")
            .replace(/\/+$/, "")
            .toLowerCase(),
        )
        .filter((id) => /^[\w.-]+\/[\w.-]+$/.test(id)),
    ),
  ].slice(0, MAX);

  const index = await getIndex();
  const byId = new Map(index.rows.map((r) => [r.id.toLowerCase(), r]));
  const rows = wanted.flatMap((id) => byId.get(id) ?? []);
  const missing = wanted.filter((id) => !byId.has(id));
  const ids = rows.map((r) => r.id);
  const link = (list: string[]) =>
    list.length ? `/compare?repos=${list.join(",")}` : "/compare";

  return (
    <div className="shell py-10 md:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Compare</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
          Side by <em>side.</em>
        </h1>
        <p className="text-ink-2 mt-4">
          Two to four repositories. The better figure in each row is marked; a row with a
          tie or a missing figure has no mark.
        </p>
      </header>

      {rows.length < MAX ? (
        <form action="/compare" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input type="hidden" name="repos" value={ids.join(",")} />
          <label className="flex-1">
            <span className="sr-only">Repository to add</span>
            <input
              name="add"
              list="indexed"
              placeholder="owner/name"
              className="field"
              autoComplete="off"
              required
            />
          </label>
          <datalist id="indexed">
            {index.rows.slice(0, 2000).map((r) => (
              <option key={r.id} value={r.id} />
            ))}
          </datalist>
          <button className="btn">Add repository</button>
        </form>
      ) : null}

      {missing.length > 0 ? (
        <p className="text-ink-2 mt-4 text-sm">
          Not in the index yet: {missing.join(", ")}.{" "}
          <Link href={`/repo/${missing[0]}`} className="link">
            Analyze {missing[0]} now
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="card mt-8 max-w-xl p-6">
          <p className="font-medium">Nothing to compare yet</p>
          <p className="text-ink-2 mt-2 text-sm">
            Add a repository above, or pick some from{" "}
            <Link href="/explore" className="link">
              Explore
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="border-hair mt-8 overflow-x-auto rounded-2xl border">
          <table className="data-table min-w-[640px]">
            <caption className="sr-only">Comparison of the selected repositories</caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                {rows.map((r) => (
                  <th key={r.id} scope="col" className="!text-ink !text-sm">
                    <Link href={`/repo/${r.id}`} className="link">
                      {r.id}
                    </Link>
                    <Link
                      href={link(ids.filter((id) => id !== r.id))}
                      className="text-ink-3 hover:text-ink ml-2 text-xs font-normal"
                      aria-label={`Remove ${r.id}`}
                    >
                      Remove
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => {
                const best = bestIndex(rows, line);
                return (
                  <tr key={line.label}>
                    <th
                      scope="row"
                      className="!border-hair !text-ink-2 !text-sm font-normal"
                    >
                      {line.label}
                      {line.note ? (
                        <span className="text-ink-3 ml-1.5 text-xs">{line.note}</span>
                      ) : null}
                    </th>
                    {rows.map((r, i) => (
                      <td key={r.id} className="num">
                        <span className={i === best ? "text-fast font-medium" : ""}>
                          {line.value(r)}
                        </span>
                        {i === best ? (
                          <span className="text-fast ml-1.5 text-xs">better</span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="!border-hair !text-ink-2 !text-sm font-normal">
                  Outside PRs, 52 weeks
                </th>
                {rows.map((r) => (
                  <td key={r.id}>
                    <Sparkline
                      values={r.spark}
                      label={`Outside pull requests per four weeks: ${r.spark.join(", ")}`}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
