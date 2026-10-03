import type { Metadata } from "next";
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
  budget: "It used that hour's GitHub allowance and will continue next hour.",
  time: "It reached its time limit and will continue next hour.",
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
    <div className="shell max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Status</p>
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
            The index refreshes every hour. Each run measures the stalest repositories
            first, within the free allowance GitHub gives the project.
          </p>
          <dl className="mt-8">
            <Row label="Repositories in the index" value={count(status.universe)} />
            <Row
              label="Measured so far"
              value={`${count(status.indexed)} (${percent(status.universe ? status.indexed / status.universe : 0)})`}
            />
            <Row
              label="Refreshed in the last 2 days"
              value={`${count(status.fresh2d)} of ${count(status.indexed)}`}
            />
            <Row
              label="Refreshed in the last 7 days"
              value={`${count(status.fresh7d)} of ${count(status.indexed)}`}
            />
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
