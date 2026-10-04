/**
 * The Google Summer of Code logo, from Google's own media page and served from this site
 * so it appears with the page instead of a moment later. It names the programme; it does
 * not mean the site is run or endorsed by Google.
 */
export function GsocMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gsoc-icon.png"
      alt="Google Summer of Code logo"
      width={size}
      height={size}
      decoding="async"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
