import type { Metadata } from "next";
import { PageMark } from "@/components/site/Drift";
import { getStatus } from "@/lib/data";
import { count, dateTime, percent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Status",
  description: "How fresh the index is, how much of it is measured and when it last ran.",
  alternates: { canonical: "/status" },
};

export const revalidate = 300;

const STOPPED: Record<string, string> = {
  done: "Everything due was refreshed.",
  budget: "It used that hour's GitHub allowance and will continue on the next run.",
  time: "It reached its time limit and will continue on the next run.",
};

const REASONS: Record<string, string> = {
  "not-found": "Repository not found (renamed, deleted or made private)",
  forbidden: "Not readable",
  upstream: "GitHub returned an error",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-hair flex items-baseline justify-between gap-6 border-b py-3">
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="num text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function StatusPage() {
  const status = await getStatus();
  return (
    <div className="page-glow shell max-w-3xl py-10 md:py-14">
      <div className="flex items-center gap-3">
        <PageMark icon="M3 12h4l2-5 4 10 2-5h6" />
        <p className="eyebrow">Status</p>
      </div>
      <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
        How fresh <em>the data is.</em>
      </h1>

      {!status ? (
        <div className="card mt-8 p-6">
          <p className="font-medium">Preparing the index</p>
          <p className="text-ink-2 mt-2 text-sm">
            The first run has not published yet. This page fills in on its own.
          </p>
        </div>
      ) : (
        <>
          <p className="text-ink-2 mt-4">
            The index refreshes several times a day. Each run measures the stalest
            repositories first, within the free allowance GitHub gives the project.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {(
              [
                [
                  "Measured",
                  status.indexed,
                  status.universe,
                  "of the repositories in the index",
                ],
                [
                  "Fresh, 2 days",
                  status.fresh2d,
                  status.indexed,
                  "refreshed in the last 2 days",
                ],
                [
                  "Fresh, 7 days",
                  status.fresh7d,
                  status.indexed,
                  "refreshed in the last week",
                ],
              ] as const
            ).map(([label, part, whole, note]) => {
              const share = whole ? part / whole : 0;
              return (
                <div key={label} className="card p-5">
                  <p className="text-ink-2 text-sm">{label}</p>
                  <p className="mt-2 text-4xl leading-none font-medium tracking-tight">
                    {percent(share)}
                  </p>
                  <div className="bg-bg-3 mt-4 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${Math.max(2, share * 100)}%` }}
                    />
                  </div>
                  <p className="text-ink-3 num mt-2 text-xs">
                    {count(part)} {note}
                  </p>
                </div>
              );
            })}
          </div>
          <dl className="mt-8">
            <Row label="Repositories in the index" value={count(status.universe)} />
            <Row
              label="Oldest figure"
              value={status.oldestUpdatedAt ? dateTime(status.oldestUpdatedAt) : "n/a"}
            />
            <Row label="Last run finished" value={dateTime(status.lastRun.finishedAt)} />
            <Row
              label="Last run"
              value={`${count(status.lastRun.refreshed)} refreshed, ${count(status.lastRun.failed)} could not be read`}
            />
          </dl>
          <p className="text-ink-2 mt-4 text-sm">{STOPPED[status.lastRun.stoppedBy]}</p>

          {status.failures.length > 0 ? (
            <section className="mt-12">
              <h2 className="font-display text-2xl">Could not be read</h2>
              <p className="text-ink-2 mt-2 text-sm">
                These are retried after a day. Nothing is shown for a repository until it
                has been read successfully.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {status.failures.slice(0, 40).map((failure) => (
                  <li key={failure.id} className="flex flex-wrap justify-between gap-x-6">
                    <span className="num">{failure.id}</span>
                    <span className="text-ink-3">
                      {REASONS[failure.reason] ?? "Could not be read"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
