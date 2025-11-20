export interface Store {
  id: number;
  name: string;
  is_open_override?: boolean;
  opens_at?: string; // Format: "HH:MM:SS" or "HH:MM" (e.g., "08:00:00")
  closes_at?: string; // Format: "HH:MM:SS" or "HH:MM" (e.g., "20:00:00")
}

export interface ProductStoreCost {
  product_id: number;
  store_id: number;
  wholesale_price: number;
}

export interface ProductStoreLink {
  product_id: number;
  store_id: number;
}

export interface StoreWithCost extends Store {
  wholesale_price: number;
}

export interface CartItem {
  product_id: number;
  quantity: number;
}

export interface StoreRouteItem {
  product_id: number;
  quantity: number;
  wholesale_price: number;
}

export interface StoreRoute {
  store_id: number;
  store_name: string;
  items: StoreRouteItem[];
  total_wholesale_cost: number;
}

export interface OrderPlan {
  cheapest_store_per_item: Record<number, {
    store_id: number;
    store_name: string;
    wholesale_price: number;
  }>;
  store_route_plan: StoreRoute[];
  total_wholesale_cost: number;
  total_margin: number; // Total customer price - total wholesale cost
  total_customer_price: number;
}

export interface OrderPlanOption {
  id: string;
  plan: OrderPlan;
  store_count: number;
  recommendation: string; // e.g., "Single store - easiest option"
  profit_difference?: number; // Compared to baseline (first option)
  is_recommended?: boolean;
}

export interface OrderPlanWithOptions {
  options: OrderPlanOption[];
  baseline_profit: number; // Profit of first (easiest) option
  max_profit: number; // Maximum profit possible
  max_profit_option_id: string;
}

