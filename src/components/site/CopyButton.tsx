"use client";

import { useState } from "react";

/** Copies text and says so. The label changes back after two seconds. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className="btn btn-ghost h-9 shrink-0 px-3.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
    >
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label}
      </span>
    </button>
  );
}
