# RepoInsight

Turn a public GitHub repository into an evidence-backed engineering report.

RepoInsight answers one question: _what should I know about this repository before I
depend on it, contribute to it, or start working on it?_ It reads public GitHub data,
calculates deterministic metrics, and shows the evidence behind every number.

> Work in progress. This README grows with the project.

## Stack

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS
- Vitest
- GitHub REST API

## Architecture

```
GitHub API -> GitHub client -> normalized data -> analysis -> evidence + insights -> UI
```

```
src/
  app/          routes, layouts, route handlers
  components/   UI components
  lib/
    github/     API client, URL parsing, normalization
    analysis/   pure metric calculations
    insights/   deterministic findings derived from metrics
    report/     report assembly and evidence
  types/        shared types
```

Analysis code is plain TypeScript with no React or network dependencies, so every
calculation can be tested on its own.

## Local development

```bash
npm install
npm run dev
```

| Script              | Purpose              |
| ------------------- | -------------------- |
| `npm run dev`       | Start the dev server |
| `npm run build`     | Production build     |
| `npm run lint`      | ESLint               |
| `npm run typecheck` | TypeScript, no emit  |
| `npm test`          | Unit tests (Vitest)  |
| `npm run format`    | Format with Prettier |

## Environment variables

See [`.env.example`](.env.example). Everything is optional; the app runs without any
configuration.
