import type { Metadata } from "next";
import Link from "next/link";
import { FourThings } from "@/components/home/Story";
import { RepoInput } from "@/components/site/RepoInput";
import { getIndex } from "@/lib/data";

export const metadata: Metadata = {
  title: "Check any repository",
  description:
    "Paste any public GitHub repository and see what to expect before your first pull request: where to start, who replies, and whether outside work gets merged.",
  alternates: { canonical: "/check" },
};

const EXAMPLES = [
  "vercel/next.js",
  "fastify/fastify",
  "sindresorhus/ky",
  "OpenPrinting/cups",
];

export const revalidate = 900;

export default async function CheckPage() {
  const index = await getIndex();
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="shell relative flex flex-col items-center pt-[clamp(2.5rem,9svh,7rem)] pb-16 text-center md:pb-24">
          <p className="eyebrow">Check any repository</p>
          <h1 className="display mt-6 max-w-4xl text-[clamp(2.4rem,min(6.6vw,9svh),4.75rem)]">
            Know a repository <em>before your first pull request.</em>
          </h1>
          <p className="text-ink-2 mt-6 max-w-xl text-lg text-balance">
            Paste any public GitHub repository. It is read and measured while you wait,
            whether or not it is in the index.
          </p>
          <div className="mt-9 w-full max-w-xl">
            <RepoInput />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-ink-3 mr-1 text-sm">Try</span>
              {EXAMPLES.map((repo) => (
                <Link
                  key={repo}
                  href={`/repo/${repo}`}
                  className="border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3 inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs transition-colors"
                >
                  {repo}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FourThings rows={index.rows} />

      <section className="pb-20 md:pb-28">
        <div className="shell">
          <div className="flex flex-wrap gap-3">
            <Link href="/repo/OpenPrinting/cups" className="btn btn-ghost">
              See an example report
            </Link>
            <Link href="/methodology" className="btn btn-ghost">
              How every figure is calculated
            </Link>
          </div>
          <p className="text-ink-3 mt-6 text-sm">
            Public data only. No account, nothing stored. A repository already in the
            index opens at once; any other takes about ten seconds.
          </p>
        </div>
      </section>
    </>
  );
}
