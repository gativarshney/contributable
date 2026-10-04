import type { Metadata } from "next";
import { Drift, DriftPill, PageMark } from "@/components/site/Drift";
import Link from "next/link";
import { RepoCard } from "@/components/data/RepoList";
import { StackFromGitHub } from "@/components/match/StackFromGitHub";
import { getIndex } from "@/lib/data";
import { date } from "@/lib/format";
import { GOALS, LEVELS, matchProjects, parseMatch } from "@/lib/match/match";

type Params = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Params> };

const SHOWN = 12;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const input = parseMatch(await searchParams);
  const stack = input.stack.slice(0, 4).join(", ");
  const image = `/api/og/match?${new URLSearchParams({
    stack: input.stack.join(","),
    level: input.level,
    goal: input.goal,
    hours: String(input.hours),
    tz: String(input.tz),
  })}`;
  return {
    title: stack ? `Projects for ${stack}` : "Find my project",
    description: stack
      ? `Open source projects that use ${stack}, ordered by how quickly they answer outside contributors.`
      : "Tell us your stack, level and goal. Get a shortlist of projects ordered by how they treat newcomers, with the reason for each pick.",
    robots: stack ? { index: false, follow: true } : undefined,
    ...(stack
      ? {
          openGraph: { images: [image] },
          twitter: { card: "summary_large_image" as const, images: [image] },
        }
      : {}),
  };
}

export default async function MatchPage({ searchParams }: Props) {
  const params = await searchParams;
  const input = parseMatch(params);
  const asked = input.stack.length > 0;
  const index = await getIndex();
  const matches = asked ? matchProjects(index.rows, input) : [];

  return (
    <div className="shell py-10 md:py-14">
      <header className="max-w-2xl">
        <div className="flex items-center gap-3">
          <PageMark icon="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />
          <p className="eyebrow">Help me choose</p>
        </div>
        <h1 className="display mt-5 text-[clamp(2rem,5vw,3.25rem)]">
          A shortlist, <em>with reasons.</em>
        </h1>
        <p className="text-ink-2 mt-4">
          Five questions. The answer is a list ordered by how quickly each project replies
          to people outside its team. The link to your result can be shared.
        </p>
      </header>

      <div className="mt-10">
        <Drift
          items={[
            "python",
            "javascript",
            "typescript",
            "rust",
            "go",
            "java",
            "c++",
            "kotlin",
            "react",
            "django",
            "machine-learning",
            "compilers",
            "web",
            "android",
          ].map((s) => (
            <DriftPill key={s}>{s}</DriftPill>
          ))}
        />
      </div>

      <form action="/match" className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="stack" className="text-ink-2 mb-1.5 block text-xs">
            What do you code in? Languages, frameworks or topics, separated by commas
          </label>
          <input
            id="stack"
            name="stack"
            defaultValue={input.stack.join(", ")}
            placeholder="python, django, machine-learning"
            className="field"
            autoComplete="off"
            required
          />
          <StackFromGitHub target="stack" />
        </div>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Your level</span>
          <select name="level" defaultValue={input.level} className="field">
            {Object.entries(LEVELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Your goal</span>
          <select name="goal" defaultValue={input.goal} className="field">
            {Object.entries(GOALS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Hours per week</span>
          <input
            type="number"
            name="hours"
            min={1}
            max={80}
            defaultValue={input.hours}
            className="field num"
          />
        </label>
        <label className="block">
          <span className="text-ink-2 mb-1.5 block text-xs">Time zone</span>
          <select name="tz" defaultValue={String(input.tz)} className="field">
            {[
              [-480, "Pacific (UTC-8)"],
              [-300, "Eastern (UTC-5)"],
              [0, "UTC"],
              [60, "Central Europe (UTC+1)"],
              [180, "East Africa, Moscow (UTC+3)"],
              [330, "India (UTC+5:30)"],
              [480, "China, Singapore (UTC+8)"],
              [540, "Japan, Korea (UTC+9)"],
            ].map(([minutes, label]) => (
              <option key={minutes} value={minutes}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button className="btn">Find projects</button>
        </div>
      </form>

      {asked ? (
        <section className="border-hair mt-12 border-t pt-10" aria-live="polite">
          <h2 className="font-display text-2xl">
            {matches.length === 0
              ? "No project fits all of that"
              : `${Math.min(SHOWN, matches.length)} of ${matches.length} projects that fit`}
          </h2>
          <p className="border-hair-strong text-ink-2 mt-4 max-w-3xl border-l-2 pl-4 text-sm">
            <strong className="text-ink font-medium">How this list is made.</strong> A
            project must use something in your stack, have commits in the last 90 days and
            not have gone quiet.
            {input.level === "beginner"
              ? " For a newcomer it must also have a contributing guide and a median first reply within a week."
              : ""}
            {input.goal === "gsoc" ? " It must belong to a GSoC organisation." : ""}
            {input.goal === "first-pr"
              ? " It must have an available starter issue or a measured merge rate."
              : ""}
            {input.hours <= 5
              ? " With 5 hours a week or less, projects that take over 30 days to merge are left out."
              : ""}{" "}
            Projects measured on at least 20 outside pull requests come first, because a
            perfect record over five is partly luck. Within each group the order is: share
            of outside pull requests answered within 48 hours, then outside merge rate,
            then available starter issues.
          </p>

          {matches.length === 0 ? (
            <p className="text-ink-2 mt-6 max-w-xl text-sm">
              {index.rows.length === 0
                ? "The index is still being prepared. Try again in a little while."
                : "Try a broader stack (a language instead of a framework), or a different goal."}{" "}
              <Link href="/explore" className="link">
                Browse everything
              </Link>
            </p>
          ) : (
            <ol className="mt-8 space-y-5" aria-label="Shortlist">
              {matches.slice(0, SHOWN).map((match, i) => (
                <li key={match.row.id} className="grid gap-4 lg:grid-cols-[22rem_1fr]">
                  <RepoCard row={match.row} />
                  <div className="lg:pt-4">
                    <p className="eyebrow">Pick {i + 1}: why</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {match.reasons.map((reason) => (
                        <li key={reason} className="text-ink-2">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {index.rows.length > 0 ? (
            <p className="text-ink-3 mt-8 text-xs">
              From {index.rows.length.toLocaleString("en-US")} measured repositories.
              Index updated {date(index.generatedAt)}.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
