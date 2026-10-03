import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RepoTable } from "@/components/data/RepoList";
import { getIndex } from "@/lib/data";
import { date, percent } from "@/lib/format";
import { GSOC_ORGS, MIN_ORG_SAMPLE, orgStats } from "@/lib/gsoc/orgs";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 900;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = GSOC_ORGS.find((o) => o.slug === slug);
  if (!org) return { title: "Organisation not found" };
  return {
    title: `${org.name}: how it treats outside contributors`,
    description: `${org.name} took part in Google Summer of Code ${org.years.join(", ")}. Reply times, outside merge rate and the repository to start with.`,
    alternates: { canonical: `/gsoc/${org.slug}` },
  };
}

function Figure({
  label,
  value,
  sample,
}: {
  label: string;
  value: string;
  sample: string;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-ink-2 text-sm">{label}</h2>
      <p className="num mt-2 text-[2.25rem] leading-none font-medium">{value}</p>
      <p className="text-ink-3 num mt-2 text-xs">{sample}</p>
    </div>
  );
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const org = GSOC_ORGS.find((o) => o.slug === slug);
  if (!org) notFound();
  const index = await getIndex();
  const stats = orgStats(org, index.rows);
  const na = (value: number | null) => (value === null ? "n/a" : percent(value));

  return (
    <article className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-ink-3 text-sm">
        <Link href="/gsoc" className="hover:text-ink">
          GSoC organisations
        </Link>{" "}
        / <span className="text-ink-2">{org.name}</span>
      </nav>
      <h1 className="display mt-4 text-[clamp(1.9rem,5vw,3.25rem)]">{org.name}</h1>
      <p className="text-ink-2 num mt-3 text-sm">
        Google Summer of Code {org.years.join(", ")}
        {org.website ? (
          <>
            {" · "}
            <a href={org.website} className="link" target="_blank" rel="noreferrer">
              Website
            </a>
          </>
        ) : null}
        {stats.updatedAt ? ` · Updated ${date(stats.updatedAt)}` : ""}
      </p>
      <p className="mt-4 flex flex-wrap gap-1.5">
        {[...org.tech, ...org.topics].slice(0, 10).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </p>

      {org.unmappable ? (
        <div className="card mt-8 max-w-2xl p-6">
          <p className="font-medium">Not measured</p>
          <p className="text-ink-2 mt-2 text-sm">{org.unmappable}</p>
        </div>
      ) : stats.repos.length === 0 ? (
        <div className="card mt-8 max-w-2xl p-6">
          <p className="font-medium">Preparing this organisation</p>
          <p className="text-ink-2 mt-2 text-sm">
            Its repositories are in the queue. Figures appear here once they have been
            measured, usually within a day.
          </p>
        </div>
      ) : (
        <>
          {stats.start ? (
            <p className="mt-8 max-w-3xl text-[clamp(1.2rem,2.4vw,1.6rem)] leading-snug font-medium tracking-tight">
              Start with{" "}
              <Link href={`/repo/${stats.start.id}`} className="link">
                {stats.start.id}
              </Link>
              .{" "}
              <span className="text-ink-2 font-normal">
                {stats.start.available > 0
                  ? "It has available starter issues and the fastest first reply in this organisation."
                  : "It has the fastest first reply in this organisation."}
              </span>
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              label="Replied within 7 days"
              value={na(stats.within7d)}
              sample={`${stats.replyN} outside PRs`}
            />
            <Figure
              label="Replied within 48 hours"
              value={na(stats.within48h)}
              sample={`${stats.replyN} outside PRs`}
            />
            <Figure
              label="Outside PRs merged"
              value={na(stats.mergeRate)}
              sample={`${stats.decided} decided`}
            />
            <Figure
              label="Starter issues available"
              value={String(stats.available)}
              sample={`across ${stats.repos.length} repositories`}
            />
          </div>
          <p className="text-ink-3 mt-3 text-xs">
            Each figure pools the organisation&apos;s measured repositories, weighted by
            their number of outside pull requests. n/a means fewer than {MIN_ORG_SAMPLE}.
          </p>

          <h2 className="font-display mt-12 text-2xl">Repositories</h2>
          <p className="text-ink-2 mt-2 mb-5 max-w-2xl text-sm">
            The most starred repositories with a push in the last 180 days and at least 5
            pull requests.
          </p>
          <RepoTable rows={stats.repos} />
        </>
      )}
    </article>
  );
}
