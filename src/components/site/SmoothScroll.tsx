"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type Lenis from "lenis";

/**
 * Gives scrolling a little momentum on desktop. Left off on touch screens, where
 * native scrolling already feels right, and for anyone who asks for reduced motion.
 * The library is loaded only when it will be used.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const instance = useRef<Lenis | null>(null);

  useEffect(() => {
    const wanted =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wanted) return;

    let stop = () => {};
    let cancelled = false;
    import("lenis").then(({ default: LenisClass }) => {
      if (cancelled) return;
      const lenis = new LenisClass({
        duration: 1.05,
        // Ease out: quick to respond, gentle to settle.
        easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
        // In-page links such as "See everything inside" glide instead of jumping,
        // stopping short of the sticky header.
        anchors: { offset: -80 },
        // Inner scroll areas (the command palette list, wide tables) scroll natively.
        prevent: (node: HTMLElement) =>
          node.closest("dialog, .overflow-auto, .overflow-x-auto, .overflow-y-auto") !==
          null,
      });
      instance.current = lenis;
      let frame = requestAnimationFrame(function loop(time) {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      });
      stop = () => {
        cancelAnimationFrame(frame);
        lenis.destroy();
        instance.current = null;
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // A new page has a new height. Re-measure, and start at the top unless the link
  // points somewhere on the page; the framework restores position on back and forward.
  useEffect(() => {
    const lenis = instance.current;
    if (!lenis) return;
    lenis.resize();
    if (!window.location.hash) lenis.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
