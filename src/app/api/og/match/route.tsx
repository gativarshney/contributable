import { getIndex } from "@/lib/data";
import { matchProjects, parseMatch } from "@/lib/match/match";
import { ogCard } from "@/lib/og";

/** Share image for a Find my project result: the stack and the top picks. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const input = parseMatch(params);
  const matches = matchProjects((await getIndex()).rows, input);
  const stack = input.stack.slice(0, 3).join(", ") || "your stack";
  return ogCard({
    eyebrow: "Find my project",
    title: `Projects for ${stack}`,
    stats: [{ value: String(matches.length), label: "projects that fit" }],
    footer: matches.length
      ? `Top picks: ${matches
          .slice(0, 3)
          .map((m) => m.row.id)
          .join(", ")}`
      : "Ordered by how quickly each project answers outside contributors",
  });
}
