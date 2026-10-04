/**
 * The Google Summer of Code logo, loaded from Google's own media page. It names the
 * programme; it does not mean the site is run or endorsed by Google.
 */
export function GsocMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://developers.google.com/open-source/gsoc/resources/downloads/GSoC-icon-192.png"
      alt="Google Summer of Code logo"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
