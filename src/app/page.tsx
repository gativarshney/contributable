import Link from "next/link";
import { Field } from "@/components/home/Field";
import { Story } from "@/components/home/Story";
import { RepoInput } from "@/components/site/RepoInput";
import { ThisWeek } from "@/components/home/ThisWeek";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { facet } from "@/lib/explore/query";
import { count, date } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const revalidate = 900;

const DOORS = [
  {
    href: "/gsoc",
    kicker: "Ranked",
    title: "GSoC organisations",
    text: "Every organisation from 2024 to 2026, ordered by how often it answers outside pull requests within 7 days.",
  },
  {
    href: "/issues",
    kicker: "Available now",
    title: "First issues nobody has taken",
    text: "Open, unassigned, unclaimed and with no pull request yet. Checked against the issue itself, not its label.",
  },
  {
    href: "/guide",
    kicker: "Read first",
    title: "How to pick an organisation",
    text: "One rule, a six-point checklist and two examples taken from the data.",
  },
];

/** Languages a person would call their stack; markup and build files are left out. */
const NOT_A_STACK = new Set([
  "html",
  "css",
  "scss",
  "shell",
  "makefile",
  "dockerfile",
  "batchfile",
  "tex",
  "jupyter notebook",
  "cmake",
  "powershell",
  "roff",
]);

const EXAMPLES = ["vercel/next.js", "fastify/fastify", "OpenPrinting/cups"];

export default async function HomePage() {
  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  // The index's own clock, so the page is the same for everyone until it refreshes.
  const now = Date.parse(index.generatedAt);
  const available = index.rows.reduce((sum, r) => sum + r.available, 0);
  const orgs = new Set(index.rows.flatMap((r) => (r.gsoc ? [r.gsoc] : []))).size;
  const chips = facet(index.rows, (r) => r.lang, 40)
    .map((f) => f.value.toLowerCase())
    .filter((name) => !NOT_A_STACK.has(name))
    .slice(0, 6);

  return (
    <>
      <Field chips={chips} examples={EXAMPLES}>
        <Link
          href="/start"
          className="rise border-hair-strong text-ink-2 hover:text-ink bg-bg-2/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
        >
          <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
          New to open source?
          <span className="text-ink-3" aria-hidden="true">
            ·
          </span>
          Start here →
        </Link>
        <h1 className="display mt-5 max-w-4xl text-[clamp(2.4rem,min(6.6vw,8.6svh),4.75rem)]">
          Find a project that <em>answers newcomers.</em>
        </h1>
        <p className="text-ink-2 mt-4 max-w-xl text-balance sm:mt-5 sm:text-lg">
          See how fast a project replies to a first pull request and how often it merges
          one. Search every GSoC organisation, or check any repository.
        </p>
      </Field>

      <Story rows={index.rows} />

      <ThisWeek rows={index.rows} issues={issues} now={now} />

      <section className="border-hair border-t">
        <dl className="shell grid grid-cols-2 gap-y-8 py-12 text-center md:grid-cols-4">
          {[
            [count(index.rows.length), "repositories measured"],
            [
              `${count(orgs)} of ${count(GSOC_ORGS.length)}`,
              "GSoC organisations covered",
            ],
            [count(available), "first issues free right now"],
            [
              index.rows.length > 0 ? date(index.generatedAt) : "Preparing",
              "last refresh",
            ],
          ].map(([value, label]) => (
            <div key={label}>
              <dd className="text-[clamp(1.75rem,4vw,2.75rem)] leading-none font-medium tracking-tight">
                {value}
              </dd>
              <dt className="text-ink-2 mt-3 text-sm">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <p className="eyebrow">Start here</p>
          <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
            Three ways in, <em>one rule.</em>
          </h2>
          <p className="text-ink-2 mt-5 max-w-xl text-lg">
            Pick the project that answers newcomers, not the most famous one.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {DOORS.map((door) => (
              <Link
                key={door.href}
                href={door.href}
                className="card group hover:border-hair-strong flex flex-col p-7 transition-colors"
              >
                <p className="eyebrow !text-accent">{door.kicker}</p>
                <h3 className="font-display mt-4 text-2xl">{door.title}</h3>
                <p className="text-ink-2 mt-3 flex-1 text-[15px]">{door.text}</p>
                <p className="mt-8 text-sm">
                  Open{" "}
                  <span
                    className="inline-block transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-hair relative overflow-hidden border-t py-24 md:py-36">
        <div className="hero-glow rotate-180" aria-hidden="true" />
        <div className="shell relative flex flex-col items-center text-center">
          <h2 className="display text-[clamp(2.2rem,5.4vw,4rem)]">
            Have a repository in mind? <em>Check it.</em>
          </h2>
          <p className="text-ink-2 mt-5 max-w-lg text-lg">
            Paste any public GitHub repository. If it is not in the index yet, it is
            measured while you wait.
          </p>
          <div className="mt-9 w-full max-w-xl">
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
