import type { Metadata } from "next";
import { PageMark } from "@/components/site/Drift";
import { SavedList } from "@/components/site/Saved";

export const metadata: Metadata = {
  title: "Saved repositories",
  description:
    "The repositories you saved, with their current reply time and merge rate.",
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <div className="page-glow shell py-10 md:py-14">
      <header className="max-w-2xl">
        <div className="flex items-center gap-3">
          <PageMark icon="M6 4h12v16l-6-4-6 4z" />
          <p className="eyebrow">Saved</p>
        </div>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
          Your shortlist, <em>kept current.</em>
        </h1>
        <p className="text-ink-2 mt-4">
          The figures refresh with the index, so this page tells you when a project on
          your list gets faster, slows down or opens a new first issue.
        </p>
      </header>
      <SavedList />
    </div>
  );
}
