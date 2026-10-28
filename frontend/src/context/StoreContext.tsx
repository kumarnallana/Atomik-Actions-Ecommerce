"use client";

import { api } from "@/lib/api";
import { CartItem, User } from "@/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateCartQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  notify: (text: string, type?: "success" | "error") => void;
  catalogVersion: number;
  triggerCatalogRefresh: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const notify = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
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
    } catch (err) {
      console.error("Failed to load cart:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: number, quantity = 1) => {
    if (!currentUser) return;
    try {
      await api.addToCart(currentUser.id, productId, quantity);
      await refreshCart();
      notify("Added to your persistent bag", "success");
      setIsCartOpen(true);
    } catch (err: any) {
      notify(err.message || "Could not add item", "error");
    }
  };

  const updateCartQuantity = async (itemId: number, quantity: number) => {
    if (!currentUser) return;
    try {
      if (quantity <= 0) {
        await api.removeCartItem(currentUser.id, itemId);
      } else {
        await api.updateCartItem(currentUser.id, itemId, quantity);
      }
      await refreshCart();
    } catch (err: any) {
      notify(err.message || "Could not update quantity", "error");
    }
  };

  const removeFromCart = async (itemId: number) => {
    if (!currentUser) return;
    try {
      await api.removeCartItem(currentUser.id, itemId);
      await refreshCart();
      notify("Item removed from bag", "success");
    } catch (err: any) {
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
