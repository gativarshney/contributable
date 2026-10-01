import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell py-24 md:py-32">
      <p className="eyebrow">404</p>
      <h1 className="display mt-5 text-[clamp(2.4rem,6vw,4rem)]">
        Nothing <em>here.</em>
      </h1>
      <p className="text-ink-2 mt-5 max-w-xl text-lg">
        This page does not exist. Reports live at /report/owner/repository.
      </p>
      <Link href="/" className="btn mt-10">
        Analyze a repository
      </Link>
    </div>
  );
}
