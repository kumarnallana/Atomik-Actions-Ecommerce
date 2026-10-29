export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse">
      <div className="h-44 rounded-3xl bg-zinc-200/80" />
      <div className="h-14 rounded-2xl bg-zinc-200/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-96 rounded-2xl bg-zinc-200/70 border border-zinc-200" />
        ))}
      </div>
    </div>
  );
}

