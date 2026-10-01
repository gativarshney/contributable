"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { parseErrorMessage, parseRepoInput } from "@/lib/github/parse";

export function RepoInput({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = parseRepoInput(value);
    if (!result.ok) {
      setError(parseErrorMessage(result.reason));
      return;
    }
    setPending(true);
    router.push(`/report/${result.ref.owner}/${result.ref.name}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full text-left">
      <label htmlFor={inputId} className="sr-only">
        Public GitHub repository URL
      </label>
      <div
        className={`repo-input bg-bg-2 flex items-center gap-1 rounded-full border p-1.5 pl-5 ${
          error ? "border-danger" : "border-hair-strong"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          className="text-ink-3 size-[18px] shrink-0"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
        </svg>
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="github.com/vercel/next.js"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="placeholder:text-ink-3 h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
        />
        <button type="submit" className="btn !h-11" disabled={pending}>
          {pending ? "Opening" : "Analyze"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p id={errorId} role="alert" className="text-danger mt-2.5 min-h-5 px-5 text-sm">
        {error}
      </p>
    </form>
  );
}
