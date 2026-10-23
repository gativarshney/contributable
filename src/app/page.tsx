import Link from "next/link";
import { GsocMark } from "@/components/data/GsocMark";
import { Closing } from "@/components/home/Closing";
import { Features } from "@/components/home/Features";
import { Field } from "@/components/home/Field";
import { Story } from "@/components/home/Story";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { facet } from "@/lib/explore/query";
import { count, date } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const revalidate = 900;

/** Languages a person would call their stack; markup and build files are left out. */
const NOT_A_STACK = new Set([
  "html",
  "css",
  "scss",
  "shell",
  "makefile",
  "dockerfile",
  "batchfile",
  "tex",
  "jupyter notebook",
  "cmake",
  "powershell",
  "roff",
]);

const EXAMPLES = ["vercel/next.js", "fastify/fastify", "OpenPrinting/cups"];

export default async function HomePage() {
  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  const chips = facet(index.rows, (r) => r.lang, 40)
    .map((f) => f.value.toLowerCase())
    .filter((name) => !NOT_A_STACK.has(name))
    .slice(0, 6);

  return (
    <>
      <Field chips={chips} examples={EXAMPLES}>
        {/* One announcement, and only where the tab bar is not already showing GSoC
            a thumb away: on a phone the headline comes first. */}
        <Link
          href="/gsoc"
          className="gsoc-pill border-hair-strong bg-bg-2/70 hover:border-accent hidden items-center gap-2.5 rounded-full border py-1 pr-4 pl-1.5 text-[13px] backdrop-blur transition-colors lg:inline-flex"
        >
          <GsocMark size={26} />
          <span className="font-medium">Google Summer of Code</span>
          <span className="text-ink-2">
            2027 timeline and {count(GSOC_ORGS.length)} organisations
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <h1 className="display mt-2 max-w-4xl text-[clamp(2.4rem,min(6.6vw,8.6svh),4.75rem)] lg:mt-5">
          Find a project that <em>answers newcomers.</em>
        </h1>
        <p className="text-ink-2 mt-4 max-w-xl text-balance sm:mt-5 sm:text-lg">
          See how fast a project replies to a first pull request and how often it merges
          one.
          {/* Phones keep the line short; the tab bar already names the programme. */}
          <span className="max-sm:hidden">
            {" "}
            Search every Google Summer of Code organisation, or check any repository.
          </span>
        </p>
      </Field>

      <Features rows={index.rows} issues={issues} />

      <Story rows={index.rows} />

      <Closing />

      {index.rows.length > 0 ? (
        <p className="shell text-ink-3 border-hair border-t py-8 text-xs">
          Index updated {date(index.generatedAt)}.{" "}
          <Link href="/methodology" className="link">
            How every figure is calculated
          </Link>
        </p>
      ) : null}
    </>
  );
}
