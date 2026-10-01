"use client";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage can be unavailable (private mode); the toggle still works for this page
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className="border-hair-strong text-ink-2 hover:text-ink grid size-9 cursor-pointer place-items-center rounded-full border transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" />
      </svg>
    </button>
  );
}
