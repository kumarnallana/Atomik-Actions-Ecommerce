"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Plus, Minus, Tag, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { CouponValidationResponse } from "@/types";
import { formatRupees } from "@/lib/format";

export default function CartDrawer() {
  const router = useRouter();
  const {
    currentUser,
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    refreshCart,
    notify,
    triggerCatalogRefresh,
  } = useStore();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState("");
  const [shippingAddress, setShippingAddress] = useState("742 Evergreen Terrace, Suite 200, SF");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Re-validate coupon automatically whenever cart items change
  useEffect(() => {
    if (!appliedCoupon || !currentUser || cart.length === 0) {
      if (cart.length === 0) setAppliedCoupon(null);
      return;
    }
    api
      .validateCoupon(appliedCoupon.code, currentUser.id)
      .then((res) => setAppliedCoupon(res))
      .catch((err) => {
        setAppliedCoupon(null);
        setCouponError(err.message);
      });
  }, [cart, currentUser]);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    if (!couponInput.trim() || !currentUser) return;
    try {
      const res = await api.validateCoupon(couponInput.trim(), currentUser.id);
      setAppliedCoupon(res);
      notify(`Coupon ${res.code} applied (-${formatRupees(res.discount_amount)})`, "success");
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || "Invalid coupon");
    }
  };

  const handleCheckout = async () => {
    if (!currentUser || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const order = await api.checkout({
        user_id: currentUser.id,
        coupon_code: appliedCoupon?.code || undefined,
        shipping_address: shippingAddress,
      });
      await refreshCart();
      triggerCatalogRefresh();
      setAppliedCoupon(null);
      setCouponInput("");
      setIsCartOpen(false);
      notify(`Order #${order.id} confirmed! Total charged: ${formatRupees(order.total)}`, "success");
      router.push("/orders");
    } catch (err: any) {
      notify(err.message || "Checkout failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Your Persistent Bag</h2>
            <p className="text-xs text-zinc-500">
              Synced to account: <span className="font-semibold text-zinc-700">{currentUser?.email}</span>
            </p>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-400 font-medium text-sm">Your hardware bag is empty.</p>
              <p className="text-xs text-zinc-400 mt-1">
                Items added here persist in PostgreSQL/SQLite across sessions.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50"
              >
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover bg-zinc-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-zinc-900 truncate">
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-zinc-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatRupees(item.product.price)} each • {item.product.stock} in stock
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-white">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-semibold text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-mono font-bold text-sm text-zinc-900">
                      {formatRupees(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Coupon Validation, Shipping & Server-Authoritative Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-zinc-200 bg-zinc-50 space-y-4">
            {/* Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Promo / Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Try KRONO10 or STUDIO40"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs font-semibold transition"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-600 font-medium">{couponError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Code {appliedCoupon.code} verified on server
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                    }}
                    className="underline text-emerald-800 ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </form>

            {/* Shipping Address */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                Delivery Destination
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatRupees(rawSubtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono">-{formatRupees(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-1">
                <span>Server Authoritative Total</span>
                <span className="font-mono">{formatRupees(finalTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md"
            >
              <Lock className="w-4 h-4" />
              {isSubmitting ? "Locking Inventory & Processing..." : "Complete Atomic Checkout"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
