import type { CartItem, StoreRoute, OrderPlan, OrderPlanOption, OrderPlanWithOptions } from "@/types/store";
import {
  getStoresWithAllProducts,
  getStoresForProduct,
  getCheapestStoreForProduct,
  getOpenStores,
} from "./store-service";
import { adminSupabase } from "@/lib/supabase-admin";

/**
 * Minimum Store Combination Algorithm (Set Cover Problem)
 * Finds the minimum number of stores needed to fulfill all cart items
 */
export async function findMinimumStores(
  cartItems: CartItem[]
): Promise<StoreRoute[]> {
  if (cartItems.length === 0) {
    return [];
  }

  // First, check if one store can fulfill everything
  const singleStore = await getStoresWithAllProducts(cartItems);
  if (singleStore.length > 0) {
    // Pick the cheapest single store by calculating total cost for each
    let cheapestStore = singleStore[0];
    let cheapestCost = Infinity;
    
    for (const store of singleStore) {
      const route = await buildRouteForStore(store.id, cartItems);
      const totalCost = route.reduce((sum, r) => sum + r.total_wholesale_cost, 0);
      if (totalCost < cheapestCost) {
        cheapestCost = totalCost;
        cheapestStore = store;
      }
    }
    
    return await buildRouteForStore(cheapestStore.id, cartItems);
  }

  // Multiple stores needed - use greedy set cover algorithm
  const remainingItems = new Map<number, number>(); // product_id -> quantity
  cartItems.forEach((item) => {
    remainingItems.set(item.product_id, item.quantity);
  });

  const routes: StoreRoute[] = [];
  const coveredProducts = new Set<number>();

  // Get all OPEN stores only (important!)
  const allStores = await getOpenStores();
  
  if (!allStores || allStores.length === 0) {
    return []; // No open stores available
  }

  // Get all product-store links in one query for efficiency
  const productIds = Array.from(remainingItems.keys());
  const { data: allLinks } = await adminSupabase
    .from("product_store_links")
    .select("product_id, store_id")
    .in("product_id", productIds);

  // Create a map: product_id -> Set of store_ids that have it
  const productStoreMap = new Map<number, Set<number>>();
  if (allLinks) {
    allLinks.forEach((link) => {
      if (!productStoreMap.has(link.product_id)) {
        productStoreMap.set(link.product_id, new Set());
      }
      productStoreMap.get(link.product_id)!.add(link.store_id);
    });
  }

  // Greedy approach: repeatedly pick the store that covers the most remaining items
  while (coveredProducts.size < cartItems.length) {
    let bestStore: { storeId: number; coverage: number } | null = null;
    let bestStoreItems: CartItem[] = [];

    // Check each store to see how many remaining items it can cover
    for (const store of allStores) {
      const storeItems: CartItem[] = [];
      let coverage = 0;

      for (const [productId, quantity] of remainingItems.entries()) {
        if (coveredProducts.has(productId)) {
          continue; // Already covered
        }

        // Check if this store has this product (using pre-fetched map)
        const storeSet = productStoreMap.get(productId);
        if (storeSet && storeSet.has(store.id)) {
          storeItems.push({ product_id: productId, quantity });
          coverage++;
        }
      }

      // Update best store if this one covers more items
      if (coverage > 0 && (!bestStore || coverage > bestStore.coverage)) {
        bestStore = { storeId: store.id, coverage };
        bestStoreItems = storeItems;
      }
    }

    if (!bestStore || bestStoreItems.length === 0) {
      break; // No more stores can cover remaining items
    }

    // Add route for best store
    const route = await buildRouteForStore(bestStore.storeId, bestStoreItems);
    routes.push(...route);

    // Mark products as covered
    bestStoreItems.forEach((item) => {
      coveredProducts.add(item.product_id);
      remainingItems.delete(item.product_id);
    });
  }

  return routes;
}

/**
 * Build a route for a single store with given items
 */
