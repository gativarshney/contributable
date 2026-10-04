import Link from "next/link";

const DOORS: [label: string, text: string, href: string][] = [
  ["Find", "A project that replies", "/explore"],
  ["Check", "Any repository", "/check"],
  ["Start", "Your first pull request", "/start"],
];

export default function NotFound() {
  return (
    <div className="shell py-24 md:py-32">
      <p className="eyebrow">404</p>
      <h1 className="display mt-5 text-[clamp(2.4rem,6vw,4rem)]">
        Nothing <em>here.</em>
      </h1>
      <p className="text-ink-2 mt-5 max-w-xl text-lg">
        This page does not exist. One of these is probably what you were after.
      </p>
      <ul className="mt-12 grid gap-px md:grid-cols-3">
        {DOORS.map(([label, text, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="group border-hair hover:border-accent block border-t py-6 transition-colors md:pr-10"
            >
              <p className="eyebrow !text-accent">{label}</p>
              <p className="font-display mt-3 flex items-center justify-between gap-4 text-xl">
                {text}
                <span
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
