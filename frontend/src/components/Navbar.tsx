"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ShieldCheck, Package, UserCheck, Sparkles } from "lucide-react";
import { useStore } from "@/context/StoreContext";

export default function Navbar() {
  const pathname = usePathname();
  const { users, currentUser, setCurrentUser, cart, setIsCartOpen } = useStore();

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 border-b border-zinc-200">
      {/* Top Promo Ticker */}
      <div className="bg-zinc-950 text-zinc-300 text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          STUDIO LAUNCH PROMOS: Use <strong className="text-white font-mono">KRONO10</strong> (10% off $50+) or{" "}
          <strong className="text-white font-mono">STUDIO40</strong> ($40 off $200+)
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black tracking-tighter text-lg group-hover:bg-indigo-600 transition">
              K
            </div>
            <div>
              <span className="font-black tracking-tight text-zinc-900 text-lg block leading-none">
                KRONO
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                Hardware Lab
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname === "/"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              Catalog
            </Link>
            <Link
              href="/orders"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                pathname === "/orders"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Package className="w-4 h-4" />
              Orders
            </Link>
            <Link
              href="/admin"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                pathname === "/admin"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Admin Studio
            </Link>
          </nav>
        </div>

        {/* Right Controls: Live Account Switcher & Persistent Cart Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100/80 border border-zinc-200/80 rounded-xl px-2.5 py-1.5">
            <UserCheck className="w-4 h-4 text-zinc-500 hidden sm:block" />
            <span className="text-xs text-zinc-500 font-medium hidden lg:inline">Session:</span>
            <select
              aria-label="Switch Demo User Session"
              value={currentUser?.id || ""}
              onChange={(e) => {
                const found = users.find((u) => u.id === Number(e.target.value));
                if (found) setCurrentUser(found);
              }}
              className="bg-transparent text-xs font-semibold text-zinc-900 focus:outline-none cursor-pointer pr-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Bag</span>
            <span className="px-1.5 py-0.5 text-xs rounded-md bg-white/20 font-mono">
              {totalItems}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sub-bar */}
      <div className="flex md:hidden border-t border-zinc-200 bg-zinc-50/80 justify-around py-2 text-xs font-semibold text-zinc-600">
        <Link
          href="/"
          className={pathname === "/" ? "text-zinc-950 underline" : ""}
        >
          Catalog
        </Link>
        <Link
          href="/orders"
          className={pathname === "/orders" ? "text-zinc-950 underline" : ""}
        >
          My Orders
        </Link>
        <Link
          href="/admin"
          className={pathname === "/admin" ? "text-indigo-600 underline" : ""}
        >
          Admin Studio
        </Link>
      </div>
    </header>
  );
}
