"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseRepoInput } from "@/lib/github/parse";

const PAGES: [label: string, href: string][] = [
  ["Home", "/"],
  ["Explore repositories", "/explore"],
  ["Google Summer of Code organisations", "/gsoc"],
  ["First issues nobody has taken", "/issues"],
  ["Help me choose a project", "/match"],
  ["Check any repository", "/check"],
  ["Saved repositories", "/saved"],
  ["Compare repositories", "/compare"],
  ["New to open source? Start here", "/start"],
  ["Guide: how to pick an organisation", "/guide"],
  ["Methodology", "/methodology"],
  ["Status", "/status"],
  ["About", "/about"],
];

interface Item {
  label: string;
  href: string;
  hint?: string;
}

const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * Ctrl+K (or Cmd+K, or "/") opens a box that jumps to any page, searches the index or
 * opens a repository by owner/name.
 */
export function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  // GSoC organisations as [name, slug], loaded the first time the box opens.
  const [orgs, setOrgs] = useState<[string, string][]>([]);
  const loaded = useRef(false);

  const items = useMemo<Item[]>(() => {
    const q = text.trim().toLowerCase();
    const pages = PAGES.filter(([label]) => label.toLowerCase().includes(q)).map(
      ([label, href]) => ({ label, href }),
    );
    if (!q) return pages;
    // The same parser as the Check box, so a pasted link or clone command works here too.
    const parsed = text.includes("/") ? parseRepoInput(text) : null;
    const repo = parsed?.ok ? `${parsed.ref.owner}/${parsed.ref.name}` : null;
    const orgMatches = orgs
      .filter(([name, slug]) => name.toLowerCase().includes(q) || slug.includes(q))
      .slice(0, 4)
      .map(([name, slug]) => ({
        label: name,
        href: `/gsoc/${slug}`,
        hint: "GSoC organisation",
      }));
    return [
      ...(repo
        ? [{ label: `Open ${repo}`, href: `/repo/${repo}`, hint: "repository" }]
        : []),
      ...orgMatches,
      ...pages,
      {
        label: `Search repositories for "${text.trim()}"`,
        href: `/explore?q=${encodeURIComponent(text.trim())}`,
      },
      {
        label: `Search issues for "${text.trim()}"`,
        href: `/issues?q=${encodeURIComponent(text.trim())}`,
      },
      {
        label: `Search GSoC organisations for "${text.trim()}"`,
        href: `/gsoc?q=${encodeURIComponent(text.trim())}#organisations`,
      },
    ];
  }, [text, orgs]);

  useEffect(() => {
    const open = () => {
      if (dialog.current?.open) return;
      setText("");
      setActive(0);
      dialog.current?.showModal();
      input.current?.focus();
      if (!loaded.current) {
        loaded.current = true;
        fetch("/api/v1/orgs")
          .then((response) => (response.ok ? response.json() : []))
          .then(setOrgs)
          .catch(() => {
            loaded.current = false;
          });
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
        return;
      }
      if (typingIn(event.target) || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (event.key === "/") {
        event.preventDefault();
        open();
        return;
      }
    };
    const onOpen = () => open();
    document.addEventListener("keydown", onKey);
    document.addEventListener("palette:open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("palette:open", onOpen);
    };
  }, []);

  const go = (item: Item | undefined) => {
    if (!item) return;
    dialog.current?.close();
    router.push(item.href);
  };

  return (
    <dialog
      ref={dialog}
      aria-label="Jump to"
      className="palette"
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close();
      }}
    >
      <div className="p-2">
        <input
          ref={input}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(items.length - 1, i + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(items[active]);
            }
          }}
          placeholder="Jump to a page, search, or type owner/name"
          className="placeholder:text-ink-3 h-12 w-full bg-transparent px-3 text-base outline-none"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `palette-${active}` : undefined}
          aria-label="Jump to a page, search, or type owner/name"
          autoComplete="off"
          spellCheck={false}
        />
        <ul
          id="palette-list"
          role="listbox"
          className="border-hair max-h-[50svh] overflow-y-auto border-t pt-2"
        >
          {items.map((item, i) => (
            <li
              key={item.href}
              id={`palette-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 text-sm ${
                i === active ? "bg-bg-3" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
            >
              <span>{item.label}</span>
              {item.hint ? (
                <kbd className="text-ink-3 num text-xs">{item.hint}</kbd>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-ink-3 border-hair mt-2 border-t px-3 pt-2 pb-1 text-xs">
          Enter to open. Esc to close.
        </p>
      </div>
    </dialog>
  );
}

/** The header button that opens the palette, for people who do not use shortcuts. */
export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new Event("palette:open"))}
      className="border-hair-strong text-ink-2 hover:text-ink inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors"
      aria-label="Search and jump to a page"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="m10.5 10.5 3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <kbd className="num hidden text-xs whitespace-nowrap sm:inline">Ctrl K</kbd>
    </button>
  );
}
