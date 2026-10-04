"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { RepoCard } from "@/components/data/RepoList";
import type { IndexRow } from "@/core/published";
import {
  addSaved,
  savedSnapshot,
  sharedIds,
  subscribeSaved,
  toggleSaved,
} from "@/lib/saved";

// The address does not change while this page is open, so there is nothing to watch.
const noSubscription = () => () => {};

const useSaved = () =>
  useSyncExternalStore(subscribeSaved, savedSnapshot, () => "")
    .split(",")
    .filter(Boolean);

const Bookmark = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className="size-4"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 4h12v16l-6-4-6 4z" />
  </svg>
);

/** Saves or removes a repository from the visitor's list. */
export function SaveButton({ id }: { id: string }) {
  const saved = useSaved().some((entry) => entry.toLowerCase() === id.toLowerCase());
  return (
    <button
      type="button"
      className={`btn btn-ghost ${saved ? "!border-accent !text-accent" : ""}`}
      aria-pressed={saved}
      onClick={() => toggleSaved(id)}
    >
      <Bookmark filled={saved} />
      <span aria-live="polite">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}

/** The header link to the saved list, with how many are on it. */
export function SavedLink() {
  const count = useSaved().length;
  return (
    <Link
      href="/saved"
      aria-label={`Saved repositories${count ? `: ${count}` : ""}`}
      className="border-hair-strong text-ink-2 hover:text-ink relative hidden size-9 place-items-center rounded-full border transition-colors min-[400px]:grid"
    >
      <Bookmark filled={count > 0} />
      {count > 0 ? (
        <span className="bg-accent text-accent-ink num absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/** The saved list itself: current figures for every saved repository. */
export function SavedList() {
  const own = useSaved();
  // A list someone shared as /saved?ids=a/b,c/d, shown instead of this browser's own.
  const search = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
  const [dismissed, setDismissed] = useState(false);
  const fromLink = useMemo(() => sharedIds(search), [search]);
  const shared = !dismissed && fromLink.length > 0 ? fromLink : null;
  const [copied, setCopied] = useState(false);
  const ids = shared ?? own;
  const key = ids.join(",");
  const [rows, setRows] = useState<IndexRow[] | null>(null);

  const share = async () => {
    const url = `${window.location.origin}/saved?ids=${own.join(",")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My open source shortlist", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The visitor closed the share sheet, or the clipboard is blocked.
    }
  };
  const keepShared = () => {
    if (!shared) return;
    addSaved(shared);
    window.history.replaceState(null, "", "/saved");
    setDismissed(true);
  };

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch(`/api/v1/saved?ids=${encodeURIComponent(key)}`)
      .then((response) => (response.ok ? response.json() : { rows: [] }))
      .then((body: { rows: IndexRow[] }) => {
        if (alive) setRows(body.rows);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [key]);

  if (ids.length === 0) {
    return (
      <div className="card mt-8 max-w-xl p-8">
        <p className="font-medium">Nothing saved yet</p>
        <p className="text-ink-2 mt-2 text-sm">
          Open any repository and press Save. Your list stays in this browser; there is no
          account.
        </p>
        <Link href="/explore" className="btn mt-6">
          Explore repositories
        </Link>
      </div>
    );
  }

  const shown = rows ?? [];
  const missing = rows
    ? ids.filter((id) => !shown.some((r) => r.id.toLowerCase() === id.toLowerCase()))
    : [];

  return (
    <>
      {shared ? (
        <div className="border-accent/40 bg-accent-soft/30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
          <p className="text-sm">
            <span className="font-medium">A shortlist someone shared with you.</span>{" "}
            <span className="text-ink-2">
              {shared.length} {shared.length === 1 ? "repository" : "repositories"}, with
              today&apos;s figures.
            </span>
          </p>
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={keepShared} className="btn h-9 px-4 text-sm">
              Save these to my list
            </button>
            <a href="/saved" className="btn btn-ghost h-9 px-4 text-sm">
              My own list
            </a>
          </span>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="text-sm" aria-live="polite">
          <span className="num font-medium">{ids.length}</span>{" "}
          <span className="text-ink-2">{shared ? "shared" : "saved"}</span>
        </p>
        {!shared && own.length > 0 ? (
          <button
            type="button"
            onClick={share}
            className="btn btn-ghost h-9 px-4 text-sm"
          >
            {copied ? "Link copied" : "Share this list"}
          </button>
        ) : null}
        {shown.length >= 2 ? (
          <Link
            href={`/compare?repos=${shown
              .slice(0, 4)
              .map((r) => r.id)
              .join(",")}`}
            className="btn btn-ghost h-9 px-4 text-sm"
          >
            Compare the first {Math.min(4, shown.length)}
          </Link>
        ) : null}
      </div>
      {rows === null ? (
        <p className="text-ink-2 mt-8 text-sm">Loading your list.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((row) => (
            <div key={row.id} className="flex flex-col gap-2">
              <RepoCard row={row} />
              {shared ? null : (
                <button
                  type="button"
                  onClick={() => toggleSaved(row.id)}
                  className="text-ink-3 hover:text-ink self-end text-xs transition-colors"
                >
                  Remove from saved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 ? (
        <div className="mt-8">
          <p className="text-ink-2 text-sm">Saved, but not in the index:</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {missing.map((id) => (
              <li key={id} className="inline-flex items-center gap-1">
                <Link href={`/repo/${id}`} className="tag !text-sm">
                  {id}
                </Link>
                <button
                  type="button"
                  hidden={shared !== null}
                  onClick={() => toggleSaved(id)}
                  aria-label={`Remove ${id} from saved`}
                  className="text-ink-3 hover:text-ink grid size-6 place-items-center rounded-full transition-colors"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
