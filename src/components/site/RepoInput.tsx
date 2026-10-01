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
    <form onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor={inputId} className="sr-only">
        Public GitHub repository URL
      </label>
      <div
        className={`bg-bg-2 flex flex-col gap-2 rounded-2xl border p-2 transition-colors sm:flex-row sm:rounded-full ${
          error ? "border-danger" : "border-hair-strong focus-within:border-ink-2"
        }`}
      >
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://github.com/vercel/next.js"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="placeholder:text-ink-3 h-12 min-w-0 flex-1 bg-transparent px-4 font-mono text-[14px] outline-none"
        />
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Opening" : "Analyze"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p id={errorId} role="alert" className="text-danger mt-3 min-h-5 px-4 text-sm">
        {error}
      </p>
    </form>
  );
}
