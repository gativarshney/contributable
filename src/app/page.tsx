import Link from "next/link";
import { EvidenceCard } from "@/components/home/EvidenceCard";
import { SamplePreview } from "@/components/home/SamplePreview";
import { RepoInput } from "@/components/site/RepoInput";
import { Reveal } from "@/components/site/Reveal";
import { Skyline } from "@/components/three/Skyline";
import { buildSkylineValues } from "@/lib/sample/skyline";

const examples = ["vercel/next.js", "facebook/react", "sindresorhus/ky"];
const skyline = buildSkylineValues();

const layers = [
  ["Observed", "What GitHub returned."],
  ["Calculated", "The formula, written out."],
  ["Interpreted", "What the number suggests."],
  ["Limited", "What it cannot prove."],
];

const signals = [
  ["Activity", "Commits, active days, trend"],
  ["Maintenance", "Time since each kind of work"],
  ["Contributors", "How concentrated the work is"],
  ["Releases", "Latest release and cadence"],
  ["Issues", "Opened, closed, time to close"],
  ["Pull requests", "Opened, merged, time to merge"],
];

export default function HomePage() {
  return (
    <>
      {/* One screen tall, with the 3D skyline resting on its bottom edge. */}
      <section className="relative flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <Skyline
          values={skyline}
          anchor="bottom"
          className="skyline-fade pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(14rem,38svh,26rem)]"
        />
        <div className="shell relative flex flex-col items-center pt-[clamp(2rem,7svh,6rem)] pb-[clamp(10rem,29svh,20rem)] text-center">
          <Link
            href="/sample"
            className="rise border-hair-strong text-ink-2 hover:text-ink bg-bg-2/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
          >
            <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
            Evidence, not scores
            <span className="text-ink-3" aria-hidden="true">
              ·
            </span>
            See an example →
          </Link>
          <h1
            className="display rise mt-7 max-w-4xl text-[clamp(2.5rem,min(7.4vw,10svh),5.25rem)]"
            style={{ animationDelay: "70ms" }}
          >
            Understand a repository <em>before you depend on it.</em>
          </h1>
          <p
            className="text-ink-2 rise mt-6 max-w-xl text-lg text-balance"
            style={{ animationDelay: "140ms" }}
          >
            Paste a public GitHub repository. Get an engineering report where every number
            shows its evidence.
          </p>
          <div className="rise mt-9 w-full max-w-xl" style={{ animationDelay: "210ms" }}>
            <RepoInput />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-ink-3 mr-1 text-sm">Try</span>
              {examples.map((repo) => (
                <Link
                  key={repo}
                  href={`/report/${repo}`}
                  className="border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3 rounded-full border px-3 py-1 font-mono text-xs transition-colors"
                >
                  {repo}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SamplePreview />

      <section className="py-20 md:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="eyebrow">Evidence first</p>
            <h2 className="display mt-5 text-[clamp(2rem,4.6vw,3.25rem)]">
              Every number <em>shows its work.</em>
            </h2>
            <dl className="border-hair mt-10 border-t">
              {layers.map(([term, detail]) => (
                <div
                  key={term}
                  className="border-hair flex items-baseline justify-between gap-6 border-b py-4"
                >
                  <dt className="font-medium">{term}</dt>
                  <dd className="text-ink-2 text-right text-[15px]">{detail}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={120}>
            <EvidenceCard />
          </Reveal>
        </div>
      </section>

      <section className="border-hair border-t py-20 md:py-32">
        <div className="shell">
          <Reveal>
            <p className="eyebrow">What a report covers</p>
            <h2 className="display mt-5 text-[clamp(2rem,4.6vw,3.25rem)]">
              Six signals. <em>No score.</em>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {signals.map(([name, detail], i) => (
                <li
                  key={name}
                  className="card hover:border-hair-strong p-6 transition-colors duration-300"
                >
                  <span className="text-accent font-mono text-xs">0{i + 1}</span>
                  <h3 className="mt-6 text-lg font-medium tracking-tight">{name}</h3>
                  <p className="text-ink-2 mt-1 text-[15px]">{detail}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="border-hair relative overflow-hidden border-t py-24 md:py-36">
        <div className="hero-glow rotate-180" aria-hidden="true" />
        <Reveal className="shell relative flex flex-col items-center text-center">
          <h2 className="display text-[clamp(2.2rem,5.4vw,4rem)]">
            Start with <em>a repository.</em>
          </h2>
          <div className="mt-9 w-full max-w-xl">
            <RepoInput />
          </div>
          <p className="text-ink-3 text-sm">
            Public data only. Nothing stored.{" "}
            <Link href="/methodology" className="link text-ink-2">
              Methodology and limitations
            </Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
