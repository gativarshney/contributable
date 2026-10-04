"use client";

import Form from "next/form";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** A GET form that submits itself when a control changes. Works without scripts too. */
export function FilterForm({
  action,
  children,
  className,
}: {
  action: string;
  children: ReactNode;
  className?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <Form
      action={action}
      scroll={false}
      className={className}
      onChange={(event) => {
        const form = event.currentTarget;
        const typing = (event.target as HTMLElement).matches('input[type="search"]');
        if (timer.current) clearTimeout(timer.current);
        // Typing waits for a pause; everything else applies at once.
        timer.current = setTimeout(() => form.requestSubmit(), typing ? 350 : 0);
      }}
    >
      {children}
    </Form>
  );
}

const PANEL_ID = "filters";

function setOpen(open: boolean) {
  document.getElementById(PANEL_ID)?.classList.toggle("is-open", open);
}

/** Shows the filter panel as a bottom sheet. Only visible on a phone. */
export function FilterToggle({ count }: { count: number }) {
  const [open, setExpanded] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setExpanded(false);
    };
    const onClose = () => setExpanded(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("filters:close", onClose);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("filters:close", onClose);
    };
  }, [open]);
  return (
    <button
      type="button"
      className="btn btn-ghost w-full lg:hidden"
      aria-expanded={open}
      aria-controls={PANEL_ID}
      onClick={() => {
        setOpen(!open);
        setExpanded(!open);
      }}
    >
      Filters
      {count > 0 ? <span className="num text-accent">{count}</span> : null}
    </button>
  );
}

export function FilterClose() {
  return (
    <button
      type="button"
      className="btn btn-ghost h-10 px-4"
      onClick={() => {
        setOpen(false);
        document.dispatchEvent(new Event("filters:close"));
      }}
    >
      Done
    </button>
  );
}
