export default function CircleLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="h-10 w-72 max-w-full animate-pulse rounded-xl bg-well" />
      <div aria-hidden="true" className="h-6 w-48 animate-pulse rounded-xl bg-well" />
      <div aria-hidden="true" className="mt-4 h-64 animate-pulse rounded-2xl bg-well" />
    </div>
  );
}
