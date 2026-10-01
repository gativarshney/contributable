/**
 * A sliding-window limiter, used to stop one client from draining the GitHub allowance
 * every visitor shares. State is held in memory, so on serverless hosting it is per
 * instance: enough to blunt a loop or a careless script, not a security boundary.
 */
export function createThrottle(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    // Forget idle clients so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [other, times] of hits) {
        if (times.every((at) => now - at >= windowMs)) hits.delete(other);
      }
    }
    return true;
  };
}
