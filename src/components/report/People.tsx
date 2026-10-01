import type { Report } from "@/lib/report/run";
import { fmt, Unavailable } from "./primitives";

/** A GitHub avatar, or initials when there is no account to show. */
export function Avatar({
  login,
  name,
  real,
  size = 40,
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
      className="bg-accent-soft text-accent grid shrink-0 place-items-center rounded-full font-mono text-xs"
    >
      {initials}
    </span>
  );
}

function Person({
  login,
  name,
  real,
  detail,
  share,
}: {
  login: string | null;
  name: string;
  real: boolean;
  detail: string;
  share?: number;
}) {
  const content = (
    <>
      <Avatar login={login} name={name} real={real} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium tracking-tight">{name}</span>
        <span className="text-ink-2 block text-sm">{detail}</span>
        {share !== undefined ? (
          <span className="bg-bg-3 mt-2 block h-1 overflow-hidden rounded-full">
            <span
              className="bg-accent block h-full rounded-full"
              style={{ width: `${Math.max(2, share)}%` }}
            />
          </span>
        ) : null}
      </span>
    </>
  );
  const className =
    "flex items-center gap-4 rounded-xl p-3 -mx-3 transition-colors duration-200";
  return (
    <li>
      {real && login ? (
        <a
          href={`https://github.com/${login}`}
          target="_blank"
          rel="noreferrer"
          className={`${className} hover:bg-bg-2`}
        >
          {content}
        </a>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

export function People({ report }: { report: Report }) {
  const { contributing, contributors } = report.analysis;
  const real = !report.sample;
  const recent = contributors.windows[90];
  const { responders } = contributing;
  const allTime = contributors.allTime.top;

  return (
    <section id="people" className="border-hair border-t py-14 md:py-20">
      <p className="eyebrow !text-accent">People</p>
      <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">
        Who you will <em>work with</em>
      </h2>
      <p className="text-ink-2 mt-3 max-w-2xl">
        The maintainers who answer outside contributors, and the people writing most of
        the code right now.
      </p>

      <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-2">
        <div>
          <h3 className="eyebrow border-hair border-b pb-3">Maintainers who reply</h3>
          {responders.length > 0 ? (
            <ul className="mt-3">
              {responders.map((person) => (
                <Person
                  key={person.login}
                  login={person.login}
                  name={person.login}
                  real={real}
                  detail={`Replied on ${person.threads} community thread${person.threads === 1 ? "" : "s"} · ${fmt(person.replies)} comment${person.replies === 1 ? "" : "s"}`}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <Unavailable>
                No team member was seen replying on a community thread in the observed
                period.
              </Unavailable>
            </div>
          )}
          <p className="text-ink-3 mt-4 text-xs">
            Owners, organisation members and collaborators, ranked by the community issues
            and pull requests they commented on. Members with private membership are not
            recognised as team.
          </p>
        </div>

        <div>
          <h3 className="eyebrow border-hair border-b pb-3">
            Most active in the last 90 days
          </h3>
          {recent.distribution.length > 0 ? (
            <ul className="mt-3">
              {recent.distribution.slice(0, 6).map((person) => (
                <Person
                  key={person.name}
                  login={person.login}
                  name={person.name}
                  real={real}
                  detail={`${fmt(person.commits)} commit${person.commits === 1 ? "" : "s"} · ${person.share}%`}
                  share={person.share}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <Unavailable>No human-authored commits in the last 90 days.</Unavailable>
            </div>
          )}
          <p className="text-ink-3 mt-4 text-xs">
            Commit authors on the default branch, bots excluded
            {recent.covered ? "" : "; the busiest repositories are only partly covered"}.
          </p>
        </div>
      </div>

      {allTime.length > 0 ? (
        <div className="border-hair mt-12 border-t pt-6">
          <h3 className="eyebrow">All-time top contributors</h3>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
            {allTime.map((person) => {
              const body = (
                <>
                  <Avatar
                    login={person.login}
                    name={person.login}
                    real={real}
                    size={32}
                  />
                  <span className="text-sm">
                    <span className="block leading-tight font-medium">
                      {person.login}
                    </span>
                    <span className="text-ink-3 block font-mono text-[11px]">
                      {fmt(person.contributions)} commits
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
                      className="hover:text-accent flex items-center gap-3 transition-colors"
                    >
                      {body}
                    </a>
                  ) : (
                    <span className="flex items-center gap-3">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
