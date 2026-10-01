import { languageLogo } from "@/lib/languages";
import type { Report } from "@/lib/report/run";
import { Block, Notes } from "./Block";

const SLOTS = ["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4"];

function Logo({ name }: { name: string }) {
  const path = languageLogo(name);
  return (
    <span className="bg-bg-3 grid size-11 shrink-0 place-items-center rounded-xl">
      {path ? (
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      ) : (
        <span aria-hidden="true" className="text-ink-2 text-xs font-medium">
          {name.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

export function Codebase({ report }: { report: Report }) {
  const { stack, contributing } = report.analysis;
  const labels = contributing.labels.slice(0, 6);
  if (stack.length === 0 && labels.length === 0) return null;

  const named = stack.filter((l) => l.name !== "Other");
  const main = named[0];
  const busiest = Math.max(1, ...labels.map((l) => l.count));
  const colorOf = (name: string) => {
    const index = named.findIndex((l) => l.name === name);
    return index >= 0 && index < SLOTS.length ? SLOTS[index] : "bg-bg-3";
  };

  return (
    <Block
      id="codebase"
      question="Is it my kind of project?"
      title={
        main ? (
          <>
            Mostly <em>{main.name}</em>
            {named[1] && named[1].share >= 10 ? (
              <>, with some {named[1].name}.</>
            ) : (
              <>.</>
            )}
          </>
        ) : (
          <>What people are working on.</>
        )
      }
    >
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
        {stack.length > 0 ? (
          <div>
            <div
              className="flex h-4 gap-0.5"
              role="img"
              aria-label={`Languages by share of code: ${stack.map((l) => `${l.name} ${l.share}%`).join(", ")}`}
            >
              {stack.map((language, i) => (
                <span
                  key={language.name}
                  title={`${language.name} ${language.share}%`}
                  style={{ flexGrow: language.share, flexBasis: 0 }}
                  className={`h-full min-w-1 ${colorOf(language.name)} ${
                    i === 0 ? "rounded-l-sm" : ""
                  } ${i === stack.length - 1 ? "rounded-r-sm" : ""}`}
                />
              ))}
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {named.slice(0, 4).map((language) => (
                <li key={language.name} className="flex items-center gap-3.5">
                  <Logo name={language.name} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium tracking-tight">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-[2px] ${colorOf(language.name)}`}
                      />
                      <span className="truncate">{language.name}</span>
                    </span>
                    <span className="text-ink-2 text-sm">
                      {language.share}% of the code
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {labels.length > 0 ? (
          <div>
            <h3 className="mb-5 font-medium tracking-tight">
              What recent issues and pull requests are about
            </h3>
            <ul className="space-y-3.5">
              {labels.map((label) => (
                <li key={label.name}>
                  <span className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="truncate">{label.name}</span>
                    <span className="text-ink-2 shrink-0">{label.count}</span>
                  </span>
                  <span className="bg-bg-3 mt-1.5 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-accent block h-full rounded-full"
                      style={{ width: `${(label.count / busiest) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Notes>
        <li>
          Languages are shares of code by bytes, as GitHub detects them. Generated or
          vendored files can skew the picture.
        </li>
        <li>
          Labels are counted on issues and pull requests opened in the last 90 days, and
          depend on how the project labels its work.
        </li>
      </Notes>
    </Block>
  );
}
