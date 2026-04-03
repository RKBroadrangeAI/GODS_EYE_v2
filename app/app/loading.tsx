export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
    </div>
  );
}
