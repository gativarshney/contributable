/** Holds the repo page's shape while its data arrives, so nothing jumps. */
export default function Loading() {
  return (
    <div
      className="shell py-10 md:py-14"
      aria-busy="true"
      aria-label="Loading repository"
    >
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-5 h-12 w-[min(28rem,80%)]" />
      <div className="skeleton mt-4 h-5 w-[min(34rem,90%)]" />
      <div className="skeleton mt-9 h-9 w-[min(40rem,95%)]" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton mt-4 h-11 w-24" />
            <div className="skeleton mt-4 h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
