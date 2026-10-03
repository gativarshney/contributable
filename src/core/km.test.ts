import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { kaplanMeier, median, quantile, shareWithin, survivalAt, type Observation } from "./km";

const observation = fc.record({
  hours: fc.double({ min: 0, max: 5000, noNaN: true }),
  observed: fc.boolean(),
});
const observations = fc.array(observation, { maxLength: 200 });

describe("kaplanMeier", () => {
  it("matches a hand-worked example", () => {
    // Six pull requests: replies at 1h, 3h, 3h, 10h; two still waiting at 2h and 8h.
    const curve = kaplanMeier([
      { hours: 1, observed: true },
      { hours: 2, observed: false },
      { hours: 3, observed: true },
      { hours: 3, observed: true },
      { hours: 8, observed: false },
      { hours: 10, observed: true },
    ]);
    expect(curve.n).toBe(6);
    expect(curve.events).toBe(4);
    expect(curve.censored).toBe(2);
    // S(1) = 5/6, S(3) = 5/6 * 2/4, S(10) = 0
    expect(curve.steps.map((s) => s.hours)).toEqual([1, 3, 10]);
    expect(curve.steps[0].survival).toBeCloseTo(5 / 6, 10);
    expect(curve.steps[1].survival).toBeCloseTo(5 / 12, 10);
    expect(curve.steps[2].survival).toBeCloseTo(0, 10);
    expect(median(curve)).toBe(3);
    expect(quantile(curve, 0.75)).toBe(10);
    expect(shareWithin(curve, 2.5)).toBeCloseTo(1 / 6, 10);
  });

  it("returns no median when most items are still waiting", () => {
    const curve = kaplanMeier([
      { hours: 1, observed: true },
      { hours: 50, observed: false },
      { hours: 60, observed: false },
      { hours: 70, observed: false },
    ]);
    expect(median(curve)).toBeNull();
    expect(shareWithin(curve, 48)).toBeCloseTo(0.25, 10);
  });

  it("equals the plain median when nothing is censored", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 99 }),
        (hours) => {
          const curve = kaplanMeier(hours.map((h) => ({ hours: h, observed: true })));
          const sorted = [...hours].sort((a, b) => a - b);
          // Smallest t where at least half have had the event.
          const expected = sorted[Math.ceil(sorted.length / 2) - 1];
          expect(median(curve)).toBe(expected);
        },
      ),
    );
  });

  it("keeps survival within [0, 1] and never increasing", () => {
    fc.assert(
      fc.property(observations, (items) => {
        const curve = kaplanMeier(items);
        let previous = 1;
        for (const step of curve.steps) {
          expect(step.survival).toBeGreaterThanOrEqual(0);
          expect(step.survival).toBeLessThanOrEqual(previous + 1e-12);
          previous = step.survival;
        }
      }),
    );
  });

  it("does not depend on input order", () => {
    fc.assert(
      fc.property(observations, (items) => {
        const forward = kaplanMeier(items);
        const backward = kaplanMeier([...items].reverse());
        expect(backward.steps.length).toBe(forward.steps.length);
        backward.steps.forEach((step, i) => {
          expect(step.hours).toBe(forward.steps[i].hours);
          expect(step.survival).toBeCloseTo(forward.steps[i].survival, 10);
        });
      }),
    );
  });

  it("never looks faster when waiting items are kept than when they are dropped", () => {
    fc.assert(
      fc.property(observations, fc.double({ min: 0, max: 5000, noNaN: true }), (items, at) => {
        const withCensored = kaplanMeier(items);
        const dropped = kaplanMeier(items.filter((o) => o.observed));
        expect(shareWithin(withCensored, at)).toBeLessThanOrEqual(
          shareWithin(dropped, at) + 1e-9,
        );
      }),
    );
  });

  it("counts every valid observation exactly once", () => {
    fc.assert(
      fc.property(observations, (items: Observation[]) => {
        const curve = kaplanMeier(items);
        expect(curve.events + curve.censored).toBe(items.length);
        expect(curve.steps.reduce((sum, s) => sum + s.events, 0)).toBe(curve.events);
        expect(survivalAt(curve, -1)).toBe(1);
      }),
    );
  });
});
