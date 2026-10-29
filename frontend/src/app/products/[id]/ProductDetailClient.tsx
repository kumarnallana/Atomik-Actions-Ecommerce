"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Star,
  ShieldCheck,
  ShoppingBag,
  MessageSquarePlus,
  Boxes,
  Truck,
  CheckCircle,
} from "lucide-react";
import { Product } from "@/types";
import { api } from "@/lib/api";
import { useStore } from "@/context/StoreContext";
import { formatRupees } from "@/lib/format";

export default function ProductDetailClient({ productId }: { productId: number }) {
  const { currentUser, addToCart, notify } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = async () => {
    try {
      const data = await api.getProduct(productId);
      setProduct(data);
    } catch (err: any) {
      setError(err.message || "Failed to load product specifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !product) return;
    setSubmittingReview(true);
    try {
      await api.addReview(product.id, {
        user_id: currentUser.id,
        rating,
        comment,
      });
      notify("Verified buyer review submitted and published!", "success");
      setComment("");
      loadProduct();
    } catch (err: any) {
      notify(err.message || "Could not publish review", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-pulse space-y-4">
        <div className="h-6 w-36 bg-zinc-200 rounded mx-auto" />
        <div className="h-10 w-64 bg-zinc-200 rounded mx-auto" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-white border border-zinc-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-900">Product Not Found</h2>
        <p className="text-xs text-zinc-500">{error || "Could not find SKU requested."}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Return to Catalog
        </Link>
      </div>
    );
  }

  const isLow = product.stock > 0 && product.stock <= 3;
  const isOut = product.stock <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Link href="/" className="hover:text-zinc-900 transition flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Catalog
        </Link>
        <span>/</span>
        <span className="text-zinc-700">{product.category}</span>
        <span>/</span>
        <span className="text-zinc-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Spec & Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Product Media */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-sm aspect-4/3">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-mono font-semibold uppercase bg-zinc-900/90 text-white backdrop-blur-xs">
              {product.category}
            </span>
            {isLow && (
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-amber-500 text-zinc-950 shadow-sm">
                Only {product.stock} units remaining
              </span>
            )}
            {isOut && (
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-rose-600 text-white shadow-sm">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Product Info & Purchase Controls */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono">
              <span>SKU #KRN-0{product.id}</span>
              {product.reviews && product.reviews.length > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {(
                    product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length
                  ).toFixed(1)}{" "}
                  ({product.reviews.length} reviews)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-tight">
              {product.name}
            </h1>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed font-normal">
            {product.description}
          </p>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 block">
                Authoritative Price
              </span>
              <span className="text-3xl font-black font-mono text-zinc-900">
                {formatRupees(product.price)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-mono tracking-wider text-zinc-400 block">
                Availability
              </span>
              <span
                className={`text-sm font-bold ${
                  product.stock > 3
                    ? "text-emerald-600"
                    : product.stock > 0
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              disabled={isOut}
              onClick={() => addToCart(product, 1)}
              className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition shadow-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              {isOut ? "Currently Unavailable" : "Add to Persistent Bag"}
            </button>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-zinc-500">
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 bg-white">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Free Expedited Courier</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 bg-white">
                <Boxes className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Row-Locked Inventory</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stretch Goal 1: Verified Buyer Reviews Component */}
      <section className="bg-white rounded-3xl border border-zinc-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-zinc-900">
              Verified Buyer Reviews ({product.reviews?.length || 0})
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            Purchase authorization verified server-side
          </span>
        </div>

        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-3 divide-y divide-zinc-100">
            {product.reviews.map((rev) => (
              <div key={rev.id} className="pt-3 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-900">
                      {rev.user?.name || `Customer #${rev.user_id}`}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3" /> Verified Buyer
                    </span>
                  </div>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
                <span className="text-[10px] text-zinc-400 block font-mono">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-zinc-50 rounded-2xl text-xs text-zinc-500">
            No verified reviews for this SKU yet. Purchase this hardware to submit the first review!
          </div>
        )}

        {/* Submit Review Form */}
        <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
              Write a review as <span className="font-bold text-zinc-900">{currentUser?.name}</span>
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="text-xs border border-zinc-300 rounded-lg px-2.5 py-1 bg-white font-semibold cursor-pointer"
            >
              <option value={5}>★★★★★ (5 Stars)</option>
              <option value={4}>★★★★☆ (4 Stars)</option>
              <option value={3}>★★★☆☆ (3 Stars)</option>
              <option value={2}>★★☆☆☆ (2 Stars)</option>
              <option value={1}>★☆☆☆☆ (1 Star)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              minLength={3}
              placeholder="Describe your acoustic, tactile, and build impressions..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-400 text-white text-xs font-semibold transition shrink-0 cursor-pointer"
            >
              {submittingReview ? "Verifying..." : "Post Review"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

