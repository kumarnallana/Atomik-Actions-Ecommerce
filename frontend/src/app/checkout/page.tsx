"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, Tag, CheckCircle2, ShoppingBag, MapPin, ChevronLeft } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { CouponValidationResponse } from "@/types";
import { formatRupees } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    currentUser,
    cart,
    refreshCart,
    notify,
    triggerCatalogRefresh,
  } = useStore();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState("");
  const [shippingAddress, setShippingAddress] = useState("742 Evergreen Terrace, Suite 200, San Francisco, CA");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Auto re-validate coupon if cart changes
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
      setCouponError(err.message || "Invalid coupon code");
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
      notify(`Order #${order.id} confirmed! Final charge: ${formatRupees(order.total)}`, "success");
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Hardware Catalog
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Atomic Checkout
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Server-authoritative pricing & row-level inventory locks enforced.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Lock className="w-3.5 h-3.5" />
          <span>PostgreSQL / SQLite FOR UPDATE Locking Active</span>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-4">
          <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto" />
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">Your hardware bag is empty</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select items from the catalog to proceed through concurrency-safe checkout.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left 2 Cols: Items & Shipping */}
          <div className="md:col-span-2 space-y-6">
            {/* Items summary */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-4">
              <h2 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">
                Review Bag Items ({cart.length})
              </h2>
              <div className="divide-y divide-zinc-100">
                {cart.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-lg object-cover bg-zinc-100"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">{item.product.name}</h4>
                        <p className="text-xs text-zinc-500 font-mono">
                          Qty: {item.quantity} × {formatRupees(item.product.price)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-zinc-900">
                      {formatRupees(item.quantity * item.product.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-3">
              <label className="font-bold text-zinc-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-600" /> Delivery Destination
              </label>
              <textarea
                rows={2}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Enter street address, suite, city, state, zip..."
              />
            </div>
          </div>

          {/* Right 1 Col: Coupon & Server-Authoritative Totals */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 space-y-5">
              <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">
                Order Summary
              </h3>

              {/* Coupon input */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="KRONO10 / STUDIO40"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs font-semibold transition"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-rose-600 font-medium">{couponError}</p>}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {appliedCoupon.code} applied
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

              {/* Server-authoritative totals breakdown */}
              <div className="space-y-2 pt-4 border-t border-zinc-100 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Authoritative Subtotal</span>
                  <span className="font-mono">{formatRupees(rawSubtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Verified Discount</span>
                    <span className="font-mono">-{formatRupees(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Standard Shipping</span>
                  <span className="font-mono text-emerald-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                  <span>Final Total</span>
                  <span className="font-mono">{formatRupees(finalTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-indigo-600 disabled:bg-zinc-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                {isSubmitting ? "Locking Inventory..." : "Complete Order"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
