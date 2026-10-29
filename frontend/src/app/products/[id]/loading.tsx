export default function ProductLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-8">
      <div className="h-5 w-48 bg-zinc-200 rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="h-96 bg-zinc-200 rounded-3xl" />
        <div className="space-y-4 py-4">
          <div className="h-6 w-24 bg-zinc-200 rounded-md" />
          <div className="h-10 w-3/4 bg-zinc-200 rounded-xl" />
          <div className="h-20 w-full bg-zinc-200 rounded-xl" />
          <div className="h-12 w-40 bg-zinc-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

