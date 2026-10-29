"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle2, Truck, Clock, MapPin } from "lucide-react";
import { Order, OrderStatus } from "@/types";
import { api } from "@/lib/api";
import { useStore } from "@/context/StoreContext";

const STEPS: OrderStatus[] = ["Placed", "Shipped", "Delivered"];

export default function CustomerOrdersPage() {
  const { currentUser } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getUserOrders(currentUser.id)
      .then(setOrders)
      .catch((err) => {
        console.error("Failed to load user orders:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Order History & Fulfillment Tracker
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Showing orders for <span className="font-semibold text-zinc-800">{currentUser?.name}</span> ({currentUser?.email})
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-zinc-500">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-2">
          <Package className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="font-bold text-zinc-800">No orders placed yet</h3>
          <p className="text-xs text-zinc-500">
            Add hardware to your bag and complete checkout to track fulfillment here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const currentStepIdx = STEPS.indexOf(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden"
              >
                {/* Header Summary */}
                <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-zinc-400 uppercase font-mono block">Order ID</span>
                      <span className="font-mono font-bold text-zinc-900 text-sm">
                        #KRN-{String(order.id).padStart(4, "0")}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 uppercase font-mono block">Placed On</span>
                      <span className="font-medium text-zinc-800">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 uppercase font-mono block">Destination</span>
                      <span className="font-medium text-zinc-800 inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        {order.shipping_address}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-zinc-400 font-mono uppercase block">
                      Total Charged
                    </span>
                    <span className="text-lg font-black font-mono text-zinc-900">
                      ${order.total.toFixed(2)}
                    </span>
                    {order.coupon_code && (
                      <span className="block text-[11px] text-emerald-600 font-mono">
                        {order.coupon_code} (-${order.discount.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Progress Stepper: Placed -> Shipped -> Delivered */}
                <div className="px-6 py-4 border-b border-zinc-100 bg-white">
                  <div className="grid grid-cols-3 gap-2">
                    {STEPS.map((step, idx) => {
                      const active = idx <= currentStepIdx;
                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border ${
                            active
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                              : "bg-zinc-50 border-zinc-200 text-zinc-400"
                          }`}
                        >
                          {idx === 0 && <Clock className="w-4 h-4 shrink-0" />}
                          {idx === 1 && <Truck className="w-4 h-4 shrink-0" />}
                          {idx === 2 && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-5 divide-y divide-zinc-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.product?.image_url}
                          alt={item.product?.name}
                          className="w-12 h-12 rounded-lg object-cover bg-zinc-100"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900">
                            {item.product?.name || `Product #${item.product_id}`}
                          </h4>
                          <p className="text-xs text-zinc-500 font-mono">
                            Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm text-zinc-900">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
