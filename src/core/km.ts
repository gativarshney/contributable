/**
 * Kaplan-Meier estimator for "time until something happens" when some items have not
 * had it happen yet. An unanswered pull request is not dropped: it stays in the risk
 * set until the moment we stopped watching it, which is what keeps slow repositories
 * from looking fast.
 */

export interface Observation {
  /** Hours from the start until the event, or until we stopped watching. */
  hours: number;
  /** True when the event happened; false when the item is still waiting (censored). */
  observed: boolean;
}

export interface SurvivalStep {
  hours: number;
  /** Estimated share still waiting just after this time. */
  survival: number;
  atRisk: number;
  events: number;
}

export interface SurvivalCurve {
  n: number;
  events: number;
  censored: number;
  steps: SurvivalStep[];
}

export function kaplanMeier(observations: readonly Observation[]): SurvivalCurve {
  const clean = observations.filter((o) => Number.isFinite(o.hours) && o.hours >= 0);
  // At a tied time, events are counted before censored items leave the risk set.
  const sorted = [...clean].sort(
    (a, b) => a.hours - b.hours || Number(b.observed) - Number(a.observed),
  );

  const steps: SurvivalStep[] = [];
  let survival = 1;
  let atRisk = sorted.length;
  let index = 0;

  while (index < sorted.length) {
    const hours = sorted[index].hours;
    let events = 0;
    let leaving = 0;
    while (index < sorted.length && sorted[index].hours === hours) {
      if (sorted[index].observed) events += 1;
      leaving += 1;
      index += 1;
    }
    if (events > 0) {
      survival *= 1 - events / atRisk;
      steps.push({ hours, survival, atRisk, events });
    }
    atRisk -= leaving;
  }

  const events = clean.filter((o) => o.observed).length;
  return { n: clean.length, events, censored: clean.length - events, steps };
}

/** Estimated share still waiting after `hours`. */
export function survivalAt(curve: SurvivalCurve, hours: number): number {
  let survival = 1;
  for (const step of curve.steps) {
    if (step.hours > hours) break;
    survival = step.survival;
  }
  return survival;
}

/** Estimated share for which the event happened within `hours`. */
export function shareWithin(curve: SurvivalCurve, hours: number): number {
  return 1 - survivalAt(curve, hours);
}

/**
 * The time by which the given share has had the event, or null when the curve never
 * gets there (too many items still waiting to say).
 */
export function quantile(curve: SurvivalCurve, share: number): number | null {
  const target = 1 - share;
  for (const step of curve.steps) {
    if (step.survival <= target + 1e-12) return step.hours;
  }
  return null;
}

export const median = (curve: SurvivalCurve) => quantile(curve, 0.5);
