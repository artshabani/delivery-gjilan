import { adminSupabase } from "@/lib/supabase-admin";
import type {
  Store,
  ProductStoreCost,
  StoreWithCost,
  CartItem,
  StoreRoute,
  OrderPlan,
} from "@/types/store";

/**
 * Get current time in Gjilan timezone (CET/CEST - UTC+1 or UTC+2)
 * This ensures consistent timezone handling regardless of server location
 * Uses Europe/Belgrade as it's in the same timezone as Kosovo
 */
function getCurrentTimeInGjilan(): Date {
  // Kosovo/Gjilan uses the same timezone as Serbia (CET/CEST)
  // Use Europe/Belgrade which is widely supported
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Belgrade',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
    
    // Create a date object with the local time components
    // We only need hours and minutes for comparison
    return new Date(2000, 0, 1, hour, minute);
  } catch (error) {
    // Fallback: Use UTC+1 (CET) - this is approximate but better than server time
    // Note: This doesn't handle DST, but it's a fallback
    const utcNow = new Date();
    const cetOffset = 1; // UTC+1 for Central European Time
    const cetTime = new Date(utcNow.getTime() + (cetOffset * 60 * 60 * 1000));
    return new Date(2000, 0, 1, cetTime.getUTCHours(), cetTime.getUTCMinutes());
  }
}

/**
 * Check if a store is currently open based on operating hours
 * Uses Gjilan timezone (Europe/Pristina) for consistent behavior
 */
export function isStoreOpen(store: Store): boolean {
  // Check override first - if explicitly set to false, store is closed
  if (store.is_open_override !== undefined && !store.is_open_override) {
    return false;
  }

  // Get current time in Gjilan timezone
  const now = getCurrentTimeInGjilan();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  // If no operating hours set, use override or default to open
  if (!store.opens_at || !store.closes_at) {
    return store.is_open_override ?? true;
  }

  // Parse time strings (format: "HH:MM:SS" or "HH:MM")
  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const openTime = parseTime(store.opens_at);
  const closeTime = parseTime(store.closes_at);

  // Special case: 24/7 store (00:00:00 - 23:59:59) should always be open
  // We check if it's essentially 24 hours by seeing if it covers almost the entire day
  if (openTime === 0 && closeTime >= 1439) { // 1439 = 23:59
    return true;
  }

  // Normal case: opens_at < closes_at (e.g., 08:00 - 20:00)
  if (openTime < closeTime) {
    return currentTime >= openTime && currentTime < closeTime;
  } else {
    // Overnight case: opens_at > closes_at (e.g., 20:00 - 06:00)
    return currentTime >= openTime || currentTime < closeTime;
  }
}

/**
 * Get all stores that are currently open
 */
export async function getOpenStores(): Promise<Store[]> {
  const { data: stores, error } = await adminSupabase
    .from("stores")
    .select("id, name, is_open_override, opens_at, closes_at");

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }

  return (stores || []).filter(isStoreOpen);
}

/**
 * Get the cheapest store for a specific product that is currently open
 * Returns null if no store has the product or all stores are closed
 */
export async function getCheapestStoreForProduct(
  productId: number
): Promise<StoreWithCost | null> {
  // Get all open stores
  const openStores = await getOpenStores();
  if (openStores.length === 0) {
    console.log(`[getCheapestStoreForProduct] No open stores for product ${productId}`);
    return null;
  }

  const openStoreIds = openStores.map((s) => s.id);
  console.log(`[getCheapestStoreForProduct] Open stores for product ${productId}:`, openStores.map(s => s.name));

  // Get product-store links and costs for open stores
  const { data: links, error: linksError } = await adminSupabase
    .from("product_store_links")
    .select("store_id")
    .eq("product_id", productId)
    .in("store_id", openStoreIds);

  if (linksError || !links || links.length === 0) {
    console.log(`[getCheapestStoreForProduct] No product-store links for product ${productId} in open stores`);
    return null;
  }

  const linkedStoreIds = links.map((l) => l.store_id);
  console.log(`[getCheapestStoreForProduct] Product ${productId} linked to stores:`, linkedStoreIds);

  // Get wholesale prices for these stores
  const { data: costs, error: costsError } = await adminSupabase
    .from("product_store_costs")
    .select("store_id, wholesale_price")
    .eq("product_id", productId)
    .in("store_id", linkedStoreIds)
    .order("wholesale_price", { ascending: true })
    .limit(1);

  if (costsError || !costs || costs.length === 0) {
    console.log(`[getCheapestStoreForProduct] No cost data for product ${productId}, using fallback`);
    // If no cost data, return the first linked store (fallback)
    const store = openStores.find((s) => linkedStoreIds.includes(s.id));
    if (store) {
      return {
        ...store,
        wholesale_price: 0, // Default if no cost data
      };
    }
    return null;
  }

  const cheapestCost = costs[0];
  const store = openStores.find((s) => s.id === cheapestCost.store_id);

  if (!store) {
    console.log(`[getCheapestStoreForProduct] Store ${cheapestCost.store_id} not found in open stores`);
    return null;
  }

  console.log(`[getCheapestStoreForProduct] Selected cheapest store for product ${productId}: ${store.name} at €${cheapestCost.wholesale_price}`);
  return {
    ...store,
    wholesale_price: Number(cheapestCost.wholesale_price),
  };
}

