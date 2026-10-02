# RepoInsight

Know a repository before your first pull request.

RepoInsight is for open source contributors. Paste a public GitHub repository and it
tells you what to expect: where to start, who maintains it, how fast people reply, and
whether pull requests from outside the team actually get merged. Every answer is
calculated from public GitHub data and shows how it was worked out.

Live: https://repoinsight-app.vercel.app

## Why it exists

Deciding whether to contribute somewhere usually means clicking through commits, issues
and pull requests and forming an impression. RepoInsight reads the same public data and
answers the questions a contributor is advised to ask first. It is deliberately not a
chatbot, not a GitHub clone, and it does not produce a "health score".

Research on open source onboarding keeps finding the same obstacles. Each maps to
something a report measures:

| What newcomers run into                                                                      | What the report shows                                                               |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Finding a task to start with is the most cited barrier [1]                                   | Open issues labelled `good first issue` or `help wanted` that nobody is assigned to |
| Slow or missing replies; lengthy reviews predict abandoned pull requests [1][2][3]           | How long community issues and pull requests waited for a first human reply          |
| Uncertainty about whether outside work is accepted; novices are abandoned more often [2]     | What happened to community pull requests, and the median time to merge              |
| Incomplete documentation, observed by 93% of survey respondents; licence clarity matters [4] | Whether a README, contributing guide, code of conduct, licence and templates exist  |

Bots often post the first reply to a pull request [3], so bot comments never count as a
reply.

