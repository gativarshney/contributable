import Link from "next/link";
import type { IndexRow } from "@/core/published";
import {
  compact,
  date,
  duration,
  firstReply,
  NOT_ENOUGH,
  UNANSWERED,
  percent,
  replySpeed,
  TREND_LABEL,
  type Speed,
} from "@/lib/format";
import { Sparkline } from "./Sparkline";

const SPEED_CLASS: Record<Speed, string> = {
  fast: "text-fast",
  ok: "text-ink",
  slow: "text-slow",
  unknown: "text-ink-3",
};

const TREND_CLASS: Record<string, string> = {
  "got-faster": "text-fast",
  "slowed-down": "text-slow",
  "went-quiet": "text-stale",
};

export const repoHref = (id: string) => `/repo/${id}`;

function Figure({
  label,
  value,
  note,
  className = "",
}: {
  label: string;
  value: string;
  note: string;
  className?: string;
}) {
  const missing = value === NOT_ENOUGH || value === UNANSWERED;
  return (
    <div>
      <dt className="text-ink-3 text-xs">{label}</dt>
      <dd
        className={
          missing
            ? "text-ink-3 mt-1 text-xs leading-tight"
            : `num mt-0.5 text-lg font-medium whitespace-nowrap ${className}`
        }
      >
        {value}
      </dd>
      <dd className="text-ink-3 num text-[11px]">{note}</dd>
    </div>
  );
}

export function RepoCard({ row }: { row: IndexRow }) {
  const trend = TREND_LABEL[row.trend];
  return (
    <article className="card hover:border-hair-strong relative flex flex-col p-5 transition-colors">
      <h3 className="text-[15px] font-medium tracking-tight">
        <Link href={repoHref(row.id)} className="after:absolute after:inset-0">
          <span className="text-ink-2">{row.id.split("/")[0]}/</span>
          {row.id.split("/")[1]}
        </Link>
      </h3>
      <p className="text-ink-2 mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm">
        {row.d || "No description."}
      </p>
      <dl className="mt-4 grid grid-cols-[1.2fr_1fr_1fr] gap-3">
        <Figure
          label="First reply"
          value={firstReply(row.replyHours, row.replyN)}
          note={`${row.replyN} outside PRs`}
          className={SPEED_CLASS[replySpeed(row.replyHours)]}
        />
        <Figure
          label="Merged"
          value={percent(row.mergeRate)}
          note={`of ${row.decided} decided`}
        />
        <Figure label="Starter issues" value={String(row.available)} note="available" />
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {row.lang.map((l) => (
          <span key={l} className="tag">
            {l}
          </span>
        ))}
        {row.gsoc ? (
          <span className="tag" title={`Google Summer of Code ${row.years.join(", ")}`}>
            GSoC {row.years.at(-1)}
          </span>
        ) : null}
        {trend ? (
          <span className={`text-xs ${TREND_CLASS[row.trend] ?? "text-ink-3"}`}>
            {trend}
          </span>
        ) : null}
      </div>
      <p className="text-ink-3 mt-3 text-[11px]">
        Updated {date(row.updatedAt)} · {compact(row.stars)} stars
      </p>
    </article>
  );
}

export function RepoTable({ rows }: { rows: IndexRow[] }) {
  return (
    <div className="border-hair @container overflow-x-auto rounded-2xl border">
      <table className="data-table min-w-[620px]">
        <caption className="sr-only">
          Repositories with reply time, merge rate and starter issues
        </caption>
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col" className="right">
              First reply
            </th>
            <th scope="col" className="right">
              In 48 h
            </th>
            <th scope="col" className="right">
              Merged
            </th>
            <th scope="col" className="right @max-[54rem]:hidden">
              To merge
            </th>
            <th scope="col" className="right">
              Free issues
            </th>
            <th scope="col" className="right">
              Stars
            </th>
            <th
              scope="col"
              title="Outside pull requests opened, per four weeks, over the last year"
            >
              52 weeks
            </th>
            <th scope="col" className="@max-[54rem]:hidden">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="!text-ink !border-hair !text-sm font-medium">
                <span className="flex max-w-[17rem] items-baseline gap-2">
                  <Link
                    href={repoHref(row.id)}
                    title={row.id}
                    className="link min-w-0 truncate"
                  >
                    {row.id}
                  </Link>
                  <span className="text-ink-3 shrink-0 text-xs font-normal">
                    {row.lang[0]}
                  </span>
                </span>
              </th>
              <td
                className={`right num ${SPEED_CLASS[replySpeed(row.replyHours)]}`}
                title={`${row.replyN} outside pull requests`}
              >
                {row.replyHours !== null
                  ? duration(row.replyHours)
                  : row.replyN >= 5
                    ? "rare"
                    : "n/a"}
              </td>
              <td className="right num">
                {row.within48h === null ? "n/a" : percent(row.within48h)}
              </td>
              <td className="right num" title={`${row.decided} decided`}>
                {row.mergeRate === null ? "n/a" : percent(row.mergeRate)}
                <span className="text-ink-3 ml-1 text-[11px]">/{row.decided}</span>
              </td>
              <td className="right num @max-[54rem]:hidden">
                {row.mergeHours === null ? "n/a" : duration(row.mergeHours)}
              </td>
              <td className="right num">{row.available}</td>
              <td className="right num">{compact(row.stars)}</td>
              <td>
                <Sparkline
                  width={72}
                  values={row.spark}
                  label={`Outside pull requests opened per four weeks: ${row.spark.join(", ")}`}
                />
              </td>
              <td className="text-ink-3 num text-xs whitespace-nowrap @max-[54rem]:hidden">
                {date(row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-ink-3 px-3 py-2 text-xs">
        n/a means fewer than 5 pull requests in the sample, so no figure is shown. A first
        reply of &quot;rare&quot; means more than half of outside pull requests got no
        reply.
      </p>
    </div>
  );
}
