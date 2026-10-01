import type { Report } from "@/lib/report/run";
import { Block, Notes } from "./Block";
import { Donut, type Segment } from "./charts";
import { fmt } from "./format";

/** A GitHub avatar, or initials when there is no account to show. */
export function Avatar({
  login,
  name,
  real,
  size = 44,
}: {
  login: string | null;
  name: string;
  /** False for the example report, whose people do not exist. */
  real: boolean;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (real && login) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny remote avatars; the image optimizer adds nothing here
      <img
        src={`https://github.com/${login}.png?size=${size * 2}`}
        alt=""
        loading="lazy"
        style={style}
        className="bg-bg-3 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={style}
      className="bg-accent-soft text-accent grid shrink-0 place-items-center rounded-full text-xs font-medium"
    >
      {initials}
    </span>
  );
}

const SLICES = [
  { color: "bg-cat-1", stroke: "var(--cat-1)" },
  { color: "bg-cat-2", stroke: "var(--cat-2)" },
  { color: "bg-cat-3", stroke: "var(--cat-3)" },
  { color: "bg-cat-4", stroke: "var(--cat-4)" },
];

export function People({ report }: { report: Report }) {
  const { contributing, contributors } = report.analysis;
  const real = !report.sample;
  const recent = contributors.windows[90];
  const { responders } = contributing;
  const busiest = Math.max(1, ...responders.map((r) => r.threads));

  const top = recent.distribution.slice(0, 4);
  const rest = recent.humanCommits - top.reduce((sum, p) => sum + p.commits, 0);
  const segments: Segment[] = top.map((person, i) => ({
    label: person.name,
    value: person.commits,
    ...SLICES[i],
  }));
  if (rest > 0) {
    segments.push({
      label: "Everyone else",
      value: rest,
      color: "bg-bg-3",
      stroke: "var(--bg-3)",
    });
  }
  const others = recent.contributors - top.length;

  return (
    <Block
      id="people"
      question="Who will I work with?"
      title={
        responders.length > 0 ? (
          <>
            {responders.length === 1 ? "One maintainer does" : "These maintainers do"}{" "}
            most of the <em>replying to newcomers.</em>
          </>
        ) : (
          <>
            The people <em>behind the code.</em>
          </>
        )
      }
    >
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <div>
          <h3 className="mb-5 font-medium tracking-tight">Maintainers who reply</h3>
          {responders.length > 0 ? (
            <ul className="space-y-5">
              {responders.slice(0, 5).map((person) => {
                const body = (
                  <>
                    <Avatar login={person.login} name={person.login} real={real} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-medium tracking-tight">
                          {person.login}
                        </span>
                        <span className="text-ink-2 shrink-0 text-sm">
                          {person.threads} {person.threads === 1 ? "thread" : "threads"}
                        </span>
                      </span>
                      <span className="bg-bg-3 mt-2 block h-1.5 overflow-hidden rounded-full">
                        <span
                          className="bg-accent block h-full rounded-full"
                          style={{ width: `${(person.threads / busiest) * 100}%` }}
                        />
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={person.login}>
                    {real ? (
                      <a
                        href={`https://github.com/${person.login}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-accent flex items-center gap-4 transition-colors"
                      >
                        {body}
                      </a>
                    ) : (
                      <div className="flex items-center gap-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="card text-ink-2 p-5 text-[15px]">
              We did not see a team member replying to an outside contributor recently.
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-5 font-medium tracking-tight">
            Who wrote the code, last 90 days
          </h3>
          {recent.humanCommits > 0 ? (
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
              <Donut segments={segments} label="Share of commits by author, last 90 days">
                <p>
                  <span className="block text-3xl leading-none font-medium tracking-tight">
                    {fmt(recent.contributors)}
                  </span>
                  <span className="text-ink-2 mt-1 block text-xs">
                    {recent.contributors === 1 ? "person" : "people"}
                  </span>
                </p>
              </Donut>
              <ul className="min-w-0 flex-1 space-y-3">
                {top.map((person, i) => (
                  <li key={person.name} className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-[3px] ${SLICES[i].color}`}
                    />
                    <Avatar
                      login={person.login}
                      name={person.name}
                      real={real}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate">{person.name}</span>
                    <span className="font-medium">{Math.round(person.share)}%</span>
                  </li>
                ))}
                {rest > 0 ? (
                  <li className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className="bg-bg-3 size-2.5 shrink-0 rounded-[3px]"
                    />
                    <span className="text-ink-2 flex-1">
                      {others} other {others === 1 ? "person" : "people"}
                    </span>
                    <span className="font-medium">
                      {Math.round((rest / recent.humanCommits) * 100)}%
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="card text-ink-2 p-5 text-[15px]">
              No commits by people in the last 90 days.
            </p>
          )}
        </div>
      </div>

      <Notes>
        <li>
          Maintainers are owners, organisation members and collaborators, ranked by how
          many issues and pull requests from outside the team they commented on.
        </li>
        <li>
          The chart counts commits on the default branch, bots excluded. A squash merge
          credits whoever merged, so reviewers can look larger than authors.
        </li>
        <li>
          Work that is concentrated in one or two people is common and not a problem by
          itself; it tells you whose attention you will need.
        </li>
      </Notes>
    </Block>
  );
}
