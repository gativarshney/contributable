"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const REPO = "https://github.com/gativarshney/contributable";

/** Every page on the site, grouped by what a visitor came to do. */
const GROUPS: { title: string; links: [label: string, note: string, href: string][] }[] =
  [
    {
      title: "Find a project",
      links: [
        ["Explore", "Search every measured repository", "/explore"],
        ["Google Summer of Code", "Organisations ranked by who answers", "/gsoc"],
        ["Help me choose", "Your stack in, a shortlist out", "/match"],
        ["Compare", "Two to four repositories side by side", "/compare"],
      ],
    },
    {
      title: "Check and keep",
      links: [
        ["Check a repo", "Any public GitHub repository", "/check"],
        ["Saved", "Your shortlist, kept current", "/saved"],
        ["Example report", "What a full report looks like", "/sample"],
      ],
    },
    {
      title: "Get started",
      links: [
        ["Start here", "Your first pull request in five steps", "/start"],
        ["First issues", "Issues nobody has taken yet", "/issues"],
        ["How to pick", "One rule and a checklist", "/guide"],
      ],
    },
    {
      title: "About the project",
      links: [
        ["About", "Who built it and why", "/about"],
        ["Methodology", "How every figure is calculated", "/methodology"],
        ["Status", "How fresh the data is", "/status"],
        ["Source code", "Open source on GitHub", REPO],
        ["Contribute", "Help build Contributable", `${REPO}/blob/main/CONTRIBUTING.md`],
      ],
    },
  ];

/** The header's menu button and the panel it opens, listing every page. */
export function Menu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Opening a page closes the menu.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Open the menu of all pages"
        className="menu-button border-accent/60 bg-accent-soft/50 text-accent hover:bg-accent hover:text-accent-ink inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium shadow-[0_0_0_4px_var(--glow)] transition-colors duration-200"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Menu
      </button>

      <dialog
        ref={dialog}
        aria-label="All pages"
        className="menu-panel"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="shell py-6 md:py-10">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Everything on Contributable</p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close the menu"
              className="border-hair-strong text-ink-2 hover:text-ink grid size-10 cursor-pointer place-items-center rounded-full border transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav
            aria-label="All pages"
            className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
          >
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="eyebrow !text-accent">{group.title}</h2>
                <ul className="mt-4 space-y-1">
                  {group.links.map(([label, note, href]) => {
                    const external = href.startsWith("http");
                    const current = !external && pathname === href;
                    const className = `group -mx-3 block rounded-xl px-3 py-2.5 transition-colors ${
                      current ? "bg-bg-3" : "hover:bg-bg-2"
                    }`;
                    const inner = (
                      <>
                        <span className="flex items-center justify-between gap-3 font-medium">
                          {label}
                          <span
                            className="text-ink-3 group-hover:text-accent transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          >
                            {external ? "↗" : "→"}
                          </span>
                        </span>
                        <span className="text-ink-3 mt-0.5 block text-sm">{note}</span>
                      </>
                    );
                    return (
                      <li key={href}>
                        {external ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={className}
                          >
                            {inner}
                          </a>
                        ) : (
                          <Link
                            href={href}
                            aria-current={current ? "page" : undefined}
                            className={className}
                            onClick={() => dialog.current?.close()}
                          >
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
