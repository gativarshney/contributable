/** Minimal GitHub GraphQL client that reports what every call cost. */

const ENDPOINT = "https://api.github.com/graphql";

export interface RateState {
  cost: number;
  remaining: number;
  resetAt: string;
}

export interface Budget {
  /** Points spent through this client since it was created. */
  spent: number;
  calls: number;
  last: RateState | null;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly kind: "not-found" | "rate-limited" | "forbidden" | "upstream",
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface GraphQLClient {
  query<T>(query: string, variables: Record<string, unknown>): Promise<T>;
  budget: Budget;
}

interface Options {
  token: string;
  fetchImpl?: typeof fetch;
  /** Called after every response so a sweep can pace itself. */
  onRate?: (rate: RateState) => void | Promise<void>;
  /** Retries for secondary limits and 5xx responses. */
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  userAgent?: string;
}

const RATE_FRAGMENT = "rateLimit { cost remaining resetAt }";

/** Adds the rate limit selection to a query's root, so each call reports its cost. */
export function withRate(query: string): string {
  const close = query.lastIndexOf("}");
  return `${query.slice(0, close)}  ${RATE_FRAGMENT}\n}`;
}

export function createClient(options: Options): GraphQLClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const retries = options.retries ?? 4;
  const budget: Budget = { spent: 0, calls: 0, last: null };

  async function query<T>(text: string, variables: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `bearer ${options.token}`,
          "content-type": "application/json",
          "user-agent": options.userAgent ?? "contributable",
        },
        body: JSON.stringify({ query: withRate(text), variables }),
      });

      const retryAfter = Number(response.headers.get("retry-after")) || null;
      const transient = response.status >= 500 || response.status === 403 || response.status === 429;
      if (transient && attempt < retries) {
        const reset = Number(response.headers.get("x-ratelimit-reset"));
        const remaining = response.headers.get("x-ratelimit-remaining");
        if (remaining === "0" && reset) {
          throw new GitHubError("primary rate limit reached", "rate-limited", Math.max(1, reset - Date.now() / 1000));
        }
        const backoff = retryAfter !== null ? retryAfter * 1000 : 2 ** attempt * 2000;
        await sleep(backoff + Math.random() * 1000);
        continue;
      }
      if (response.status === 401) throw new GitHubError("bad credentials", "forbidden");
      if (!response.ok) {
        throw new GitHubError(
          `GitHub responded ${response.status}`,
          transient ? "rate-limited" : "upstream",
          retryAfter,
        );
      }

      const payload = (await response.json()) as {
        data?: (T & { rateLimit?: RateState }) | null;
        errors?: { type?: string; message: string }[];
      };
      budget.calls += 1;
      const rate = payload.data?.rateLimit;
      if (rate) {
        budget.spent += rate.cost;
        budget.last = rate;
        await options.onRate?.(rate);
      }

      if (payload.errors?.length) {
        const first = payload.errors[0];
        if (first.type === "NOT_FOUND") throw new GitHubError(first.message, "not-found");
        if (first.type === "RATE_LIMITED" || first.type === "RATE_LIMIT") {
          throw new GitHubError(first.message, "rate-limited");
        }
        if (first.type === "FORBIDDEN") throw new GitHubError(first.message, "forbidden");
        // A timeout or partial failure: retry, then surface it.
        if (attempt < retries && !payload.data) {
          await sleep(2 ** attempt * 2000 + Math.random() * 1000);
          continue;
        }
        if (!payload.data) throw new GitHubError(first.message, "upstream");
      }
      if (!payload.data) throw new GitHubError("empty response", "upstream");
      return payload.data;
    }
  }

  return { query, budget };
}
