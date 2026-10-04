/**
 * An organisation's logo from the programme listing, on a white tile because the logos
 * are drawn for a light page. Falls back to the organisation's initial.
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
  return (
    <span
      className="org-logo grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-base font-medium text-neutral-700"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        // The logos are small files on the programme's own server; plain img keeps
        // them off our image budget.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-contain p-1"
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
