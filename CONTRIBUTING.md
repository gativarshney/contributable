# Contributing to Contributable

Thanks for looking. Contributable tells people what to expect before they contribute to a
project, so this one tries to be easy to contribute to.

## Getting set up

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/gativarshney/contributable.git
cd contributable
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
universe/           the GSoC organisations and the opt-out list
pipeline/           the scheduled job that fetches, computes and publishes the index
src/core/           pure logic shared by the job and the site: metrics, states, trends
src/lib/            site logic: explore query, GSoC ranking, matching, formatting
src/lib/analysis/   the on-the-spot report for repositories outside the index
src/app/            pages, API routes, badges, feeds and share images
src/components/     the interface
```

## What makes a change easy to merge

- **Calculations stay pure.** Anything in `src/core` and `src/lib/analysis` takes data and a `now`, and
  returns data. That is what keeps reports deterministic and the tests simple.
- **Every figure is traceable.** If the report shows a number, the "How this is worked
  out" note for that section should say where it comes from and what it cannot tell you.
- **Partial data never becomes a no.** Lists from GitHub can be cut short. A count from a
  partial list is a lower bound: it may prove a yes, never a no. See
  `src/lib/insights/checklist.ts`.
- **No score, no generated text.** Contributable reports measurements and fixed rules. A
  change that adds a blended score or model-written prose will not be merged.
- **Mind the request budget.** The index runs on a free hourly allowance. If your change
  makes a refresh fetch more, say so in the pull request and explain why it is worth it.
- **Nothing per person.** Figures describe a repository. A change that shows, ranks or
  times an individual maintainer will not be merged.
- **Tests come with the change.** New rules and calculations need tests, including the
  empty and the truncated case.

## Good places to start

Issues labelled `good first issue` are scoped to be done without knowing the whole
codebase. If you want one, say so on the issue so two people do not do the same work. For
anything larger, open an issue to talk it through before writing much code.

## Updating the GSoC timeline

The GSoC page shows the next programme's timeline from `src/lib/gsoc-timeline.ts`. Until
Google publishes the official calendar the dates are expected ones, based on the last
programme. When the official dates are out, replace the dates and set `official: true`;
the page then labels them as official.

## Reporting a wrong number

If a report disagrees with what you see on GitHub, that is the most useful bug there is.
Open an issue with the repository, the figure Contributable showed, and what GitHub shows.

## Conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licence

By contributing you agree that your contribution is released under the
[GNU AGPL-3.0 licence](LICENSE), with the additional terms in [NOTICE](NOTICE), that
covers the project.
