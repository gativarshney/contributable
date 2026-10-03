export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
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
      <span className="text-[15px] font-medium tracking-tight max-[420px]:sr-only">
        Contributable
      </span>
    </span>
  );
}
