import Link from "next/link";
import { ChevronLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-24 p-8 rounded-2xl bg-white border border-zinc-200 shadow-xl text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-600 mx-auto flex items-center justify-center">
        <HelpCircle className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">404 — Page Not Found</h2>
      <p className="text-xs text-zinc-500 leading-relaxed">
        The hardware specification or page route you requested does not exist or has been relocated.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
      >
        <ChevronLeft className="w-4 h-4" /> Return to Catalog
      </Link>
    </div>
  );
}

