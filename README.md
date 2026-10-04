# Contributable

Find an open source project that answers newcomers.

Contributable measures how projects treat people outside their core team: how fast a
person replies to a first pull request, and how often that pull request is merged. It
indexes the repositories of every Google Summer of Code organisation from 2024 to 2026
and refreshes them every hour.

Live: https://contributable.vercel.app

[![First reply](https://contributable.vercel.app/badge/gativarshney/contributable?metric=reply)](https://contributable.vercel.app/repo/gativarshney/contributable)
[![Outside PRs merged](https://contributable.vercel.app/badge/gativarshney/contributable?metric=merge)](https://contributable.vercel.app/repo/gativarshney/contributable)

## Why it exists

New contributors pick the most famous project, open a pull request, and wait. Research
on newcomer onboarding keeps finding the same two obstacles: nobody replies, and it is
hard to find a task that is not already taken [1][2][3]. Stars say nothing about either.
Contributable measures both and lets you search by them.

1. Steinmacher et al., [Barriers Faced by Newcomers to Open Source Projects](https://link.springer.com/chapter/10.1007/978-3-642-55128-4_21)
2. Khatoonabadi et al., [On Wasted Contributions: Understanding the Dynamics of Contributor-Abandoned Pull Requests](https://arxiv.org/abs/2110.15447)
3. Hasan et al., [Understanding the Time to First Response in GitHub Pull Requests](https://arxiv.org/abs/2304.08426)

## Pages

| Page                 | What it does                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| `/`                  | Every measured repository as a point; type your stack to light yours up     |
| `/explore`           | Search and filter the index, as cards or a dense table, with shareable URLs |
| `/repo/owner/name`   | Verdict, figures with evidence, 52-week trend, starter issues, reply hours  |
| `/gsoc`              | GSoC organisations ranked by a stated rule                                  |
| `/gsoc/slug`         | One organisation: pooled figures and the repository to start with           |
| `/issues`            | Starter issues that are actually available, across the index                |
| `/match`             | Stack, level, hours, goal and time zone in; a shortlist with reasons out    |
| `/compare`           | Two to four repositories side by side                                       |
| `/guide`             | How to pick an organisation, with examples from the data                    |
| `/methodology`       | Every definition and where it can be wrong                                  |
| `/status`            | Freshness, coverage and the last refresh                                    |
| `/report/owner/name` | Any public repository, measured on the spot when it is not in the index     |

Press `Ctrl K` or `/` anywhere to jump to a page or open a repository.

## What is measured

All figures describe pull requests opened by people GitHub does not mark as owner,
member or collaborator, and who are not bots.

- **Outside merge rate.** Merged divided by merged plus closed without merging, for pull
  requests opened 30 to 120 days ago. First-time contributors are shown separately.
- **First reply time.** Hours to the first comment or review by a person other than the
  author. Unanswered pull requests stay in the estimate as still waiting, so ignoring
  people makes the figure worse. The estimate is Kaplan-Meier.
- **Time to merge** and **issue first reply**, the same way.
- **Starter issues with their real state**: available, claimed, has a pull request, or
  stale.
- **Reply hours**: when replies arrive, by weekday and hour, for the whole team together.
  Withheld when fewer than three people replied.
- **Trend**: got faster, slowed down or went quiet, from the last four weeks against the
  four before.

Rules every figure follows:

- It shows its sample size, and reads "Not enough data" under 5.
- It links to the pull requests or issues it counted.
- No blended score. Every ranking states its rule on the page.
- No individual is measured. Author names are stored as one-way hashes and nothing is
  published per person.

The full definitions and known weaknesses are on the
[methodology page](https://contributable.vercel.app/methodology).

## Architecture

```
universe/                 the GSoC organisations and the opt-out list
pipeline/                 the hourly job
  universe/               organisations -> repositories worth indexing
  sweep.ts                fetch, compute, publish
src/core/                 pure logic shared by the job and the site
  github/                 GraphQL client and fetcher
  metrics.ts km.ts        merge rate, reply timing, survival estimate
  starter.ts trends.ts    starter issue states, weekly series, trend flags
  published.ts            the shapes written to the data branch
src/lib/                  site logic: explore query, ranking, matching, formatting
src/app/                  pages, API routes, badges, feeds, share images
src/components/           interface
```

The job runs in GitHub Actions and commits its output to the `data` branch as a single
snapshot commit. The site reads those files through the framework's fetch cache. A page
view never calls GitHub and never waits on it.

```
GitHub GraphQL -> sweep (Actions, hourly) -> data branch -> Next.js on Vercel
```

## Cost

Nothing. There is no database, no paid API and no card on file.

- GitHub Actions is free for public repositories, and the job uses the token Actions
  provides. Each run spends that hour's allowance on the stalest repositories and stops
  before the limit.
- A first read of a repository fetches a year of pull requests and issues. Later reads
  fetch only what changed, which is what keeps the whole index inside the allowance.
- The site is static files plus cached reads on Vercel's free tier.

Optional secrets, none required: `SWEEP_GITHUB_TOKEN` (a token with no scopes raises the
hourly allowance five times) and `SWEEP_HASH_KEY` (the key for author hashes).

## Open data and API

Every published file is on the
[`data` branch](https://github.com/gativarshney/contributable/tree/data) under CC BY 4.0.

| Endpoint                            | Returns                                        |
| ----------------------------------- | ---------------------------------------------- |
| `GET /api/v1/repos`                 | The index; same filters and sorting as Explore |
| `GET /api/v1/repos/{owner}/{name}`  | Everything on one repo page                    |
| `GET /api/v1/status`                | Freshness and coverage                         |
| `GET /badge/{owner}/{name}?metric=` | README badge, `reply` or `merge`               |
| `GET /feed/repo/{owner}/{name}`     | Atom feed of a repository's available issues   |
| `GET /feed/issues?lang=&fw=&q=`     | Atom feed for a saved issue search             |

## For maintainers

Add a badge to your README from the "Badge and feed" section of your repo page. If you
would rather not be listed, open an
[opt-out request](https://github.com/gativarshney/contributable/issues/new?template=opt_out.md);
the repository is removed at the next refresh.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Requires Node.js 20.9 or newer. The site reads the published
data branch, so no token is needed to run it.

To run the job yourself:

```bash
SWEEP_GITHUB_TOKEN=<token with no scopes> SWEEP_MAX_REPOS=5 npx tsx pipeline/sweep.ts
```

Output goes to `out/data`. Point the site at it with `DATA_BASE_URL`.

## Testing

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

CI runs those and a production build on every push. The tests cover the survival
estimate, merge and reply metrics, starter issue states, trends, the explore query,
the GSoC ranking rule, matching and repository discovery.

## Contributing

Contributions are welcome. [`CONTRIBUTING.md`](CONTRIBUTING.md) covers setup, where
things live and what makes a change easy to merge. The most useful bug report is a figure
that disagrees with what GitHub shows.

## Author

Built by [Gati Varshney](https://gativarshney.github.io/), a final-year B.Tech CSE
student and
[Google Summer of Code 2026](https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y)
contributor with The Linux Foundation. Contributable is an independent
project and is not affiliated with GitHub or Google.

[GitHub](https://github.com/gativarshney) ·
[LinkedIn](https://www.linkedin.com/in/gativarshney/)

## Licence

Code: [GNU AGPL-3.0](LICENSE) © 2026 Gati Varshney, with the additional terms in
[NOTICE](NOTICE). In short: you may use, study and change it, but if you run a copy as a
website you must publish your full source code under the same licence and keep the
"Built by Gati Varshney" credit visible. Data: CC BY 4.0.
