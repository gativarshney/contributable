/** The three rising bars on their own. */
export function LogoMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect
        x="1"
        y="10"
        width="4.5"
        height="9"
        rx="1.2"
        className="fill-accent"
        opacity="0.55"
      />
      <rect
        x="7.75"
        y="5"
        width="4.5"
        height="14"
        rx="1.2"
        className="fill-accent"
        opacity="0.8"
      />
      <rect x="14.5" y="1" width="4.5" height="18" rx="1.2" className="fill-accent" />
    </svg>
  );
}

export function Logo({
  className = "",
  large = false,
}: {
  className?: string;
  /** The header's version: a touch bigger and bolder, as the site's name. */
  large?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={large ? "size-[22px]" : "size-5"} />
      <span
        className={
          large
            ? "text-[17px] font-semibold tracking-tight"
            : "text-[15px] font-medium tracking-tight"
        }
      >
        Contributable
      </span>
    </span>
  );
}
