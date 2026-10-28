export interface User {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin";
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  reviews?: Review[];
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  product: Product;
}

export interface CouponInfo {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number;
  expires_at: string;
}

export interface CouponValidationResponse {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number;
  discount_amount: number;
  subtotal: number;
  final_total: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product: Product;
}

export type OrderStatus = "Placed" | "Shipped" | "Delivered";

export interface Order {
  id: number;
  user_id: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  shipping_address: string;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
  user?: User;
}
