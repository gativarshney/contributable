"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A sticky row of links to the sections of a long page. The section in view is
 * highlighted, and its link is kept visible when the row scrolls sideways on a phone.
 */
export function JumpBar({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The section being read is the last one whose top is in the upper third of the screen.
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = items[0]?.id;
      for (const item of items) {
        const top = document.getElementById(item.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= window.innerHeight * 0.35) current = item.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  useEffect(() => {
    const link = row.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    const box = row.current;
    if (!link || !box) return;
    const left = link.offsetLeft - box.clientWidth / 2 + link.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      className="bg-bg/95 sticky top-16 z-30 -mx-4 mt-8 px-4 py-2 backdrop-blur-md"
    >
      <div
        ref={row}
        className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const on = item.id === active;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              data-id={item.id}
              aria-current={on ? "location" : undefined}
              className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors ${
                on
                  ? "border-accent bg-accent text-accent-ink font-medium"
                  : "border-hair-strong bg-bg/70 text-ink-2 hover:text-ink hover:border-ink-3"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
