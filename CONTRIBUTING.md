# Contributing to RepoInsight

Thanks for looking. RepoInsight tells people what to expect before they contribute to a
project, so this one tries to be easy to contribute to.

## Getting set up

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/gativarshney/repoinsight.git
cd repoinsight
npm install
npm run dev
```

Open http://localhost:3000. No environment variables are required. Without a
`GITHUB_TOKEN` the app uses GitHub's unauthenticated limit of 60 requests an hour, which
is enough for a handful of reports. To raise it, copy `.env.example` to `.env.local` and
add a token with no scopes.

## Before you open a pull request

Run what CI runs:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run format` fixes formatting. Pull requests target `main`.

## Where things live

```
src/lib/github/     talking to GitHub: client, fetchers, text heuristics
src/lib/analysis/   pure calculations, no React and no network
src/lib/insights/   the checklist rules
src/lib/report/     the pipeline and the request throttle
src/components/     the interface
```

## What makes a change easy to merge

- **Calculations stay pure.** Anything in `src/lib/analysis` takes data and a `now`, and
  returns data. That is what keeps reports deterministic and the tests simple.
- **Every figure is traceable.** If the report shows a number, the "How this is worked
  out" note for that section should say where it comes from and what it cannot tell you.
- **Partial data never becomes a no.** Lists from GitHub can be cut short. A count from a
  partial list is a lower bound: it may prove a yes, never a no. See
  `src/lib/insights/checklist.ts`.
- **No score, no generated text.** RepoInsight reports measurements and fixed rules. A
  change that adds a blended score or model-written prose will not be merged.
- **Mind the request budget.** A report costs about a dozen GitHub requests. If your
  change adds one, say so in the pull request and explain why it is worth it.
- **Tests come with the change.** New rules and calculations need tests, including the
  empty and the truncated case.

## Good places to start

Issues labelled `good first issue` are scoped to be done without knowing the whole
codebase. If you want one, say so on the issue so two people do not do the same work. The
[roadmap in the README](README.md#roadmap) lists larger ideas; open an issue to talk one
through before writing much code.

## Reporting a wrong number

If a report disagrees with what you see on GitHub, that is the most useful bug there is.
Open an issue with the repository, the figure RepoInsight showed, and what GitHub shows.

## Conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licence

By contributing you agree that your contribution is released under the
[MIT licence](LICENSE) that covers the project.
