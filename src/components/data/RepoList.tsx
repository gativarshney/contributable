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
import {
  FIRST_REPLY_INFO,
  InfoTip,
  MERGED_INFO,
  STARTER_INFO,
} from "@/components/site/InfoTip";

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
  info,
  infoAlign,
}: {
  label: string;
  value: string;
  note: string;
  className?: string;
  info?: string;
  infoAlign?: "left" | "right";
}) {
  const missing = value === NOT_ENOUGH || value === UNANSWERED;
  return (
    <div>
      <dt className="text-ink-3 flex items-center gap-1 text-xs whitespace-nowrap">
        {label}
        {info ? <InfoTip text={info} align={infoAlign} /> : null}
      </dt>
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
  const [owner, name] = row.id.split("/");
  return (
    <article className="card hover:border-accent/40 group relative flex flex-col p-5 transition-colors">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://github.com/${owner}.png?size=72`}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="border-hair bg-bg-3 size-9 shrink-0 rounded-lg border"
        />
        <h3 className="min-w-0 flex-1 text-[15px] leading-snug font-medium tracking-tight">
          <Link
            href={repoHref(row.id)}
            className="group-hover:text-accent break-words transition-colors after:absolute after:inset-0"
          >
            <span className="text-ink-2 block text-xs font-normal">{owner}</span>
            {name}
          </Link>
        </h3>
        <span className="text-ink-3 num inline-flex shrink-0 items-center gap-1 text-xs">
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
          </svg>
          {compact(row.stars)}
        </span>
      </div>
      <p className="text-ink-2 mt-3 line-clamp-2 min-h-[2.5rem] text-sm">
        {row.d || "No description."}
      </p>
      <dl className="mt-4 grid grid-cols-[1.2fr_1fr_1fr] gap-3">
        <Figure
          label="First reply"
          info={FIRST_REPLY_INFO}
          value={firstReply(row.replyHours, row.replyN)}
          note={`${row.replyN} outside PRs`}
          className={SPEED_CLASS[replySpeed(row.replyHours)]}
        />
        <div>
          <Figure
            label="Merged"
            info={MERGED_INFO}
            value={percent(row.mergeRate)}
            note={`of ${row.decided} decided`}
          />
          {row.mergeRate !== null ? (
            <span
              className="bg-bg-3 mt-1.5 block h-1 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <span
                className="bg-accent block h-full rounded-full"
                style={{ width: `${Math.round(row.mergeRate * 100)}%` }}
              />
            </span>
          ) : null}
        </div>
        <Figure
          label="Free issues"
          info={STARTER_INFO}
          infoAlign="right"
          value={String(row.available)}
          note="available"
          className={row.available > 0 ? "text-accent" : "text-ink-3"}
        />
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
      <div className="border-hair [margin-top:max(1rem,auto)] mt-auto flex items-end justify-between gap-3 border-t pt-3">
        <p className="text-ink-3 text-[11px]">Updated {date(row.updatedAt)}</p>
        <Sparkline
          width={72}
          height={20}
          values={row.spark}
          label={`Outside pull requests opened per four weeks: ${row.spark.join(", ")}`}
        />
      </div>
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
              <span className="inline-flex items-center gap-1">
                First reply
                <InfoTip text={FIRST_REPLY_INFO} side="bottom" />
              </span>
            </th>
            <th scope="col" className="right">
              In 48 h
            </th>
            <th scope="col" className="right">
              <span className="inline-flex items-center gap-1">
                Merged
                <InfoTip text={MERGED_INFO} side="bottom" align="right" />
              </span>
            </th>
            <th scope="col" className="right @max-[54rem]:hidden">
              To merge
            </th>
            <th scope="col" className="right">
              <span className="inline-flex items-center gap-1">
                Free issues
                <InfoTip text={STARTER_INFO} side="bottom" align="right" />
              </span>
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