1. Steinmacher et al., [Barriers Faced by Newcomers to Open Source Projects: A Systematic Review](https://link.springer.com/chapter/10.1007/978-3-642-55128-4_21)
2. Khatoonabadi et al., [On Wasted Contributions: Understanding the Dynamics of Contributor-Abandoned Pull Requests](https://arxiv.org/abs/2110.15447)
3. Hasan et al., [Understanding the Time to First Response in GitHub Pull Requests](https://arxiv.org/abs/2304.08426)
4. GitHub, [Open Source Survey 2017](https://opensourcesurvey.org/2017/)

## What a report contains

Each section answers one question, with one chart and a short note on how it was worked
out.

| Section              | Question                           | Shown as                                                   |
| -------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Checklist            | Should I contribute here?          | Ten yes / no / not-enough-data answers and a ring          |
| Where to start       | Where do I start?                  | Starter issues checked for being really free; hard blocks  |
| Pull request journey | What happens to my pull request?   | Outcomes, the merged pull requests as proof, the queue     |
| People               | Who will I work with?              | Maintainers who reply; a donut of who wrote recent commits |
| Timing               | When will someone see my question? | A week-by-hour heatmap in the viewer's time zone           |
| Codebase             | Is it my kind of project?          | Languages with logos; labels on recent work                |
| Pulse                | Is the project alive?              | Recency of commits, releases and merges; commits per week  |

Also: a progress screen that ticks off each real request group while GitHub is read, an
example report at `/sample` built from made-up data and marked as such, a methodology
page, light and dark themes, and a 3D skyline of daily commits (three.js).

## The checklist

The ten questions follow GitHub's Open Source Guide,
["A checklist before you contribute"](https://opensource.guide/how-to-contribute/#a-checklist-before-you-contribute).
Each has one fixed rule in [`src/lib/insights/checklist.ts`](src/lib/insights/checklist.ts),
printed in the report. The headline is a count of rules that pass. It is not weighted and
it is not a score.

There are three answers, and the third matters: **not enough data is never shown as a
no.** Whether a community is friendly is deliberately not on the list, because it cannot
be measured.

### Partial data: a yes can be proven, a no cannot

Very busy repositories have more history than the reading limit allows. A list cut short
is still exact for the period it covers, and any count taken from it is a lower bound on
the true count. So:

- A rule of the form "at least N" is answered **yes** as soon as the partial count
  reaches N. Fifty community pull requests merged in the three days that could be read
  already proves "at least 3 in 90 days".
- A **no** is only given when the whole period was read.
- Otherwise the answer is **not enough data**.

Figures in the report are then shown for the longest period that was read completely
(90, 30 or 7 days, or less), and labelled with that period. They are exact for it, never
an extrapolation.

## Architecture

```
GitHub REST API
    -> lib/github/client       HTTP, error mapping, pagination headers
    -> lib/github/fetchers     endpoint calls, normalisation, coverage tracking
    -> lib/analysis/*          pure metric calculations (no React, no network)
    -> lib/insights/checklist  rule-based answers derived from the metrics
    -> lib/report/run          orchestration and progress events
    -> app/api/analyze         cache, throttle, NDJSON stream to the browser
    -> components/report       charts and sections
```

```
src/
  app/                      routes, metadata, the analyze route handler
  components/{site,home,report,three}
  lib/github/               parse.ts, client.ts, fetchers.ts
  lib/analysis/             activity, contributors, contributing, issues, releases,
                            rhythm, time
  lib/insights/             checklist.ts
  lib/report/               run.ts, throttle.ts
  lib/sample/               deterministic example dataset
  types/                    normalised data model
```

Analysis functions take structured input plus an explicit `now`, so the same dataset
always gives the same result and every function can be tested alone. `analyzeRepository`
runs wherever `fetch` does, which is what lets the browser take over from the server.

Every list fetched from GitHub carries `complete` and `coveredSince`. That is what makes
the partial-data rules above possible: the code always knows how far back it can speak.

## GitHub data sources

| Data                     | Endpoint                                                    | Requests |
| ------------------------ | ----------------------------------------------------------- | -------- |
| Repository metadata      | `GET /repos/{owner}/{repo}`                                 | 1        |
| Commits (default branch) | `GET /repos/{owner}/{repo}/commits?since=`                  | 1 to N   |
| Releases                 | `GET /repos/{owner}/{repo}/releases`                        | 1        |
| Issues and pull requests | `GET /repos/{owner}/{repo}/issues?state=all&since=`         | 1 to N   |
| Open pull request count  | `GET /repos/{owner}/{repo}/pulls?state=open&per_page=1`     | 1        |
| Conversation comments    | `GET /repos/{owner}/{repo}/issues/comments?since=`          | 1 to N   |
| Inline review comments   | `GET /repos/{owner}/{repo}/pulls/comments?since=`           | 1 to N   |
| Starter issues           | `GET /repos/{owner}/{repo}/issues?labels=`                  | 2        |
| Community files          | `GET /repos/{owner}/{repo}/community/profile`               | 1        |
| Issue template folder    | `GET /repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE` | 0 to 1   |
| Languages                | `GET /repos/{owner}/{repo}/languages`                       | 1        |
| Starter issue history    | `GET /repos/{owner}/{repo}/issues/{n}/timeline`             | 0 to 4   |

N is the page limit: 3 pages (300 items) without a token, 10 pages (1,000 items) with
one. A small repository costs 11 or 12 requests, plus one for each starter issue checked
(four at most). Independent requests run in parallel.

The community profile only reports the old single-file issue template, so when it reports
none the `.github/ISSUE_TEMPLATE` folder is checked directly. Without that, most projects
with modern templates or issue forms would be shown as having none.

## Cost and scaling

RepoInsight costs nothing to run. There is no database, no paid API and no AI service.
The only limit is GitHub's free API allowance, and four things stretch it:

1. **A server token.** With `GITHUB_TOKEN` set, the server gets 5,000 requests an hour
   instead of 60.
2. **A shared cache.** A finished report is stored in the Next.js data cache for an hour
   and served to everyone who asks for the same repository. On Vercel that cache is
   shared between function instances, so a popular project costs GitHub requests once.
   Entries are keyed by deployment, so a new version never reads an old report shape.
3. **The visitor's own allowance.** If the server's allowance runs out, the visitor's
   browser reads GitHub directly. Every visitor has their own 60 requests an hour, so
   this path grows with the audience instead of being divided among it.
4. **A per-address throttle.** One address may start 20 fresh analyses in ten minutes;
   past that it is sent to path 3. The counter is in memory, so it is per instance: it
   blunts a loop, it is not a security boundary.

## How the figures are calculated

Periods are trailing, measured back from the moment the data was read.

- **Community** — an author whose GitHub association with the repository is not owner,
  member or collaborator, and who is not a bot.
- **Pull request outcomes** — community pull requests merged, closed without merging, or
  still open. Merged and closed are counted by when it happened; still open by when it
  was opened.
- **Time to merge** — median of `merged_at - created_at` over community pull requests
  merged in the period.
- **First reply** — for each issue or pull request a community author opened in the
  period: the earliest conversation or inline review comment by another person, or the
  merge, whichever came first. Threads are sorted into within a day, within a week,
  longer, closed with no reply seen, and still waiting.
- **Responsiveness check** — judged only on threads at least two days old, so a thread
  opened an hour ago is not held against anyone.
- **Starter issues** — open issues labelled `good first issue` or `help wanted` with no
  assignee. For the first four, the issue's timeline is read: it **looks free** when no
  open pull request refers to it and nobody outside the team has written that they want
  to take it; otherwise the report says which, and how long ago someone asked.
- **Landed as a commit** — a community pull request that was closed rather than merged,
  where a later commit mentions its number, or a commit within two days of the close is
  by or co-credited to its author. Some projects apply outside work this way; counting
  only merged pull requests would report those as rejections.
- **Outside share of merges** — community pull requests merged, out of all pull requests
  merged by people (bots excluded).
- **Queue** — open pull requests divided by pull requests merged per week.
- **Hard blocks** — a source-available licence (BUSL, Elastic, SSPL, FSL, PolyForm,
  Commons Clause) fails the licence check; a known CLA bot commenting on pull requests
  is flagged.
- **Maintainers who reply** — team members ranked by how many community threads they
  commented on.
- **Who wrote the code** — share of commits on the default branch per author over 90
  days, bots excluded. Commits not linked to an account are grouped by git author name.
- **Timing** — every comment by a team member placed in a half-hour slot of the week
  (UTC), shifted to the viewer's time zone in the browser.
- **Commits per week** — twelve 7-day totals ending now.
- **Release rhythm** — median gap between the publish dates of the most recent releases.
- **Open issues** — `open_issues_count - open pull requests`, because GitHub's count
  includes pull requests.

## Limitations

- Public data only. Private forks, internal trackers and chat are invisible.
- Commit figures cover the default branch only.
- Replies are seen as comments and merges. A review that only approves, without a
  comment, is not read, so some answered pull requests show as "closed, no reply seen".
- Organisation members with private membership cannot be told apart from community
  authors.
- Only GitHub's two default starter labels are checked. Projects with their own labels
  show no starter issues.
- Closed without merging includes withdrawn, duplicate and low-quality submissions.
- "Looks free" matches common phrases for claiming an issue; an unusual wording can be
  missed, and only the first 100 timeline events are read.
- Hidden merges are only seen within the commits that were read, and a commit that
  merely mentions a pull request is counted as landing it.
- Stars, total commits and the raw open-issue count are shown as facts and never used as
  a quality signal.
- Authorship follows GitHub attribution. Squash merges credit whoever merged.
- Projects that publish through tags or a package registry show no GitHub Releases.
- Tone is not measured. Nothing here tells you whether a community is welcoming.
- Activity is not quality. Nothing here measures correctness, security or test coverage.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Requires Node.js 20.9 or newer.

## Environment variables

| Variable               | Required | Purpose                                                                                                               |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`         | No       | Server-side token, no scopes needed. Raises the limit from 60 to 5,000 requests/hour and the page limit from 3 to 10. |
| `NEXT_PUBLIC_SITE_URL` | No       | Canonical URL used for Open Graph metadata.                                                                           |

Copy `.env.example` to `.env.local` to set them. The token is only read on the server and
is never sent to the browser. Users are never asked for one.

## Testing

```bash
npm test
npm run lint
npm run typecheck
```

CI runs formatting, lint, typecheck, tests and a production build on every push
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

- **Unit** — URL parsing, HTTP error mapping, pagination and coverage, every analysis
  function including empty and truncated data, and each checklist rule.
- **Integration** — the analyze route end to end against a stubbed GitHub: input
  rejection, the event stream, a missing repository, a rate limit, a failing source that
  must not sink the report, and the throttle.
- **Pipeline** — `analyzeRepository` with a fake GitHub, asserting the stages, the report
  and the number of requests made.

The browser fallback was checked by hand: with `/api/analyze` forced to answer "rate
limited", a headless browser made the requests to `api.github.com` itself and rendered
the report.

## Deploying to Vercel

1. Import the repository in Vercel. The defaults (Next.js preset, `npm run build`) work.
2. Add `GITHUB_TOKEN` under Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to the production URL.

No database or paid service is needed. The app fits the free tier.

## Contributing

Contributions are welcome. [`CONTRIBUTING.md`](CONTRIBUTING.md) covers setup, where
things live and what makes a change easy to merge. The most useful bug report is a figure
that disagrees with what GitHub shows.

## Roadmap

- Read approving reviews, so pull requests answered only by a review count as answered
- Who actually merges, to show when review depends on one person
- Accounts that file many issues and ask to be assigned each one
- Detect a project's own starter labels instead of only GitHub's defaults
- Tag-based release detection when GitHub Releases are not used
- Shareable, versioned report snapshots

## Author

Built by [Gati Varshney](https://gativarshney.github.io/), a
[Google Summer of Code 2026](https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y)
contributor at OpenPrinting, The Linux Foundation. RepoInsight is an independent project
and is not part of that programme; it grew out of the questions that come up before a
first pull request to an unfamiliar project.

[GitHub](https://github.com/gativarshney) ·
[LinkedIn](https://www.linkedin.com/in/gativarshney/)

## Licence

[MIT](LICENSE) © 2026 Gati Varshney. Use it, change it and deploy it; keep the copyright
notice.
