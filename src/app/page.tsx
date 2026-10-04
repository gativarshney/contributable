import Link from "next/link";
import { Field } from "@/components/home/Field";
import { Story } from "@/components/home/Story";
import { ThisWeek } from "@/components/home/ThisWeek";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { facet } from "@/lib/explore/query";
import { count, date } from "@/lib/format";

export const revalidate = 900;

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
  const free = index.rows.reduce((sum, r) => sum + r.available, 0);
  const chips = facet(index.rows, (r) => r.lang, 40)
    .map((f) => f.value.toLowerCase())
    .filter((name) => !NOT_A_STACK.has(name))
    .slice(0, 6);

  // The three things a visitor comes to do, each with the one figure that sizes it.
  const doors = [
    {
      href: "/explore",
      label: "Find",
      title: "A project that replies",
      figure: count(index.rows.length),
      unit: "repositories measured",
    },
    {
      href: "/check",
      label: "Check",
      title: "A repository you have in mind",
      figure: "Any",
      unit: "public GitHub repository",
    },
    {
      href: "/start",
      label: "Start",
      title: "Your first pull request",
      figure: count(free),
      unit: "first issues free right now",
    },
  ];

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

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <ul className="grid gap-px md:grid-cols-3">
            {doors.map((door) => (
              <li key={door.href}>
                <Link
                  href={door.href}
                  className="group border-hair hover:border-accent block border-t py-8 transition-colors md:pr-10"
                >
                  <p className="eyebrow !text-accent">{door.label}</p>
                  <p className="font-display mt-4 text-2xl">{door.title}</p>
                  <p className="mt-10 text-[clamp(2.5rem,5vw,3.75rem)] leading-none font-medium tracking-tight">
                    {door.figure}
                  </p>
                  <p className="text-ink-2 mt-3 flex items-center justify-between gap-4 text-sm">
                    {door.unit}
                    <span
                      className="text-ink transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {index.rows.length > 0 ? (
            <p className="text-ink-3 mt-10 text-xs">
              Index updated {date(index.generatedAt)}.{" "}
              <Link href="/methodology" className="link">
                How every figure is calculated
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
