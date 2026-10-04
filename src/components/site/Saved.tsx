"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RepoCard } from "@/components/data/RepoList";
import type { IndexRow } from "@/core/published";
import { savedSnapshot, subscribeSaved, toggleSaved } from "@/lib/saved";

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
      className="border-hair-strong text-ink-2 hover:text-ink relative grid size-9 place-items-center rounded-full border transition-colors"
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
  const ids = useSaved();
  const key = ids.join(",");
  const [rows, setRows] = useState<IndexRow[] | null>(null);

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
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="text-sm" aria-live="polite">
          <span className="num font-medium">{ids.length}</span>{" "}
          <span className="text-ink-2">saved</span>
        </p>
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
            <RepoCard key={row.id} row={row} />
          ))}
        </div>
      )}
      {missing.length > 0 ? (
        <div className="mt-8">
          <p className="text-ink-2 text-sm">Saved, but not in the index:</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {missing.map((id) => (
              <li key={id}>
                <Link href={`/repo/${id}`} className="tag !text-sm">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
