import type { Metadata } from "next";
import Link from "next/link";
import { FourThings } from "@/components/home/Story";
import { RepoInput } from "@/components/site/RepoInput";
import { getIndex } from "@/lib/data";

export const metadata: Metadata = {
  title: "Check any repository",
  description:
    "Paste any public GitHub repository and see what to expect before your first pull request: where to start, who replies, and whether outside work gets merged.",
  alternates: { canonical: "/check" },
};

const EXAMPLES = [
  "vercel/next.js",
  "fastify/fastify",
  "sindresorhus/ky",
  "OpenPrinting/cups",
];

/** The six questions a report answers, each with the picture it answers them with. */
const QUESTIONS: { question: string; answer: string; icon: string }[] = [
  {
    question: "Should I contribute here?",
    answer: "A ten-point checklist, each answer with its evidence.",
    icon: "M5 12.5 10 17 19 7",
  },
  {
    question: "Where do I start?",
    answer: "Starter issues, and whether each one is really free.",
    icon: "M12 4v16M4 12h16",
  },
  {
    question: "Will my pull request be merged?",
    answer: "What happened to recent pull requests from outsiders.",
    icon: "M7 4v10a4 4 0 0 0 4 4h6M7 4 4 7m3-3 3 3",
  },
  {
    question: "Will anyone reply?",
    answer: "How long outsiders waited for a first human reply.",
    icon: "M4 6h16v10H9l-5 4z",
  },
  {
    question: "Who maintains it?",
    answer: "How many people share the work, and how recently.",
    icon: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2-5 5-5s5 2 5 5m1-5c3 0 5 2 5 5",
  },
  {
    question: "When do replies arrive?",
    answer: "The project's reply hours, in your time zone.",
    icon: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
];

export const revalidate = 900;

export default async function CheckPage() {
  const index = await getIndex();
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="shell relative flex flex-col items-center pt-[clamp(2.5rem,9svh,7rem)] pb-16 text-center md:pb-24">
          <p className="eyebrow">Check any repository</p>
          <h1 className="display mt-6 max-w-4xl text-[clamp(2.4rem,min(6.6vw,9svh),4.75rem)]">
            Know a repository <em>before your first pull request.</em>
          </h1>
          <p className="text-ink-2 mt-6 max-w-xl text-lg text-balance">
            Paste any public GitHub repository. It is read and measured while you wait,
            whether or not it is in the index.
          </p>
          <div className="mt-9 w-full max-w-xl">
            <RepoInput />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-ink-3 mr-1 text-sm">Try</span>
              {EXAMPLES.map((repo) => (
                <Link
                  key={repo}
                  href={`/repo/${repo}`}
                  className="border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3 inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs transition-colors"
                >
                  {repo}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FourThings rows={index.rows} />

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell reveal">
          <p className="eyebrow">In a full report</p>
          <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
            Six questions, <em>answered.</em>
          </h2>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUESTIONS.map((item) => (
              <li key={item.question} className="card p-6">
                <span className="border-hair-strong text-accent grid size-10 place-items-center rounded-full border">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                </span>
                <h3 className="font-display mt-5 text-xl">{item.question}</h3>
                <p className="text-ink-2 mt-2 text-[15px]">{item.answer}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/sample" className="btn btn-ghost">
              See an example report
            </Link>
            <Link href="/methodology" className="btn btn-ghost">
              How every figure is calculated
            </Link>
          </div>
          <p className="text-ink-3 mt-6 text-sm">
            Public data only. No account, nothing stored. A repository already in the
            index opens at once; any other takes about ten seconds.
          </p>
        </div>
      </section>
    </>
  );
}
