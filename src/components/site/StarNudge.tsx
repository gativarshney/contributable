"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { REPO_URL } from "@/lib/site";

const DONE_KEY = "contributable:star-nudge";
const PAGES_KEY = "contributable:pages";
/** Pages seen this visit before the card appears: by then the site has done something. */
const AFTER_PAGES = 2;

/**
 * A small card that appears once, after a visitor has used a couple of pages, inviting
 * them to star the repository. Closing it, or clicking through, means never again on
 * this browser. Nothing is sent anywhere.
 */
export function StarNudge() {
  const [open, setOpen] = useState(false);
  // The layout stays mounted between pages, so the path is what marks a new page.
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const pages = Number(sessionStorage.getItem(PAGES_KEY) ?? "0") + 1;
      sessionStorage.setItem(PAGES_KEY, String(pages));
      if (pages < AFTER_PAGES) return;
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    } catch {
      // Storage can be unavailable (private mode); then there is no card.
    }
  }, [pathname]);

  const done = () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      // Nothing to remember without storage; the card just closes.
    }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <aside
      aria-label="Star Contributable on GitHub"
      className="star-nudge border-hair-strong bg-bg-2/95 fixed inset-x-4 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-x-3.5 gap-y-3 rounded-2xl border p-3.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.7)] backdrop-blur-xl sm:gap-4 sm:p-4 lg:bottom-6"
    >
      <span
        className="bg-accent-soft text-accent grid size-9 shrink-0 place-items-center rounded-xl"
        aria-hidden="true"
      >
        <Star />
      </span>
      <p className="min-w-[12rem] flex-1 text-sm">
        <span className="text-ink block font-medium">Finding this useful?</span>
        <span className="text-ink-2 block text-[13px]">
          Star it on GitHub so it&apos;s one click away next time.
        </span>
      </p>
      {/* On a narrow screen the actions take their own line under the text. */}
      <span className="flex shrink-0 items-center gap-1 max-sm:w-full max-sm:justify-end">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          onClick={done}
          className="btn h-9 shrink-0 px-3.5 text-[13px]"
        >
          Star on GitHub
        </a>
        <button
          type="button"
          onClick={done}
          aria-label="Close"
          className="text-ink-3 hover:text-ink grid size-8 shrink-0 place-items-center rounded-full transition-colors"
        >
          ×
        </button>
      </span>
    </aside>
  );
}

export function Star({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    </svg>
  );
}
