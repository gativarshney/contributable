import type { Metadata } from "next";
import { PageMark } from "@/components/site/Drift";
import Link from "next/link";
import { CopyButton } from "@/components/site/CopyButton";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { count } from "@/lib/format";

export const metadata: Metadata = {
  title: "New to open source? Start here",
  description:
    "Five steps from never having contributed to a first pull request: pick a project that replies, find an issue nobody has taken, and say you are working on it.",
  alternates: { canonical: "/start" },
};

export const revalidate = 3600;

const CLAIM = `Hi! I would like to work on this. My plan is to <one sentence on what you will change>. Is that the right direction? I will open a pull request this week.`;

/** The five steps, each with a short label for the overview and an icon. */
const STEPS: { short: string; icon: string }[] = [
  { short: "Pick a project", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3" },
  {
    short: "Check it replies",
    icon: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z",
  },
  {
    short: "Find a free issue",
    icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  },
  { short: "Say you are on it", icon: "M4 6h16v10H9l-5 4Z" },
  { short: "Open a small PR", icon: "M7 4v10a4 4 0 0 0 4 4h6M7 4 4 7m3-3 3 3" },
];

const WORDS: [term: string, meaning: string][] = [
  ["Repository (repo)", "A project's folder of code on GitHub, with its history."],
  ["Issue", "A note describing a bug or a task. This is where work is discussed."],
  ["Pull request (PR)", "Your proposed change, sent to the project for review."],
  ["Fork", "Your own copy of a repository, where you make the change before sending it."],
  ["Maintainer", "A person who reviews pull requests and can merge them."],
  ["Merge", "Accepting your change into the project. This is the goal."],
  ["Good first issue", "A label maintainers put on tasks suited to a newcomer."],
  [
    "CLA / DCO",
    "A one-time agreement some projects need before merging. DCO means adding -s when you commit.",
  ],
];

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  const last = n === STEPS.length;
  return (
    <li
      id={`step-${n}`}
      className="relative grid scroll-mt-4 grid-cols-[3rem_1fr] gap-4 pb-8 md:gap-8"
    >
      {last ? null : (
        <span
          className="from-accent/40 to-accent/10 absolute top-14 bottom-0 left-6 w-px bg-gradient-to-b"
          aria-hidden="true"
        />
      )}
      <span className="border-accent/40 bg-accent-soft/40 text-accent relative grid size-12 place-items-center rounded-full border">
        <Icon d={STEPS[n - 1].icon} />
        <span className="bg-accent text-accent-ink num absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[11px] font-medium">
          {n}
        </span>
      </span>
      <div className="card p-6 md:p-7">
        <p className="eyebrow !text-accent">Step {n}</p>
        <h2 className="font-display mt-2 text-2xl">{title}</h2>
        <div className="text-ink-2 mt-3 max-w-2xl space-y-4">{children}</div>
      </div>
    </li>
  );
}

export default async function StartPage() {
  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  const friendly = index.rows.filter(
    (r) => r.guide && r.available > 0 && r.replyHours !== null && r.replyHours <= 168,
  ).length;
  const free = issues.filter((i) => i.label === "beginner").length;

  return (
    <div className="page-glow shell py-10 md:py-14">
      <header className="max-w-3xl">
        <div className="flex items-center gap-3">
          <PageMark icon="M6 4l14 8-14 8z" />
          <p className="eyebrow">New to open source</p>
        </div>
        <h1 className="display mt-5 text-[clamp(2.2rem,5.6vw,3.75rem)]">
          Your first pull request, <em>in five steps.</em>
        </h1>
        <p className="text-ink-2 mt-5 text-lg">
          You do not need to be an expert, and you do not need permission. You need a
          project that answers, a small task, and one clear message.
        </p>
      </header>

      {/* The whole path at a glance; each stop jumps to its step. */}
      <nav aria-label="Steps" className="-mx-4 mt-10 overflow-x-auto px-4 pb-2">
        <ol className="relative flex min-w-[36rem] justify-between">
          <span
            className="bg-accent/30 absolute top-6 right-[10%] left-[10%] h-px"
            aria-hidden="true"
          />
          {STEPS.map((step, i) => (
            <li key={step.short} className="relative w-1/5">
              <a
                href={`#step-${i + 1}`}
                className="group flex flex-col items-center gap-2.5 text-center"
              >
                <span className="border-hair-strong bg-bg text-ink-2 group-hover:border-accent group-hover:text-accent relative grid size-12 place-items-center rounded-full border transition-colors">
                  <Icon d={step.icon} />
                </span>
                <span className="text-ink-2 group-hover:text-ink text-xs transition-colors">
                  <span className="text-accent num">{i + 1}</span> {step.short}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <ol className="mt-12">
        <Step n={1} title="Pick a project that uses what you already know">
          <p>
            Start from your own stack, not from a famous name. A language you have written
            a few hundred lines in is enough.
          </p>
          <Link href="/match" className="btn">
            Find projects for my stack
          </Link>
        </Step>

        <Step n={2} title="Check that it replies to newcomers">
          <p>
            Two numbers matter on a project&apos;s page: how long until a person replies
            to an outside pull request, and how many of those get merged. If replies take
            weeks, pick another project. That is not about you.
          </p>
          <p className="text-sm">
            Right now{" "}
            <strong className="text-ink font-medium">{count(friendly)} projects</strong>{" "}
            reply within a week, have a contributing guide and have a free first issue.
          </p>
          <Link href="/explore?reply=168&issues=1&sort=reply" className="btn btn-ghost">
            See those projects
          </Link>
        </Step>

        <Step n={3} title="Find an issue nobody has taken">
          <p>
            A &quot;good first issue&quot; label is not enough: many are already claimed.
            We check each one for an assignee, a claim comment and a linked pull request.
            {free > 0 ? ` ${count(free)} are free at the moment.` : ""}
          </p>
          <Link href="/issues" className="btn btn-ghost">
            Browse free first issues
          </Link>
        </Step>

        <Step n={4} title="Say you are working on it, on the issue">
          <p>
            Comment on the issue itself, not in a private message. Say what you plan to
            change. Then start; you do not have to wait for an answer on a small task.
          </p>
          <div className="border-hair bg-bg/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start">
            <p className="text-ink flex-1 text-sm">{CLAIM}</p>
            <CopyButton text={CLAIM} label="Copy message" />
          </div>
        </Step>

        <Step n={5} title="Open a small pull request, then wait calmly">
          <p>
            Read the project&apos;s contributing guide, make the smallest change that
            solves the issue, and link the issue in your pull request. One good pull
            request beats five rushed ones.
          </p>
          <p>
            Every project page tells you how long a first reply usually takes there. If it
            says three days, silence on day two is normal.
          </p>
          <Link href="/guide" className="btn btn-ghost">
            How to read each number
          </Link>
        </Step>
      </ol>

      <section className="border-hair mt-8 border-t pt-12">
        <h2 className="font-display text-2xl">The words, in plain language</h2>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORDS.map(([term, meaning]) => (
            <div key={term} className="card p-4">
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1 text-sm">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
