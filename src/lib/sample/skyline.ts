/**
 * Deterministic year of daily values for the decorative homepage skyline: quieter
 * weekends, a slow seasonal swell and the occasional burst, like a real repository.
 */
export function buildSkylineValues(weeks = 53, seed = 7): number[] {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const week = Math.floor(i / 7);
    const day = i % 7;
    const weekend = day === 0 || day === 6;
    const season = 0.55 + 0.45 * Math.sin((week / weeks) * Math.PI * 2.4 + 0.8);
    const roll = random();
    if (roll < (weekend ? 0.6 : 0.16)) return 0;
    const burst = random() > 0.93 ? 2.2 : 1;
    return Math.round((1 + roll * 9) * season * burst * (weekend ? 0.5 : 1));
  });
}
