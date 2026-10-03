import Link from "next/link";
import type { IndexRow } from "@/core/published";
import {
  compact,
  date,
  duration,
  NOT_ENOUGH,
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
  const missing = value === NOT_ENOUGH;
  return (
    <div>
      <dt className="text-ink-3 text-xs">{label}</dt>
      <dd
        className={
          missing
            ? "text-ink-3 mt-1 text-sm"
            : `num mt-0.5 text-xl font-medium ${className}`
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
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Figure
          label="First reply"
          value={duration(row.replyHours)}
          note={`${row.replyN} outside PRs`}
          className={SPEED_CLASS[replySpeed(row.replyHours)]}
        />
        <Figure
          label="Outside PRs merged"
          value={percent(row.mergeRate)}
          note={`${row.decided} decided`}
        />
        <Figure
          label="Starter issues"
          value={String(row.available)}
          note="available now"
        />
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {row.lang.map((l) => (
          <span key={l} className="tag">
            {l}
          </span>
        ))}
        {row.gsoc ? <span className="tag">GSoC {row.years.at(-1)}</span> : null}
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
    <div className="border-hair overflow-x-auto rounded-2xl border">
      <table className="data-table min-w-[860px]">
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
              Within 48 h
            </th>
            <th scope="col" className="right">
              Merged
            </th>
            <th scope="col" className="right">
              Time to merge
            </th>
            <th scope="col" className="right">
              Starter issues
            </th>
            <th scope="col" className="right">
              Stars
            </th>
            <th scope="col">Outside PRs, 52 weeks</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="!text-ink !border-hair !text-sm font-medium">
                <Link href={repoHref(row.id)} className="link">
                  {row.id}
                </Link>
                <span className="text-ink-3 ml-2 text-xs font-normal">{row.lang[0]}</span>
              </th>
              <td
                className={`right num ${SPEED_CLASS[replySpeed(row.replyHours)]}`}
                title={`${row.replyN} outside pull requests`}
              >
                {row.replyHours === null ? "n/a" : duration(row.replyHours)}
              </td>
              <td className="right num">
                {row.within48h === null ? "n/a" : percent(row.within48h)}
              </td>
              <td className="right num" title={`${row.decided} decided`}>
                {row.mergeRate === null ? "n/a" : percent(row.mergeRate)}
                <span className="text-ink-3 ml-1 text-[11px]">/{row.decided}</span>
              </td>
              <td className="right num">
                {row.mergeHours === null ? "n/a" : duration(row.mergeHours)}
              </td>
              <td className="right num">{row.available}</td>
              <td className="right num">{compact(row.stars)}</td>
              <td>
                <Sparkline
                  values={row.spark}
                  label={`Outside pull requests opened per four weeks: ${row.spark.join(", ")}`}
                />
              </td>
              <td className="text-ink-3 num text-xs whitespace-nowrap">
                {date(row.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-ink-3 px-3 py-2 text-xs">
        n/a means fewer than 5 pull requests in the sample, so no figure is shown.
      </p>
    </div>
  );
}
