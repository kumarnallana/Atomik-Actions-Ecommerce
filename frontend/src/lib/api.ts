import {
  CartItem,
  CouponInfo,
  CouponValidationResponse,
  Order,
  OrderStatus,
  Product,
  Review,
  User,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  getUsers: () => request<User[]>("/api/users"),

  getProducts: (params?: {
    category?: string;
    search?: string;
    min_price?: string;
    max_price?: string;
    sort_by?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== "All") query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    if (params?.min_price) query.set("min_price", params.min_price);
    if (params?.max_price) query.set("max_price", params.max_price);
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    const qs = query.toString();
    return request<Product[]>(`/api/products${qs ? `?${qs}` : ""}`);
  },

  getCategories: () => request<string[]>("/api/products/categories"),

  getProduct: (id: number) => request<Product>(`/api/products/${id}`),

  addReview: (productId: number, payload: { user_id: number; rating: number; comment: string }) =>
    request<Review>(`/api/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCart: (userId: number) => request<CartItem[]>(`/api/cart/${userId}`),

  addToCart: (userId: number, product_id: number, quantity = 1) =>
    request<CartItem>(`/api/cart/${userId}/items`, {
      method: "POST",
      body: JSON.stringify({ product_id, quantity }),
    }),

  updateCartItem: (userId: number, itemId: number, quantity: number) =>
    request<CartItem>(`/api/cart/${userId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  removeCartItem: (userId: number, itemId: number) =>
    request<{ status: string }>(`/api/cart/${userId}/items/${itemId}`, {
      method: "DELETE",
    }),

  getActiveCoupons: () => request<CouponInfo[]>("/api/coupons"),

  validateCoupon: (code: string, user_id?: number, subtotal?: number) =>
    request<CouponValidationResponse>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, user_id, subtotal }),
    }),

  checkout: (payload: {
    user_id: number;
    items?: { product_id: number; quantity: number }[];
    coupon_code?: string;
    shipping_address?: string;
  }) =>
    request<Order>("/api/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUserOrders: (userId: number) => request<Order[]>(`/api/orders/user/${userId}`),

  // Admin Endpoints
  getAllOrders: () => request<Order[]>("/api/admin/orders"),

  updateOrderStatus: (orderId: number, status: OrderStatus) =>
    request<Order>(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getLowStockProducts: (threshold = 3) =>
    request<Product[]>(`/api/admin/low-stock?threshold=${threshold}`),

  createProduct: (payload: {
    name: string;
    description: string;
    category: string;
    price: number;
    stock: number;
    image_url: string;
  }) =>
    request<Product>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProduct: (productId: number, payload: { stock?: number; price?: number }) =>
    request<Product>(`/api/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
