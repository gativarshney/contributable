import Link from "next/link";
import { Logo } from "./Logo";

const ICONS = {
  github:
    "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-1.95c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  portfolio:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26Zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.07 16Zm2.95-8H5.07A7.99 7.99 0 0 1 9.4 4.44 15.7 15.7 0 0 0 8.02 8ZM12 19.96A14.1 14.1 0 0 1 10.09 16h3.82A14.1 14.1 0 0 1 12 19.96ZM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4Zm.26 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38Z",
};

const LINKS: { label: string; href: string; icon: keyof typeof ICONS }[] = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gativarshney/",
    icon: "linkedin",
  },
  { label: "GitHub", href: "https://github.com/gativarshney", icon: "github" },
  { label: "Portfolio", href: "https://gativarshney.github.io/", icon: "portfolio" },
];

export function SiteFooter() {
  return (
    <footer className="border-hair border-t">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-ink-2 text-sm">Designed and built by</p>
          <p className="display mt-2 text-[clamp(1.75rem,4vw,2.5rem)]">
            Gati <em>Varshney</em>
          </p>
          <p className="text-ink-2 mt-3 text-sm">
            <a
              href="https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Google Summer of Code 2026 contributor
            </a>{" "}
            at The Linux Foundation
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="border-hair-strong hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={ICONS[link.icon]} />
                  </svg>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-ink-3 flex flex-col gap-3 text-sm md:items-end">
          <Logo className="text-ink" />
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end"
          >
            <Link href="/guide" className="hover:text-ink transition-colors">
              Guide
            </Link>
            <Link href="/about" className="hover:text-ink transition-colors">
              About
            </Link>
            <Link href="/status" className="hover:text-ink transition-colors">
              Status
            </Link>
            <Link href="/methodology" className="hover:text-ink transition-colors">
              How it works
            </Link>
            <a
              href="https://github.com/gativarshney/contributable"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
            >
              Source
            </a>
            <a
              href="https://github.com/gativarshney/contributable/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
            >
              Contribute
            </a>
          </nav>
          <p>
            Open source under the MIT licence. An independent project, not affiliated with
            GitHub or Google.
          </p>
        </div>
      </div>
    </footer>
  );
}
