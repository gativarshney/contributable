import type { RepoDetail } from "@/core/published";
import { duration, inTen } from "@/lib/format";

/**
 * The plain-language summary at the top of a repo page. Every clause restates one
 * measured figure; nothing is weighed or scored.
 */
export function verdict(detail: RepoDetail): string[] {
  const { metrics, facts, trend } = detail;
  const cohort = metrics.outsidePulls.cohort;
  const reply = metrics.pullFirstResponse;
  const lines: string[] = [];

  if (facts.archived)
    lines.push("This repository is archived and no longer accepts changes.");

  if (cohort.mergeRate !== null) {
    lines.push(`Outside PRs: ${inTen(cohort.mergeRate)} merged.`);
  } else if (cohort.n === 0) {
    lines.push("No outside PRs in the last four months.");
  } else {
    lines.push(`Only ${cohort.n} outside PRs in the last four months, too few to rate.`);
  }

  if (reply.medianHours !== null) {
    lines.push(`First reply usually within ${duration(reply.medianHours)}.`);
  } else if (reply.n >= 5) {
    // Enough pull requests, but fewer than half ever got a reply.
    lines.push("More than half of outside PRs got no reply.");
  }

  const available = metrics.starter.counts.available;
  if (available > 0) {
    lines.push(
      `${available} starter ${available === 1 ? "issue is" : "issues are"} available now.`,
    );
  }

  if (trend.flag === "went-quiet") lines.push("No activity in the last four weeks.");
  if (trend.flag === "got-faster") lines.push("Replies got faster this month.");
  if (trend.flag === "slowed-down") lines.push("Replies slowed down this month.");

  return lines;
}

/** One line for link previews and search results. */
export function verdictLine(detail: RepoDetail): string {
  return verdict(detail).slice(0, 3).join(" ");
}
