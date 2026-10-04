"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGES: [label: string, href: string, keys?: string][] = [
  ["Home", "/", "g h"],
  ["Explore repositories", "/explore", "g e"],
  ["GSoC organisations", "/gsoc", "g g"],
  ["Available first issues", "/issues", "g i"],
  ["Find my project", "/match", "g m"],
  ["Check any repository", "/check", "g r"],
  ["Saved repositories", "/saved", "g s"],
  ["Compare repositories", "/compare", "g c"],
  ["Guide: how to pick an organisation", "/guide"],
  ["Methodology", "/methodology"],
  ["Status", "/status"],
  ["About", "/about"],
];

const REPO = /^[\w.-]+\/[\w.-]+$/;

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
 * opens a repository by owner/name. "g" then a letter goes straight to a page.
 */
export function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo<Item[]>(() => {
    const q = text.trim().toLowerCase();
    const pages = PAGES.filter(([label]) => label.toLowerCase().includes(q)).map(
      ([label, href, keys]) => ({ label, href, hint: keys }),
    );
    if (!q) return pages;
    const cleaned = text
      .trim()
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\/+$/, "");
    return [
      ...(REPO.test(cleaned)
        ? [{ label: `Open ${cleaned}`, href: `/repo/${cleaned}`, hint: "repository" }]
        : []),
      ...pages,
      {
        label: `Search repositories for "${text.trim()}"`,
        href: `/explore?q=${encodeURIComponent(text.trim())}`,
      },
      {
        label: `Search issues for "${text.trim()}"`,
        href: `/issues?q=${encodeURIComponent(text.trim())}`,
      },
    ];
  }, [text]);

  useEffect(() => {
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    const open = () => {
      if (dialog.current?.open) return;
      setText("");
      setActive(0);
      dialog.current?.showModal();
      input.current?.focus();
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
      if (pending) {
        pending = false;
        const page = PAGES.find(([, , keys]) => keys === `g ${event.key.toLowerCase()}`);
        if (page) router.push(page[1]);
        return;
      }
      if (event.key === "g") {
        pending = true;
        clearTimeout(timer);
        timer = setTimeout(() => (pending = false), 1200);
      }
    };
    const onOpen = () => open();
    document.addEventListener("keydown", onKey);
    document.addEventListener("palette:open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("palette:open", onOpen);
      clearTimeout(timer);
    };
  }, [router]);

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
          Enter to open. Esc to close. Press / or Ctrl K anywhere.
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
      className="border-hair-strong text-ink-2 hover:text-ink inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors"
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
      <kbd className="num hidden text-xs sm:inline">Ctrl K</kbd>
    </button>
  );
}
