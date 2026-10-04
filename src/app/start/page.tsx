import type { Metadata } from "next";
import { Drift, DriftPill, PageMark } from "@/components/site/Drift";
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

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="border-hair grid gap-4 border-t py-10 md:grid-cols-[5rem_1fr] md:gap-8">
      <span className="text-accent text-5xl leading-none font-medium tracking-tight">
        {n}
      </span>
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
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
    <div className="shell py-10 md:py-14">
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

      <div className="mt-10">
        <Drift
          seconds={60}
          items={[
            "Pick a project",
            "Check it replies",
            "Find a free issue",
            "Say you are on it",
            "Open a small pull request",
            "Wait calmly",
          ].map((s, i) => (
            <DriftPill key={s} accent={i === 0}>
              <span className="num text-ink-3">{(i % 6) + 1}</span> {s}
            </DriftPill>
          ))}
        />
      </div>

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
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
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

      <section className="border-hair border-t pt-12">
        <h2 className="font-display text-2xl">The words, in plain language</h2>
        <dl className="mt-6 grid gap-x-12 gap-y-5 sm:grid-cols-2">
          {WORDS.map(([term, meaning]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1 text-[15px]">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
