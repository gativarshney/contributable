"use client";

import Image, { type ImageLoader } from "next/image";
import { useState } from "react";

/**
 * Every logo is resized once, to 96px (sharp at up to 48px on a 2x screen), so each
 * organisation costs a single image transformation however often and wherever it shows.
 */
const logoLoader: ImageLoader = ({ src }) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=96&q=75`;

/**
 * An organisation's logo from the programme listing, on a white tile because the logos
 * are drawn for a light page. The initial sits underneath, so a logo that is slow to
 * arrive (or never does) still leaves a readable tile instead of a blank one.
 */
export function OrgLogo({
  src,
  name,
  size = 44,
}: {
  src: string | null;
  name: string;
  size?: number;
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
        <Image
          src={src}
          loader={logoLoader}
          alt=""
          width={size}
          height={size}
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
