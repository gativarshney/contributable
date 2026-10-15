import Link from "next/link";
import { Star } from "@/components/site/StarNudge";
import { REPO_URL } from "@/lib/site";

const DOORS = [
  {
    href: "/explore",
    label: "Explore",
    text: "Every measured repository, sorted by how fast it replies.",
  },
  {
    href: "/match",
    label: "Help me choose",
    text: "Your stack in, a shortlist with a reason for each pick.",
  },
  {
    href: "/gsoc",
    label: "GSoC organisations",
    text: "Ranked by who answers newcomers, with the 2027 timeline.",
  },
  {
    href: "/issues",
    label: "Free first issues",
    text: "Open, unassigned and unclaimed, checked today.",
  },
  {
    href: "/compare",
    label: "Compare",
    text: "Two to four repositories side by side.",
  },
  {
    href: "/start",
    label: "Start here",
    text: "Your first pull request in five steps.",
  },
] as const;

/** The last thing on the home page: you have seen how it works, now go and use it. */
export function Closing() {
  return (
    <section className="border-hair relative scroll-mt-20 border-t pt-12 pb-20 md:pt-14 md:pb-24">
      <div className="shell">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Now it&apos;s yours</p>
          <h2 className="display mt-5 text-[clamp(2rem,5vw,3.5rem)]">
            You&apos;ve seen how it works. <em>Now use it.</em>
          </h2>
          <p className="text-ink-2 mt-4 text-lg text-balance">
            Free, no sign-in, nothing to install.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/explore" className="btn">
              Explore repositories <span aria-hidden="true">→</span>
            </Link>
            <Link href="/match" className="btn btn-ghost">
              Help me choose
            </Link>
          </div>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOORS.map((door) => (
            <li key={door.href}>
              <Link href={door.href} className="card door group block h-full p-6">
                <p className="flex items-center justify-between gap-4 font-medium">
                  {door.label}
                  <span
                    className="border-hair-strong group-hover:bg-accent group-hover:text-accent-ink group-hover:border-accent grid size-8 shrink-0 place-items-center rounded-full border text-sm transition-colors duration-200"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </p>
                <p className="text-ink-2 mt-2 text-sm">{door.text}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-accent/40 bg-accent-soft/20 mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-2xl border p-5 md:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl"
              aria-hidden="true"
            >
              <Star className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium">Contributable is open source</p>
              <p className="text-ink-2 mt-0.5 text-sm">
                Star it on GitHub so it&apos;s one click away next time.
              </p>
            </div>
          </div>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn shrink-0">
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
