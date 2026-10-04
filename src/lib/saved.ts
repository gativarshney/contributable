/**
 * The visitor's saved repositories. Kept in this browser only: there is no account,
 * and nothing is sent anywhere except the list of names needed to show their figures.
 */
const KEY = "contributable:saved";
const EVENT = "contributable:saved";
export const MAX_SAVED = 50;

const valid = (id: unknown): id is string =>
  typeof id === "string" && /^[\w.-]+\/[\w.-]+$/.test(id);

export function readSaved(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(valid).slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

/** Adds or removes a repository. Returns whether it is saved afterwards. */
export function toggleSaved(id: string): boolean {
  const current = readSaved();
  const has = current.some((entry) => entry.toLowerCase() === id.toLowerCase());
  const next = has
    ? current.filter((entry) => entry.toLowerCase() !== id.toLowerCase())
    : [id, ...current].slice(0, MAX_SAVED);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); the button still reflects the tap.
  }
  window.dispatchEvent(new Event(EVENT));
  return !has;
}

/** For useSyncExternalStore: notifies on changes in this tab and in others. */
export function subscribeSaved(notify: () => void): () => void {
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

/** A stable snapshot string, so React can compare it between renders. */
export const savedSnapshot = () => readSaved().join(",");