async function buildRouteForStore(
  storeId: number,
  items: CartItem[]
): Promise<StoreRoute[]> {
  // Get store details
  const { data: store } = await adminSupabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .single();

  if (!store) {
    return [];
  }

  // Get wholesale prices for all items
  const productIds = items.map((i) => i.product_id);
  const { data: costs } = await adminSupabase
    .from("product_store_costs")
    .select("product_id, wholesale_price")
    .eq("store_id", storeId)
    .in("product_id", productIds);

  const costMap = new Map<number, number>();
  if (costs) {
    costs.forEach((c) => {
      costMap.set(c.product_id, Number(c.wholesale_price));
    });
  }

  // Build route items
  const routeItems = items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    wholesale_price: costMap.get(item.product_id) || 0,
  }));

  const totalWholesaleCost = routeItems.reduce(
    (sum, item) => sum + item.wholesale_price * item.quantity,
    0
  );

  return [
    {
      store_id: store.id,
      store_name: store.name,
      items: routeItems,
      total_wholesale_cost: totalWholesaleCost,
    },
  ];
}

/**
 * Full Order Planning Algorithm
 * Returns complete plan with cheapest stores, routes, costs, and margins
 */
export async function planOrder(
  cartItems: CartItem[],
  customerPrices: Record<number, number> // product_id -> customer_price
): Promise<OrderPlan> {
  // 1. Get cheapest store for each item
  const cheapestStorePerItem: OrderPlan["cheapest_store_per_item"] = {};

  for (const item of cartItems) {
    const cheapest = await getCheapestStoreForProduct(item.product_id);
    if (cheapest) {
      cheapestStorePerItem[item.product_id] = {
        store_id: cheapest.id,
        store_name: cheapest.name,
        wholesale_price: cheapest.wholesale_price,
      };
    }
  }

  // 2. Find minimum store combination
  const storeRoutes = await findMinimumStores(cartItems);

  // 3. Calculate totals
  let totalWholesaleCost = 0;
  let totalCustomerPrice = 0;

  storeRoutes.forEach((route) => {
    totalWholesaleCost += route.total_wholesale_cost;
    route.items.forEach((item) => {
      const customerPrice = customerPrices[item.product_id] || 0;
      totalCustomerPrice += customerPrice * item.quantity;
    });
  });

  const totalMargin = totalCustomerPrice - totalWholesaleCost;

  return {
    cheapest_store_per_item: cheapestStorePerItem,
    store_route_plan: storeRoutes,
    total_wholesale_cost: totalWholesaleCost,
    total_margin: totalMargin,
    total_customer_price: totalCustomerPrice,
  };
}

/**
 * Optimized version: Prefer single store if possible, otherwise use minimum combination
 */
export async function planOrderOptimized(
  cartItems: CartItem[],
  customerPrices: Record<number, number>
): Promise<OrderPlan> {
  // Try single store first
  const singleStore = await getStoresWithAllProducts(cartItems);
  
  if (singleStore.length > 0) {
    // Find the cheapest single store by calculating total cost
    let cheapestStore = singleStore[0];
    let cheapestCost = Infinity;
    
    for (const store of singleStore) {
      const route = await buildRouteForStore(store.id, cartItems);
      const totalCost = route.reduce((sum, r) => sum + r.total_wholesale_cost, 0);
      if (totalCost < cheapestCost) {
        cheapestCost = totalCost;
        cheapestStore = store;
      }
    }
    
    // Use cheapest single store
    const storeRoutes = await buildRouteForStore(cheapestStore.id, cartItems);
    
    // Build cheapest store per item - show ACTUAL cheapest for each item
    // (even though we're using a single store for fulfillment)
    const cheapestStorePerItem: OrderPlan["cheapest_store_per_item"] = {};
    
    for (const item of cartItems) {
      const cheapest = await getCheapestStoreForProduct(item.product_id);
      if (cheapest) {
        cheapestStorePerItem[item.product_id] = {
          store_id: cheapest.id,
          store_name: cheapest.name,
          wholesale_price: cheapest.wholesale_price,
        };
      }
    }

    // Calculate totals
    let totalWholesaleCost = 0;
    let totalCustomerPrice = 0;

    storeRoutes.forEach((route) => {
      totalWholesaleCost += route.total_wholesale_cost;
      route.items.forEach((item) => {
        const customerPrice = customerPrices[item.product_id] || 0;
        totalCustomerPrice += customerPrice * item.quantity;
      });
    });

    return {
      cheapest_store_per_item: cheapestStorePerItem,
      store_route_plan: storeRoutes,
      total_wholesale_cost: totalWholesaleCost,
      total_margin: totalCustomerPrice - totalWholesaleCost,
      total_customer_price: totalCustomerPrice,
    };
  }

  // Fall back to minimum combination
  return planOrder(cartItems, customerPrices);
}

