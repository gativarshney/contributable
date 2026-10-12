import { describe, expect, it } from "vitest";
import {
  githubLogin,
  problemFromResponse,
  problemMessage,
  stackFromRepos,
} from "./github-stack";

const repo = (language: string | null, fork = false) => ({ language, fork });

describe("stackFromRepos", () => {
  it("counts only the person's own repositories, most used first", () => {
    const repos = [
      repo("Go", true),
      repo("Go", true),
      repo("Go", true),
      repo("Python"),
      repo("Python"),
      repo("TypeScript"),
      repo(null),
    ];
    expect(stackFromRepos(repos)).toEqual(["python", "typescript"]);
  });

  it("treats notebooks as Python", () => {
    expect(stackFromRepos([repo("Jupyter Notebook"), repo("Jupyter Notebook")])).toEqual([
      "python",
    ]);
    expect(
      stackFromRepos([
        repo("Python"),
        repo("Jupyter Notebook"),
        repo("Rust"),
        repo("Rust"),
      ]),
    ).toEqual(["python", "rust"]);
  });

  it("leaves markup out next to real languages, but keeps it when it is all there is", () => {
    expect(
      stackFromRepos([repo("HTML"), repo("HTML"), repo("CSS"), repo("JavaScript")]),
    ).toEqual(["javascript"]);
    expect(stackFromRepos([repo("HTML"), repo("CSS")])).toEqual(["html", "css"]);
  });

  it("gives nothing when every repository is a fork", () => {
    expect(stackFromRepos([repo("Rust", true)])).toEqual([]);
  });
});

describe("problemFromResponse", () => {
  const now = Date.UTC(2026, 9, 12, 10, 0, 0);
  it("tells a spent allowance apart from other refusals", () => {
    const reset = String(now / 1000 + 25 * 60);
    expect(problemFromResponse(403, "0", reset, now)).toEqual({
      kind: "rate-limited",
      minutes: 25,
    });
    expect(problemFromResponse(429, null, null, now)).toEqual({
      kind: "rate-limited",
      minutes: null,
    });
    expect(problemFromResponse(403, "12", reset, now).kind).toBe("unavailable");
    expect(problemFromResponse(404, null, null, now).kind).toBe("not-found");
    expect(problemFromResponse(500, null, null, now).kind).toBe("unavailable");
  });

  it("says when to try again", () => {
    expect(problemMessage({ kind: "rate-limited", minutes: 25 })).toContain(
      "in about 25 min",
    );
    expect(problemMessage({ kind: "rate-limited", minutes: null })).toContain(
      "in a while",
    );
  });
});

describe("githubLogin", () => {
  it("accepts a name, @name or a pasted profile link", () => {
    expect(githubLogin("  octocat ")).toBe("octocat");
    expect(githubLogin("@octocat")).toBe("octocat");
    expect(githubLogin("https://github.com/octocat")).toBe("octocat");
    expect(githubLogin("github.com/octocat/hello-world")).toBe("octocat");
    expect(githubLogin("https://www.github.com/YASHK-arch?tab=repositories")).toBe(
      "YASHK-arch",
    );
  });

  it("refuses what cannot be a username", () => {
    expect(githubLogin("not a name!")).toBeNull();
    expect(githubLogin("")).toBeNull();
    expect(githubLogin("-starts-with-dash")).toBeNull();
  });
});
