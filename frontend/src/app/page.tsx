"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Star, Eye, ShoppingBag, RotateCcw } from "lucide-react";
import { Product } from "@/types";
import { api } from "@/lib/api";
import { useStore } from "@/context/StoreContext";
import ProductModal from "@/components/ProductModal";

export default function StorefrontCatalogPage() {
  const { addToCart, catalogVersion } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, [catalogVersion]);

  useEffect(() => {
    setLoading(true);
    api
      .getProducts({
        category: selectedCategory,
        search: search || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        sort_by: sortBy || undefined,
      })
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, search, minPrice, maxPrice, sortBy, catalogVersion]);

  const resetFilters = () => {
    setSelectedCategory("All");
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <section className="rounded-3xl bg-zinc-950 text-white p-8 md:p-12 relative overflow-hidden border border-zinc-800">
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest bg-white/10 text-zinc-200 border border-white/15">
            Series 01 // Precision Desktop Architecture
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Engineered for tactile permanence.
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Small-batch CNC aluminum keyboards, reference planar acoustics, and high-CRI studio lighting. Backed by real-time row-locked inventory.
          </p>
        </div>
      </section>

      {/* Filter & Search Control Bar */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search hardware..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-300 rounded-xl px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="number"
                min="0"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-16 text-xs bg-transparent focus:outline-none font-mono"
              />
              <span className="text-zinc-300">—</span>
              <input
                type="number"
                min="0"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-16 text-xs bg-transparent focus:outline-none font-mono"
              />
            </div>

            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Sort: Featured</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="name_asc">Name: A → Z</option>
              <option value="stock_desc">Inventory: High → Low</option>
            </select>

            {(selectedCategory !== "All" || search || minPrice || maxPrice || sortBy) && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-96 rounded-2xl bg-zinc-200/60 animate-pulse border border-zinc-200"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200">
          <p className="text-zinc-600 font-semibold">No hardware matches your active filters.</p>
          <button
            onClick={resetFilters}
            className="mt-3 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const isOut = product.stock <= 0;
            const isLow = product.stock > 0 && product.stock <= 3;

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-zinc-200/90 overflow-hidden flex flex-col justify-between transition hover:shadow-xl hover:border-zinc-300"
              >
                <div>
                  <div className="relative h-56 bg-zinc-100 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase bg-zinc-900/85 text-white backdrop-blur-xs">
                        {product.category}
                      </span>
                      {isLow && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500 text-zinc-950">
                          Only {product.stock} left
                        </span>
                      )}
                      {isOut && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-600 text-white">
                          Sold Out
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveProduct(product)}
                      className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-white text-zinc-900 shadow-md transition"
                      title="Inspect Specs & Verified Reviews"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                      <span className="font-mono">SKU-0{product.id}</span>
                      {product.reviews && product.reviews.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {(
                            product.reviews.reduce((a, b) => a + b.rating, 0) /
                            product.reviews.length
                          ).toFixed(1)}{" "}
                          ({product.reviews.length})
                        </span>
                      )}
                    </div>
                    <h3
                      onClick={() => setActiveProduct(product)}
                      className="font-bold text-zinc-900 text-base leading-snug cursor-pointer hover:text-indigo-600 transition"
                    >
                      {product.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black font-mono text-zinc-900">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      {product.stock} in stock
                    </span>
                  </div>

                  <button
                    disabled={isOut}
                    onClick={() => addToCart(product.id, 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {isOut ? "Unavailable" : "Add to Bag"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onReviewAdded={(updated) => {
          setActiveProduct(updated);
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />
    </div>
  );
}
