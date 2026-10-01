export type GitHubErrorCode =
  "not_found" | "rate_limited" | "empty" | "gone" | "too_large" | "unavailable";

export class GitHubError extends Error {
  constructor(
    public readonly code: GitHubErrorCode,
    public readonly status: number,
    /** Unix seconds at which the rate limit resets, when GitHub told us. */
    public readonly resetAt: number | null = null,
  ) {
    super(`GitHub request failed: ${code} (${status})`);
    this.name = "GitHubError";
  }
}

export interface Page<T> {
  data: T;
  hasNext: boolean;
  lastPage: number | null;
}

export interface GitHubClient {
  get<T>(path: string, params?: Record<string, string | number>): Promise<Page<T>>;
  readonly authenticated: boolean;
}

export function parseLinkHeader(header: string | null) {
  if (!header) return { hasNext: false, lastPage: null };
  const last = /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(header);
  return { hasNext: /rel="next"/.test(header), lastPage: last ? Number(last[1]) : null };
}

function toError(res: Response): GitHubError {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = Number(res.headers.get("x-ratelimit-reset")) || null;
  const retryAfter = Number(res.headers.get("retry-after")) || null;
  if (res.status === 429 || (res.status === 403 && (remaining === "0" || retryAfter))) {
    return new GitHubError(
      "rate_limited",
      res.status,
      reset ?? (retryAfter ? Math.ceil(Date.now() / 1000) + retryAfter : null),
    );
  }
  if (res.status === 404 || res.status === 451)
    return new GitHubError("not_found", res.status);
  if (res.status === 409) return new GitHubError("empty", res.status);
  if (res.status === 410) return new GitHubError("gone", res.status);
  // GitHub refuses some list endpoints for very large histories with a plain 403.
  if (res.status === 403) return new GitHubError("too_large", res.status);
  return new GitHubError("unavailable", res.status);
}

export function createGitHubClient(
  options: { token?: string; fetch?: typeof fetch } = {},
): GitHubClient {
  const doFetch = options.fetch ?? fetch;
  const token = options.token?.trim() || undefined;
  // In a browser, sending only the Accept header keeps the request "simple", so no
  // preflight is needed, and the HTTP cache may answer repeat requests for free.
  const inBrowser = typeof window !== "undefined";

  return {
    authenticated: Boolean(token),
    async get<T>(path: string, params: Record<string, string | number> = {}) {
      const url = new URL("https://api.github.com" + path);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
      let res: Response;
      try {
        res = await doFetch(url, {
          headers: {
            Accept: "application/vnd.github+json",
            ...(inBrowser
              ? {}
              : { "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "RepoInsight" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: inBrowser ? "default" : "no-store",
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new GitHubError("unavailable", 0);
      }
      if (!res.ok) throw toError(res);
      try {
        const data = (await res.json()) as T;
        return { data, ...parseLinkHeader(res.headers.get("link")) };
      } catch {
        throw new GitHubError("unavailable", res.status);
      }
    },
  };
}
