import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "KRONO — Precision Workspace & Audio Hardware",
  description:
    "Full-stack modular commerce platform featuring row-level inventory locking and server-authoritative pricing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased selection:bg-zinc-900 selection:text-white">
        <StoreProvider>
          <Navbar />
          <CartDrawer />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-200 bg-white py-8 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
              <p>© {new Date().getFullYear()} KRONO Hardware Lab. Built with Next.js & FastAPI.</p>
              <p className="font-mono">
                Concurrency Lock: <span className="text-emerald-600 font-semibold">SELECT ... FOR UPDATE</span> • Server Pricing: <span className="text-emerald-600 font-semibold">ACTIVE</span>
              </p>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