/**
 * Build complete plan for a single store
 */
async function buildCompletePlan(
  storeId: number,
  cartItems: CartItem[],
  customerPrices: Record<number, number>
): Promise<OrderPlan> {
  const route = await buildRouteForStore(storeId, cartItems);
  
  // Build cheapest store per item
  const cheapestStorePerItem: OrderPlan["cheapest_store_per_item"] = {};
  for (const item of cartItems) {
    const cheapest = await getCheapestStoreForProduct(item.product_id);
    if (cheapest) {
      cheapestStorePerItem[item.product_id] = {
        store_id: cheapest.id,
        store_name: cheapest.name,
        wholesale_price: cheapest.wholesale_price,
      };
    }
  }
  
  // Calculate totals
  let totalWholesaleCost = 0;
  let totalCustomerPrice = 0;
  
  route.forEach((r) => {
    totalWholesaleCost += r.total_wholesale_cost;
    r.items.forEach((item) => {
      const customerPrice = customerPrices[item.product_id] || 0;
      totalCustomerPrice += customerPrice * item.quantity;
    });
  });
  
  return {
    cheapest_store_per_item: cheapestStorePerItem,
    store_route_plan: route,
    total_wholesale_cost: totalWholesaleCost,
    total_margin: totalCustomerPrice - totalWholesaleCost,
    total_customer_price: totalCustomerPrice,
  };
}

/**
 * Build plan using cheapest store for each item (maximum profit)
 */
async function buildCheapestPerItemPlan(
  cartItems: CartItem[],
  customerPrices: Record<number, number>
): Promise<OrderPlan> {
  // Get cheapest store for each item
  const cheapestStorePerItem: OrderPlan["cheapest_store_per_item"] = {};
  const itemsByStore = new Map<number, CartItem[]>();
  
  for (const item of cartItems) {
    const cheapest = await getCheapestStoreForProduct(item.product_id);
    if (cheapest) {
      cheapestStorePerItem[item.product_id] = {
        store_id: cheapest.id,
        store_name: cheapest.name,
        wholesale_price: cheapest.wholesale_price,
      };
      
      // Group items by store
      if (!itemsByStore.has(cheapest.id)) {
        itemsByStore.set(cheapest.id, []);
      }
      itemsByStore.get(cheapest.id)!.push(item);
    }
  }
  
  // Build routes for each store
  const storeRoutes: StoreRoute[] = [];
  for (const [storeId, items] of itemsByStore.entries()) {
    const route = await buildRouteForStore(storeId, items);
    storeRoutes.push(...route);
  }
  
  // Calculate totals
  let totalWholesaleCost = 0;
  let totalCustomerPrice = 0;
  
  storeRoutes.forEach((route) => {
    totalWholesaleCost += route.total_wholesale_cost;
    route.items.forEach((item) => {
      const customerPrice = customerPrices[item.product_id] || 0;
      totalCustomerPrice += customerPrice * item.quantity;
    });
  });
  
  return {
    cheapest_store_per_item: cheapestStorePerItem,
    store_route_plan: storeRoutes,
    total_wholesale_cost: totalWholesaleCost,
    total_margin: totalCustomerPrice - totalWholesaleCost,
    total_customer_price: totalCustomerPrice,
  };
}

/**
 * Generate multiple order plan options with profit comparisons
 * Returns options: single store (recommended) and maximum profit (even if multiple stores)
 */
