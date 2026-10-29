"use client";

import { api } from "@/lib/api";
import { CartItem, Product, User } from "@/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ToastMessage {
  id: number;
  type: "success" | "error";
  text: string;
}

interface StoreContextValue {
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  addToCart: (
    productOrId: number | Product,
    quantity?: number,
  ) => Promise<void>;
  updateCartQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  registerProducts: (products: Product[]) => void;
  notify: (text: string, type?: "success" | "error") => void;
  catalogVersion: number;
  triggerCatalogRefresh: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const DEFAULT_USER: User = {
  id: 1,
  name: "Alex Rivera",
  email: "alex.rivera@krono.io",
  role: "customer",
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([DEFAULT_USER]);
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USER);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [catalogVersion, setCatalogVersion] = useState(0);

  // High-performance client product cache for 0ms optimistic UI rendering
  const productsMap = useRef<Map<number, Product>>(new Map());

  const registerProducts = useCallback((items: Product[]) => {
    items.forEach((p) => {
      productsMap.current.set(p.id, p);
    });
  }, []);

  const notify = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  const triggerCatalogRefresh = useCallback(() => {
    setCatalogVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    api
      .getUsers()
      .then((list) => {
        setUsers(list);
        if (list.length > 0) setCurrentUser(list[0]);
      })
      .catch((err) => console.error("Failed to fetch demo users:", err));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!currentUser) return;
    try {
      const items = await api.getCart(currentUser.id);
      setCart(items);
      // Populate cache with products inside cart
      items.forEach((i) => {
        if (i.product) productsMap.current.set(i.product.id, i.product);
      });
    } catch (err) {
      console.error("Failed to load cart:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // 0ms Optimistic UI Add-to-Cart with background server synchronization
  const addToCart = async (productOrId: number | Product, quantity = 1) => {
    if (!currentUser) return;

    let product: Product | undefined;
    let productId: number;

    if (typeof productOrId === "object") {
      product = productOrId;
      productId = productOrId.id;
      productsMap.current.set(product.id, product);
    } else {
      productId = productOrId;
      product = productsMap.current.get(productId);
    }

    const previousCart = cart;
    const tempId = -Date.now();
    const existingIndex = cart.findIndex((i) => i.product_id === productId);

    // 1. Instant local state update (0ms perceived latency)
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const updatedItem: CartItem = {
        ...existing,
        quantity: existing.quantity + quantity,
      };
      setCart((prev) =>
        prev.map((item, idx) => (idx === existingIndex ? updatedItem : item)),
      );
    } else if (product) {
      const optimisticItem: CartItem = {
        id: tempId,
        user_id: currentUser.id,
        product_id: productId,
        quantity,
        product,
      };
      setCart((prev) => [...prev, optimisticItem]);
    }

    // 2. Open drawer & show feedback immediately
    setIsCartOpen(true);
    notify("Added to your persistent bag", "success");

    // 3. Asynchronously sync to database backend
    try {
      const savedItem = await api.addToCart(
        currentUser.id,
        productId,
        quantity,
      );
      // Reconcile optimistic placeholder with authoritative server row
      setCart((prev) =>
        prev.map((item) =>
          item.id === tempId || (item.product_id === productId && item.id < 0)
            ? savedItem
            : item,
        ),
      );
    } catch (err: any) {
      // Automatic rollback on server-side rejection (e.g. stock exceeded)
      setCart(previousCart);
      notify(err.message || "Could not add item to bag", "error");
    }
  };

  // 0ms Optimistic Quantity Update
  const updateCartQuantity = async (itemId: number, quantity: number) => {
    if (!currentUser) return;
    const previousCart = cart;

    // 1. Instant local mutation
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      );
    }

    // 2. Background server synchronization
    try {
      if (quantity <= 0) {
        if (itemId > 0) {
          await api.removeCartItem(currentUser.id, itemId);
        }
      } else {
        if (itemId > 0) {
          await api.updateCartItem(currentUser.id, itemId, quantity);
        }
      }
    } catch (err: any) {
      // Rollback to previous state on failure
      setCart(previousCart);
      notify(err.message || "Could not update quantity", "error");
    }
  };

  // 0ms Optimistic Item Removal
  const removeFromCart = async (itemId: number) => {
    if (!currentUser) return;
    const previousCart = cart;

    // 1. Instant local removal
    setCart((prev) => prev.filter((i) => i.id !== itemId));
    notify("Item removed from bag", "success");

    // 2. Background server deletion
    try {
      if (itemId > 0) {
        await api.removeCartItem(currentUser.id, itemId);
      }
    } catch (err: any) {
      setCart(previousCart);
      notify(err.message || "Could not remove item", "error");
    }
  };

  return (
    <StoreContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser,
        cart,
        isCartOpen,
        setIsCartOpen,
        refreshCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        registerProducts,
        notify,
        catalogVersion,
        triggerCatalogRefresh,
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all flex items-center justify-between ${
              t.type === "error"
                ? "bg-rose-950/95 border-rose-800 text-rose-100"
                : "bg-zinc-900/95 border-zinc-800 text-zinc-100"
            }`}
          >
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
