import { describe, expect, it } from "vitest";
import { wrongNumberUrl } from "./report-issue";
import { sharedIds } from "./saved";

describe("sharedIds", () => {
  it("reads repositories from a shared link and drops anything else", () => {
    expect(sharedIds("?ids=vprusso/toqito,organicmaps/organicmaps")).toEqual([
      "vprusso/toqito",
      "organicmaps/organicmaps",
    ]);
    expect(sharedIds("?ids=a/b,,not a repo,a/b,javascript:alert(1)")).toEqual(["a/b"]);
    expect(sharedIds("")).toEqual([]);
  });
});

describe("wrongNumberUrl", () => {
  it("opens a filled-in issue on this project's repository", () => {
    const url = new URL(
      wrongNumberUrl({
        repo: "vprusso/toqito",
        shown: ["First human reply: 6 h (median of 76 outside PRs)"],
        when: "Updated 4 Oct 2026",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://github.com/gativarshney/contributable/issues/new",
    );
    expect(url.searchParams.get("title")).toBe("A figure looks wrong: vprusso/toqito");
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain("https://github.com/vprusso/toqito");
    expect(body).toContain("- First human reply: 6 h (median of 76 outside PRs)");
    expect(body).toContain("Updated 4 Oct 2026");
  });
});
