/**
 * The shape of a page while its data arrives. Shown the moment a link is clicked, so
 * moving between pages answers at once instead of seeming to hang.
 */
export function PageSkeleton({
  label,
  layout,
}: {
  /** What is loading, for screen readers. */
  label: string;
  layout: "cards" | "list" | "table";
}) {
  return (
    <div
      className="page-glow shell py-10 md:py-14"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="skeleton h-4 w-36" />
      <div className="skeleton mt-5 h-11 w-[min(30rem,85%)]" />
      <div className="skeleton mt-3 h-11 w-[min(22rem,65%)]" />
      <div className="skeleton mt-6 h-4 w-[min(36rem,92%)]" />
      <div className="skeleton mt-8 h-11 w-full max-w-2xl rounded-full" />

      {layout === "cards" ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton size-9 rounded-lg" />
                <div className="skeleton h-4 w-32" />
              </div>
              <div className="skeleton mt-4 h-3 w-full" />
              <div className="skeleton mt-2 h-3 w-3/4" />
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="skeleton h-10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : layout === "list" ? (
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card flex items-center gap-4 p-5">
              <div className="skeleton size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-48 max-w-full" />
                <div className="skeleton mt-2 h-3 w-72 max-w-full" />
              </div>
              <div className="skeleton hidden h-9 w-20 sm:block" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-10 p-5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="border-hair flex gap-4 border-b py-3 last:border-0">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton ml-auto h-4 w-20" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
