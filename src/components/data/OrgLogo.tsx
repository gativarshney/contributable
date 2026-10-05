"use client";

import { useState } from "react";

/**
 * An organisation's logo from the programme listing, on a white tile because the logos
 * are drawn for a light page. The initial sits underneath, so a logo that is slow to
 * arrive (or never does) still leaves a readable tile instead of a blank one.
 */
export function OrgLogo({
  src,
  name,
  size = 44,
  eager = false,
}: {
  src: string | null;
  name: string;
  size?: number;
  /** Load at once, for logos near the top of the page. */
  eager?: boolean;
}) {
  // Hidden until it has loaded: an image paints its white tile before the logo arrives,
  // which would cover the initial with a blank square.
  const [loaded, setLoaded] = useState(false);
  return (
    <span
      className="org-logo relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-base font-medium text-neutral-700"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
      {src ? (
        // The logos are small files on the programme's own server; plain img keeps
        // them off our image budget.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          // A logo already in the cache can finish before React attaches onLoad.
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 size-full bg-white object-contain p-1 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
