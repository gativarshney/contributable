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

  const bars = index.rows
    .filter((r) => r.within48h !== null)
    .slice(0, 30)
    .map((r) => r.within48h ?? 0);

  // The three things a visitor comes to do, each with the one figure that sizes it.
  const doors = [
    {
      href: "/explore",
      label: "Explore",
      title: "A project that replies",
      figure: count(index.rows.length),
      unit: "repositories measured",
      // Thirty measured repositories: how much of their outside work gets an answer.
      art: (
        <div className="flex h-full w-full items-end gap-[3px]">
          {bars.map((share, i) => (
            <span
              key={i}
              className="bg-accent/70 flex-1 rounded-t-[2px]"
              style={{ height: `${Math.max(8, share * 100)}%` }}
            />
          ))}
        </div>
      ),
    },
    {
      href: "/check",
      label: "Check a repo",
      title: "A repo you have in mind",
      figure: "Any",
      unit: "public GitHub repository",
      art: (
        <div className="border-hair-strong bg-bg flex w-full items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-xs">
          <span className="text-ink-3">github.com/</span>
          <span>owner/name</span>
          <span className="bg-accent ml-auto size-2 rounded-full" />
        </div>
      ),
    },
    {
      href: "/start",
      label: "Start here",
      title: "Your first pull request",
      figure: count(free),
      unit: "first issues free right now",
      // Five steps, the first one lit.
      art: (
        <div className="flex w-full items-center">
          {[1, 2, 3, 4, 5].map((step) => (
            <span key={step} className="flex flex-1 items-center last:flex-none">
              <span
                className={`num grid size-8 place-items-center rounded-full border text-xs ${
                  step === 1
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-hair-strong text-ink-3"
                }`}
              >
                {step}
              </span>
              {step < 5 ? <span className="bg-hair-strong h-px flex-1" /> : null}
            </span>
          ))}
        </div>
      ),
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
        <div className="shell reveal">
          <ul className="grid gap-4 md:grid-cols-3">
            {doors.map((door) => (
              <li key={door.href}>
                <Link
                  href={door.href}
                  className="card door group flex h-full flex-col p-7"
                >
                  <div className="flex items-center justify-between">
                    <p className="eyebrow !text-accent">{door.label}</p>
                    <span
                      className="border-hair-strong group-hover:bg-accent group-hover:text-accent-ink group-hover:border-accent grid size-9 place-items-center rounded-full border transition-colors duration-200"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                  <p className="font-display mt-5 text-2xl">{door.title}</p>
                  <div className="mt-8 flex h-16 items-end" aria-hidden="true">
                    {door.art}
                  </div>
                  <p className="mt-8 text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-medium tracking-tight">
                    {door.figure}
                  </p>
                  <p className="text-ink-2 mt-3 text-sm">{door.unit}</p>
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
