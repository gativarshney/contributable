import {
  PUBLISHED_VERSION,
  type AvailableIssue,
  type IndexRow,
  type RepoDetail,
  type SweepStatus,
} from "@/core/published";

/**
 * The published index lives on the repository's "data" branch. Pages read it through
 * the framework's fetch cache, so a visit never waits on GitHub's API and never spends
 * any of its allowance.
 */
const DATA_BASE =
  process.env.DATA_BASE_URL?.trim() ||
  "https://raw.githubusercontent.com/gativarshney/contributable/data";

/** How long a page may serve a copy before checking for a newer snapshot. */
export const DATA_REVALIDATE_SECONDS = 900;

async function read<T extends { v?: number }>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${DATA_BASE}/${path}`, {
      next: { revalidate: DATA_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as T;
    return body.v === PUBLISHED_VERSION ? body : null;
  } catch {
    return null;
  }
}

export interface IndexFile {
  v: number;
  generatedAt: string;
  rows: IndexRow[];
}

/** Every indexed repository. Empty, never an error, while the index is being built. */
export async function getIndex(): Promise<IndexFile> {
  return (
    (await read<IndexFile>("index.json")) ?? {
      v: PUBLISHED_VERSION,
      generatedAt: new Date(0).toISOString(),
      rows: [],
    }
  );
}

export async function getRepoDetail(
  owner: string,
  name: string,
): Promise<RepoDetail | null> {
  const safe = /^[A-Za-z0-9_.-]+$/;
  if (!safe.test(owner) || !safe.test(name)) return null;
  return read<RepoDetail>(`repos/${owner.toLowerCase()}/${name.toLowerCase()}.json`);
}

export async function getAvailableIssues(): Promise<AvailableIssue[]> {
  const file = await read<{ v: number; issues: AvailableIssue[] }>("issues.json");
  return file?.issues ?? [];
}

export async function getStatus(): Promise<SweepStatus | null> {
  return read<SweepStatus>("status.json");
}