export async function planOrderWithOptions(
  cartItems: CartItem[],
  customerPrices: Record<number, number>
): Promise<OrderPlanWithOptions> {
  const options: OrderPlanOption[] = [];
  
  // Option 1: Single store (if available) - RECOMMENDED for convenience
  const singleStores = await getStoresWithAllProducts(cartItems);
  if (singleStores.length > 0) {
    // Find cheapest single store
    let cheapestSingleStore = singleStores[0];
    let cheapestCost = Infinity;
    
    for (const store of singleStores) {
      const route = await buildRouteForStore(store.id, cartItems);
      const totalCost = route.reduce((sum, r) => sum + r.total_wholesale_cost, 0);
      if (totalCost < cheapestCost) {
        cheapestCost = totalCost;
        cheapestSingleStore = store;
      }
    }
    
    const singleStorePlan = await buildCompletePlan(
      cheapestSingleStore.id,
      cartItems,
      customerPrices
    );
    
    options.push({
      id: 'single-store',
      plan: singleStorePlan,
      store_count: 1,
      recommendation: `Get everything from ${cheapestSingleStore.name} - easiest option, one trip`,
      is_recommended: true, // Recommended for convenience
    });
  }
  
  // Option 2: Maximum profit (cheapest per item) - may require multiple stores
  const maxProfitPlan = await buildCheapestPerItemPlan(cartItems, customerPrices);
  if (maxProfitPlan.store_route_plan.length > 0) {
    // Check if Option 2 is actually different from Option 1
    let isDifferent = false;
    
    if (options.length === 0) {
      // No single store option, so max profit is different
      isDifferent = true;
    } else {
      // Compare plans - check if stores, costs, or routes differ
      const option1 = options[0].plan;
      
      // Check total cost difference
      if (Math.abs(option1.total_wholesale_cost - maxProfitPlan.total_wholesale_cost) > 0.01) {
        isDifferent = true;
      }
      // Check store count difference
      else if (option1.store_route_plan.length !== maxProfitPlan.store_route_plan.length) {
        isDifferent = true;
      }
      // Check if different stores are used
      else {
        const option1StoreIds = new Set(option1.store_route_plan.map(r => r.store_id).sort());
        const option2StoreIds = new Set(maxProfitPlan.store_route_plan.map(r => r.store_id).sort());
        if (option1StoreIds.size !== option2StoreIds.size || 
            ![...option1StoreIds].every(id => option2StoreIds.has(id))) {
          isDifferent = true;
        }
      }
    }
    
    if (isDifferent) {
      const storeNames = maxProfitPlan.store_route_plan.map(r => r.store_name).join(" & ");
      options.push({
        id: 'max-profit',
        plan: maxProfitPlan,
        store_count: maxProfitPlan.store_route_plan.length,
        recommendation: maxProfitPlan.store_route_plan.length > 1
          ? `Split between ${maxProfitPlan.store_route_plan.length} stores - maximum profit`
          : `Get from ${storeNames} - maximum profit`,
        is_recommended: false,
      });
    } else if (options.length > 0) {
      // Options are identical - update Option 1 to note this
      options[0].recommendation = `${options[0].recommendation} (also maximum profit - no alternative available)`;
    }
  }
  
  // Calculate profit differences
  if (options.length > 0) {
    const baselineProfit = options[0].plan.total_margin;
    let maxProfit = baselineProfit;
    let maxProfitOptionId = options[0].id;
    
    options.forEach((option) => {
      option.profit_difference = option.plan.total_margin - baselineProfit;
      if (option.plan.total_margin > maxProfit) {
        maxProfit = option.plan.total_margin;
        maxProfitOptionId = option.id;
      }
    });
    
    return {
      options,
      baseline_profit: baselineProfit,
      max_profit: maxProfit,
      max_profit_option_id: maxProfitOptionId,
    };
  }
  
  // Fallback: no options available
  return {
    options: [],
    baseline_profit: 0,
    max_profit: 0,
    max_profit_option_id: '',
  };
}

