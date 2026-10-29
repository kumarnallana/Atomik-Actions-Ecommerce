"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Router Error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto my-20 p-8 rounded-2xl bg-white border border-rose-200 shadow-xl text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900">Application Rendering Exception</h2>
      <p className="text-xs text-zinc-600 leading-relaxed font-mono bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-left overflow-x-auto">
        {error.message || "An unexpected error occurred during page rendering."}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white text-xs font-semibold transition cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" /> Retry Request
      </button>
    </div>
  );
}

