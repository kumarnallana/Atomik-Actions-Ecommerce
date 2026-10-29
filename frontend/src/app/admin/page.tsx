"use client";

import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { Order, OrderStatus, Product } from "@/types";
import {
  AlertTriangle,
  Boxes,
  CheckCircle,
  PlusCircle,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminStudioPage() {
  const { notify, triggerCatalogRefresh } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [stockEdits, setStockEdits] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  // New Product Form State
  const [newProd, setNewProd] = useState({
    name: "",
    description: "",
    category: "Accessories",
    price: "",
    stock: "",
    image_url:
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=900&q=80",
  });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [allOrders, allProducts, lowStockList] = await Promise.all([
        api.getAllOrders(),
        api.getProducts(),
        api.getLowStockProducts(3),
      ]);
      setOrders(allOrders);
      setProducts(allProducts);
      setLowStock(lowStockList);

      const initialEdits: Record<number, number> = {};
      allProducts.forEach((p) => {
        initialEdits[p.id] = p.stock;
      });
      setStockEdits(initialEdits);
    } catch (err: any) {
      notify(err.message || "Failed to load admin telemetry", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleStatusTransition = async (
    orderId: number,
    nextStatus: OrderStatus,
  ) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      notify(`Order #${orderId} moved to ${nextStatus}`, "success");
      loadAdminData();
    } catch (err: any) {
      notify(err.message || "Transition failed", "error");
    }
  };

  const handleStockUpdate = async (productId: number) => {
    const newStock = stockEdits[productId];
    if (newStock === undefined || newStock < 0) return;
    try {
      await api.updateProduct(productId, { stock: newStock });
      notify("Inventory count updated", "success");
      triggerCatalogRefresh();
      loadAdminData();
    } catch (err: any) {
      notify(err.message || "Could not update stock", "error");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({
        name: newProd.name,
        description: newProd.description,
        category: newProd.category,
        price: Number(newProd.price),
        stock: Number(newProd.stock),
        image_url: newProd.image_url,
      });
      notify(`Created product '${newProd.name}'`, "success");
      setNewProd({
        name: "",
        description: "",
        category: "Accessories",
        price: "",
        stock: "",
        image_url:
          "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=900&q=80",
      });
      triggerCatalogRefresh();
      loadAdminData();
    } catch (err: any) {
      notify(err.message || "Could not create product", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-600 font-bold">
            Operations Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Admin Fulfillment & Inventory Studio
          </h1>
        </div>
        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 self-start cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Stretch Goal: Low-Stock Alert Banner */}
      {lowStock.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Low-Stock Inventory Alert ({lowStock.length} SKU
                {lowStock.length > 1 ? "s" : ""} ≤ 3 units)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStock.map((p) => `${p.name} (${p.stock} left)`).join(" • ")}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-lg bg-amber-200/70 text-amber-950">
            Restock Recommended
          </span>
        </div>
      )}

      {/* Order Fulfillment Pipeline (Placed -> Shipped -> Delivered) */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Order Fulfillment Pipeline ({orders.length})
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            State Machine: Placed → Shipped → Delivered
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-400">
            Loading orders...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-mono uppercase text-zinc-500">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer / Address</th>
                  <th className="py-3 px-4">Line Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      #KRN-{String(o.id).padStart(4, "0")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 text-xs">
                        User #{o.user_id}
                      </div>
                      <div className="text-xs text-zinc-500 truncate max-w-xs">
                        {o.shipping_address}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-600">
                      {o.items
                        .map(
                          (i) =>
                            `${i.product?.name || `SKU #${i.product_id}`} (×${i.quantity})`,
                        )
                        .join(", ")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {formatRupees(o.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          o.status === "Delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "Shipped"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {o.status === "Placed" && (
                        <button
                          onClick={() =>
                            handleStatusTransition(o.id, "Shipped")
                          }
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                        >
                          Mark Shipped →
                        </button>
                      )}
                      {o.status === "Shipped" && (
                        <button
                          onClick={() =>
                            handleStatusTransition(o.id, "Delivered")
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                        >
                          Mark Delivered ✓
                        </button>
                      )}
                      {o.status === "Delivered" && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Inventory Management & New Product Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
            <h2 className="font-bold text-zinc-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-zinc-700" />
              Live SKU Stock & Replenishment
            </h2>
          </div>

          <div className="divide-y divide-zinc-100">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-12 h-12 rounded-lg object-cover bg-zinc-100 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      {prod.name}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono">
                      {formatRupees(prod.price)} • {prod.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <input
                    type="number"
                    min="0"
                    value={stockEdits[prod.id] ?? prod.stock}
                    onChange={(e) =>
                      setStockEdits((prev) => ({
                        ...prev,
                        [prod.id]: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-20 px-3 py-1.5 text-xs font-mono border border-zinc-300 rounded-lg"
                  />
                  <button
                    onClick={() => handleStockUpdate(prod.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                  >
                    Update Stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Hardware Product */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 h-fit space-y-4">
          <h2 className="font-bold text-zinc-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            Add New Hardware SKU
          </h2>

          <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Krono Rotary Macro Pad"
                value={newProd.name}
                onChange={(e) =>
                  setNewProd({ ...newProd, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={newProd.category}
                  onChange={(e) =>
                    setNewProd({ ...newProd, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                />
              </div>
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="89.00"
                  value={newProd.price}
                  onChange={(e) =>
                    setNewProd({ ...newProd, price: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="10"
                  value={newProd.stock}
                  onChange={(e) =>
                    setNewProd({ ...newProd, stock: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  required
                  value={newProd.image_url}
                  onChange={(e) =>
                    setNewProd({ ...newProd, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                placeholder="Technical specifications and materials..."
                value={newProd.description}
                onChange={(e) =>
                  setNewProd({ ...newProd, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-indigo-600 text-white font-semibold transition"
            >
              Publish to Catalog
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
