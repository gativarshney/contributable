import { describe, expect, it } from "vitest";
import { pullRequestPolicy } from "./policy";

describe("pullRequestPolicy", () => {
  it("finds a statement that outside pull requests are not reviewed here", () => {
    const readme =
      "## Contributing\n\nWe don't run an inbound review queue on this repo. To contribute a change: **fork the repo**, then email us.";
    expect(pullRequestPolicy([readme])).toBe(
      "We don't run an inbound review queue on this repo.",
    );
  });

  it("finds common wordings", () => {
    for (const text of [
      "We are not accepting pull requests at this time.",
      "This project is no longer accepting contributions.",
      "We do not accept external pull requests.",
      "The project is closed to contributions.",
      "Pull requests will be closed without review.",
      "Contributions are currently paused while we rewrite the core.",
      "Because SQLite is in the public domain, we do not normally accept pull requests.",
    ]) {
      expect(pullRequestPolicy([text]), text).not.toBeNull();
    }
  });

  it("stays quiet on an ordinary contributing guide", () => {
    const guide =
      "We welcome pull requests! Please do not open a pull request without an issue first. Tests must pass. We review contributions weekly.";
    expect(pullRequestPolicy([guide])).toBeNull();
  });

  it("checks every text and keeps Markdown out of the quote", () => {
    expect(
      pullRequestPolicy([
        null,
        "Thanks for looking.",
        "We are **not accepting** [pull requests](x) now.",
      ]),
    ).toBe("We are not accepting pull requests now.");
  });
});