/**
 * Get all stores that carry a specific product (with costs)
 */
export async function getStoresForProduct(
  productId: number,
  onlyOpen: boolean = true
): Promise<StoreWithCost[]> {
  // Get stores (open or all)
  const stores = onlyOpen ? await getOpenStores() : await getAllStores();
  if (stores.length === 0) {
    return [];
  }

  const storeIds = stores.map((s) => s.id);

  // Get product-store links
  const { data: links, error: linksError } = await adminSupabase
    .from("product_store_links")
    .select("store_id")
    .eq("product_id", productId)
    .in("store_id", storeIds);

  if (linksError || !links || links.length === 0) {
    return [];
  }

  const linkedStoreIds = links.map((l) => l.store_id);

  // Get wholesale prices
  const { data: costs, error: costsError } = await adminSupabase
    .from("product_store_costs")
    .select("store_id, wholesale_price")
    .eq("product_id", productId)
    .in("store_id", linkedStoreIds);

  // Create a map of store_id -> wholesale_price
  const costMap = new Map<number, number>();
  if (costs && !costsError) {
    costs.forEach((c) => {
      costMap.set(c.store_id, Number(c.wholesale_price));
    });
  }

  // Combine stores with costs
  return stores
    .filter((s) => linkedStoreIds.includes(s.id))
    .map((store) => ({
      ...store,
      wholesale_price: costMap.get(store.id) || 0,
    }))
    .sort((a, b) => a.wholesale_price - b.wholesale_price); // Sort by price
}

/**
 * Get all stores (regardless of open status)
 */
export async function getAllStores(): Promise<Store[]> {
  const { data: stores, error } = await adminSupabase
    .from("stores")
    .select("id, name, is_open_override, opens_at, closes_at");

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }

  return stores || [];
}

/**
 * Get stores that carry ALL products in the cart
 */
export async function getStoresWithAllProducts(
  cartItems: CartItem[]
): Promise<Store[]> {
  if (cartItems.length === 0) {
    return [];
  }

  const productIds = cartItems.map((item) => item.product_id);

  // Get all stores that have at least one of the products
  const { data: links, error } = await adminSupabase
    .from("product_store_links")
    .select("store_id, product_id")
    .in("product_id", productIds);

  if (error || !links || links.length === 0) {
    return [];
  }

  // Group by store_id and count unique products
  const storeProductCount = new Map<number, Set<number>>();
  links.forEach((link) => {
    if (!storeProductCount.has(link.store_id)) {
      storeProductCount.set(link.store_id, new Set());
    }
    storeProductCount.get(link.store_id)!.add(link.product_id);
  });

  // Find stores that have ALL products
  const storesWithAllProducts: number[] = [];
  storeProductCount.forEach((productSet, storeId) => {
    if (productSet.size === productIds.length) {
      storesWithAllProducts.push(storeId);
    }
  });

  // Get store details
  if (storesWithAllProducts.length === 0) {
    return [];
  }

  const { data: stores, error: storesError } = await adminSupabase
    .from("stores")
    .select("*")
    .in("id", storesWithAllProducts);

  if (storesError || !stores) {
    return [];
  }

  return stores.filter(isStoreOpen); // Only return open stores
}

