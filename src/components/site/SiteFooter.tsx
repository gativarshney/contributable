import Link from "next/link";
import { GsocMark } from "@/components/data/GsocMark";
import { Logo } from "./Logo";

const ICONS = {
  github:
    "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-1.95c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  portfolio:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26Zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.07 16Zm2.95-8H5.07A7.99 7.99 0 0 1 9.4 4.44 15.7 15.7 0 0 0 8.02 8ZM12 19.96A14.1 14.1 0 0 1 10.09 16h3.82A14.1 14.1 0 0 1 12 19.96ZM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4Zm.26 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38Z",
};

const SOCIAL: { label: string; href: string; icon: keyof typeof ICONS }[] = [
  { label: "GitHub", href: "https://github.com/gativarshney", icon: "github" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gativarshney/",
    icon: "linkedin",
  },
  { label: "Portfolio", href: "https://gativarshney.github.io/", icon: "portfolio" },
];

const REPO = "https://github.com/gativarshney/contributable";

/** The same three sections as the header, plus the pages about the project itself. */
const COLUMNS: { title: string; links: [label: string, href: string][] }[] = [
  {
    title: "Find",
    links: [
      ["Repositories", "/explore"],
      ["GSoC organisations", "/gsoc"],
      ["Help me choose", "/match"],
      ["Compare", "/compare"],
    ],
  },
  {
    title: "Check",
    links: [
      ["Check a repo", "/check"],
      ["Example report", "/sample"],
      ["Saved", "/saved"],
    ],
  },
  {
    title: "Start",
    links: [
      ["Start here", "/start"],
      ["First issues", "/issues"],
      ["How to pick", "/guide"],
    ],
  },
  {
    title: "Project",
    links: [
      ["About", "/about"],
      ["Methodology", "/methodology"],
      ["Status", "/status"],
      ["Source code", REPO],
      ["Contribute", `${REPO}/blob/main/CONTRIBUTING.md`],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-hair border-t">
      <div className="shell py-14 md:py-16">
        <div className="card hero-glow-card mb-14 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://github.com/gativarshney.png?size=112"
              alt=""
              width={52}
              height={52}
              loading="lazy"
              decoding="async"
              className="border-hair-strong size-[52px] rounded-full border object-cover"
            />
            <div>
              <p className="text-ink-3 text-xs">Built by</p>
              <a
                href="https://gativarshney.github.io/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent text-xl font-medium tracking-tight transition-colors"
              >
                Gati Varshney
              </a>
              <a
                href="https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y"
                target="_blank"
                rel="noreferrer"
                className="border-hair-strong text-ink-2 hover:border-accent hover:text-ink mt-2 flex w-fit items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-xs transition-colors"
              >
                <GsocMark size={18} />
                Google Summer of Code 2026 · The Linux Foundation
              </a>
            </div>
          </div>
          <ul className="flex gap-3">
            {SOCIAL.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Gati Varshney on ${link.label}`}
                  className="border-accent/60 bg-accent-soft/40 text-accent hover:bg-accent hover:text-accent-ink grid size-11 place-items-center rounded-full border shadow-[0_0_0_4px_var(--glow)] transition-colors duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-[18px]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={ICONS[link.icon]} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo />
            <p className="text-ink-2 mt-4 max-w-xs text-sm">
              Pick the project that answers newcomers, not the most famous one.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="eyebrow">{column.title}</h2>
                <ul className="mt-4 space-y-1">
                  {column.links.map(([label, href]) => {
                    const external = href.startsWith("http");
                    const Tag = external ? "a" : Link;
                    return (
                      <li key={href}>
                        <Tag
                          href={href}
                          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                          className="text-ink-2 hover:text-ink inline-flex min-h-8 items-center text-sm transition-colors"
                        >
                          {label}
                        </Tag>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="border-hair text-ink-3 mt-12 border-t pt-8 text-xs">
          © 2026 Gati Varshney. Open source under the GNU AGPL-3.0. Data under CC BY 4.0.
          An independent project, not affiliated with GitHub or Google.
        </p>
      </div>
    </footer>
  );
}
