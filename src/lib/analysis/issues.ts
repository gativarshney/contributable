import { WINDOWS, type Collection, type IssueItem, type WindowDays } from "@/types";
import { daysBetween, inWindow, isCovered, median, observedDays, round } from "./time";

export interface FlowWindow {
  covered: boolean;
  opened: number;
  /** Issues: closed in the window. Pull requests: merged in the window. */
  resolved: number;
  /** Pull requests only: closed in the window without being merged. */
  closedUnmerged: number;
  /** Median days from opening to closing (issues) or merging (pull requests). */
  medianDaysToResolve: number | null;
  authors: number;
}

export interface FlowAnalysis {
  available: boolean;
  note: string | null;
  /** False when the list was truncated; windows before coveredSince are not reported. */
  complete: boolean;
  coveredSince: string | null;
  openNow: number | null;
  lastResolvedAt: string | null;
  windows: Record<WindowDays, FlowWindow>;
  /**
   * Figures for the longest period the data fully covers, up to 30 days. On very busy
   * repositories this is shorter than a week. Null when nothing is covered.
   */
  observed: (FlowWindow & { days: number }) | null;
}

function calculateFlow(
  items: IssueItem[],
  collection: Collection<IssueItem>,
  openNow: number | null,
  now: Date,
  resolvedAt: (item: IssueItem) => string | null,
): FlowAnalysis {
  const ok = collection.status === "ok";

  const windowFor = (days: number): FlowWindow => {
    const opened = items.filter((i) => inWindow(i.createdAt, now, days));
    const resolved = items.filter((i) => inWindow(resolvedAt(i), now, days));
    const med = median(resolved.map((i) => daysBetween(i.createdAt, resolvedAt(i)!)));
    return {
      covered: ok && isCovered(collection.coveredSince, now, days),
      opened: opened.length,
      resolved: resolved.length,
      closedUnmerged: items.filter(
        (i) => i.isPullRequest && !i.mergedAt && inWindow(i.closedAt, now, days),
      ).length,
      medianDaysToResolve: med === null ? null : round(med),
      authors: new Set(opened.map((i) => i.author).filter(Boolean)).size,
    };
  };

  const windows = {} as Record<WindowDays, FlowWindow>;
  for (const days of WINDOWS) windows[days] = windowFor(days);

  // A month is the longest period shown for issue and pull request flow.
  const covered = ok ? observedDays(collection.coveredSince, now) : null;
  const days = covered === null ? null : Math.min(30, covered);

  return {
    available: ok,
    note: collection.note ?? null,
    complete: collection.complete,
    coveredSince: collection.coveredSince,
    openNow,
    lastResolvedAt: items.reduce<string | null>((latest, item) => {
      const at = resolvedAt(item);
      return at && (latest === null || at > latest) ? at : latest;
    }, null),
    windows,
    observed: days === null ? null : { days, ...windowFor(days) },
  };
}

export function calculateIssueSignals(
  collection: Collection<IssueItem>,
  openNow: number | null,
  now: Date,
): FlowAnalysis {
  const issues = collection.items.filter((i) => !i.isPullRequest);
  const flow = calculateFlow(issues, collection, openNow, now, (i) => i.closedAt);
  return collection.note === "issues_disabled" ? { ...flow, available: false } : flow;
}

export function calculatePullRequestSignals(
  collection: Collection<IssueItem>,
  openNow: number | null,
  now: Date,
): FlowAnalysis {
  const pulls = collection.items.filter((i) => i.isPullRequest);
  return calculateFlow(pulls, collection, openNow, now, (i) => i.mergedAt);
}
