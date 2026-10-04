import type { Metadata } from "next";
import { SavedList } from "@/components/site/Saved";

export const metadata: Metadata = {
  title: "Saved repositories",
  description:
    "The repositories you saved, with their current reply time and merge rate.",
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <div className="shell py-10 md:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Saved</p>
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
