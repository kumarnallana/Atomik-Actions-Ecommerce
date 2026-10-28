"use client";

import { useState } from "react";
import { X, Star, ShieldCheck, MessageSquarePlus } from "lucide-react";
import { Product } from "@/types";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onReviewAdded: (updated: Product) => void;
}

export default function ProductModal({ product, onClose, onReviewAdded }: ProductModalProps) {
  const { currentUser, addToCart, notify } = useStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    try {
      await api.addReview(product.id, {
        user_id: currentUser.id,
        rating,
        comment,
      });
      const refreshed = await api.getProduct(product.id);
      onReviewAdded(refreshed);
      setComment("");
      notify("Verified buyer review published!", "success");
    } catch (err: any) {
      notify(err.message || "Could not post review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 my-8">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="bg-zinc-100 h-64 md:h-auto">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 font-semibold">
                  {product.category}
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mt-3">{product.name}</h2>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{product.description}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <span className="text-2xl font-black font-mono text-zinc-900">
                  ${product.price.toFixed(2)}
                </span>
                <span
                  className={`block text-xs font-semibold mt-0.5 ${
                    product.stock > 3
                      ? "text-emerald-600"
                      : product.stock > 0
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {product.stock > 0 ? `${product.stock} units available` : "Out of Stock"}
                </span>
              </div>

              <button
                disabled={product.stock <= 0}
                onClick={() => addToCart(product.id, 1)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold transition"
              >
                {product.stock > 0 ? "Add to Bag" : "Sold Out"}
              </button>
            </div>
          </div>
        </div>

        {/* Verified Buyer Reviews Section (Stretch Goal) */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Buyer Reviews ({product.reviews?.length || 0})
            </h3>
            <span className="text-xs text-zinc-500">
              Purchase verification enforced on server
            </span>
          </div>

          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
              {product.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl bg-white border border-zinc-200/80 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 text-xs">
                      {rev.user?.name || `Customer #${rev.user_id}`}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star className="w-3.5 h-3.5 fill-amber-400" key={idx} />
                      ))}
                    </div>
                  </div>
                  <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              No verified reviews yet. Buy this item to leave the first review!
            </p>
          )}

          {/* Submit Review Form */}
          <form onSubmit={handleReviewSubmit} className="pt-3 border-t border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Write a review as {currentUser?.name}
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="text-xs border border-zinc-300 rounded-lg px-2 py-1 bg-white font-semibold"
              >
                <option value={5}>★★★★★ (5/5)</option>
                <option value={4}>★★★★☆ (4/5)</option>
                <option value={3}>★★★☆☆ (3/5)</option>
                <option value={2}>★★☆☆☆ (2/5)</option>
                <option value={1}>★☆☆☆☆ (1/5)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                minLength={3}
                placeholder="Share your build quality & acoustic impressions..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white text-xs font-semibold transition shrink-0"
              >
                {submitting ? "Posting..." : "Post Review"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
