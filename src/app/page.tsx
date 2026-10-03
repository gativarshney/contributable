import Link from "next/link";
import { Field } from "@/components/home/Field";
import { RepoInput } from "@/components/site/RepoInput";
import { getIndex, getStatus } from "@/lib/data";
import { count, date } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const revalidate = 900;

const DOORS = [
  {
    href: "/gsoc",
    title: "GSoC organisations",
    text: "Ranked by how often they answer outside pull requests within 7 days.",
  },
  {
    href: "/issues",
    title: "Available first issues",
    text: "Open, unassigned, unclaimed and with no pull request yet.",
  },
  {
    href: "/guide",
    title: "How to pick an organisation",
    text: "One rule, a six-point checklist and examples from the data.",
  },
];

export default async function HomePage() {
  const [index, status] = await Promise.all([getIndex(), getStatus()]);
  const available = index.rows.reduce((sum, r) => sum + r.available, 0);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="shell relative pt-[clamp(1.5rem,5svh,4rem)] pb-10 text-center">
          <h1 className="display rise mx-auto max-w-4xl text-[clamp(2.3rem,min(7vw,9svh),4.75rem)]">
            Find a project that <em>answers newcomers.</em>
          </h1>
          <p
            className="text-ink-2 rise mx-auto mt-4 max-w-xl text-balance"
            style={{ animationDelay: "70ms" }}
          >
            We measure how open source projects treat people outside their team: how fast
            they reply, and how often they merge.
          </p>
          <div className="rise mt-7" style={{ animationDelay: "140ms" }}>
            <Field />
          </div>
        </div>
      </section>

      <section className="border-hair border-t">
        <dl className="shell grid grid-cols-2 gap-y-6 py-8 text-center sm:grid-cols-4">
          {[
            [count(index.rows.length), "repositories measured"],
            [count(GSOC_ORGS.length), "GSoC organisations, 2024 to 2026"],
            [count(available), "starter issues available now"],
            [
              status ? date(status.generatedAt) : "Preparing",
              status ? "last refresh" : "first refresh under way",
            ],
          ].map(([value, label]) => (
            <div key={label}>
              <dd className="num text-2xl font-medium sm:text-3xl">{value}</dd>
              <dt className="text-ink-2 mt-1 text-xs sm:text-sm">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-hair border-t py-14 md:py-20">
        <div className="shell grid gap-4 md:grid-cols-3">
          {DOORS.map((door) => (
            <Link
              key={door.href}
              href={door.href}
              className="card hover:border-hair-strong block p-6 transition-colors"
            >
              <h2 className="font-display text-xl">{door.title}</h2>
              <p className="text-ink-2 mt-2 text-sm">{door.text}</p>
              <p className="text-accent mt-5 text-sm">Open →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-hair border-t py-16 md:py-24">
        <div className="shell flex flex-col items-center text-center">
          <h2 className="display text-[clamp(1.9rem,4.4vw,3rem)]">
            Have a repository in mind? <em>Check it.</em>
          </h2>
          <p className="text-ink-2 mt-3 max-w-lg">
            Paste any public GitHub repository. If it is not in the index yet, it is
            measured while you wait.
          </p>
          <div className="mt-7 w-full max-w-xl">
            <RepoInput />
          </div>
          <p className="text-ink-3 text-sm">
            Public data only. No account needed.{" "}
            <Link href="/methodology" className="link text-ink-2">
              How every figure is calculated
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
