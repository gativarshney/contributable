"use client";

import { useEffect } from "react";

/**
 * Brings the list into view after a page change. The router's own hash scrolling
 * runs before the new page has settled, so it lands short, or not at all on a fresh load.
 */
export function ScrollToList({ id, page }: { id: string; page: number | string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [id, page]);
  return null;
}
