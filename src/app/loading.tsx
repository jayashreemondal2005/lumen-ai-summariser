// Shown instantly while a route's code loads, so every click gets feedback.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-14 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto h-9 w-2/3" />
      <div className="skeleton mx-auto mt-4 h-4 w-1/2" />
      <div className="mt-10 space-y-3">
        <div className="skeleton h-14 w-full rounded-2xl" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
