export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-raised" />
      <div className="mt-6 h-72 animate-pulse rounded-2xl bg-raised" />
    </div>
  );
}
