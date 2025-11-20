# Store Selection System Documentation

## Overview

This system implements a comprehensive store-selection and order planning algorithm for the delivery app. It determines the optimal stores to fulfill orders based on product availability, wholesale prices, and store operating hours.

## Database Schema

### Required Tables

1. **`stores`** - Store information
   ```sql
   - id (primary key)
   - name
   - is_open (boolean)
   - day_open_time (text, format: "HH:MM")
   - day_close_time (text, format: "HH:MM")
   - night_open_time (text, format: "HH:MM")
   - night_close_time (text, format: "HH:MM")
   - is_day_store (boolean)
   - is_night_store (boolean)
   ```

2. **`product_store_links`** - Links products to stores (already exists)
   ```sql
   - product_id (foreign key -> products.id)
   - store_id (foreign key -> stores.id)
   ```

3. **`product_store_costs`** - Wholesale prices per store (already exists)
   ```sql
   - product_id (foreign key -> products.id)
   - store_id (foreign key -> stores.id)
   - wholesale_price (numeric)
   ```

## Features

### 1. Store Availability Check
- Determines if a store is currently open based on day/night hours
- Handles stores that operate during day, night, or both
- Supports stores with hours spanning midnight

### 2. Cheapest Store Selection
- Finds the store with the lowest wholesale price for a product
- Only considers stores that are currently open
- Returns `null` if no open store has the product

### 3. Minimum Store Combination
- Implements a greedy set cover algorithm
- Finds the minimum number of stores needed to fulfill all cart items
- Prefers single-store fulfillment when possible

### 4. Order Planning
- Calculates optimal route plan for an order
- Returns:
  - Cheapest store per item
  - Store route plan (which items from which stores)
  - Total wholesale cost
  - Total margin (customer price - wholesale cost)

## API Endpoints

### POST `/api/orders/plan`

Plan an order and get the optimal store selection.

**Request Body:**
```json
{
  "cartItems": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ],
  "customerPrices": {
    "1": 10.50,
    "3": 5.00
  }
}
```

**Response:**
```json
{
  "plan": {
    "cheapest_store_per_item": {
      "1": {
        "store_id": 2,
        "store_name": "Store A",
        "wholesale_price": 8.00
      },
      "3": {
        "store_id": 2,
        "store_name": "Store A",
        "wholesale_price": 4.00
      }
    },
    "store_route_plan": [
      {
        "store_id": 2,
        "store_name": "Store A",
        "items": [
          { "product_id": 1, "quantity": 2, "wholesale_price": 8.00 },
          { "product_id": 3, "quantity": 1, "wholesale_price": 4.00 }
        ],
        "total_wholesale_cost": 20.00
      }
    ],
    "total_wholesale_cost": 20.00,
    "total_margin": 0.50,
    "total_customer_price": 20.50
  }
}
```

## TypeScript Services

### `lib/store-service.ts`

Core store-related functions:

- `isStoreOpen(store: Store): boolean` - Check if store is currently open
- `getOpenStores(): Promise<Store[]>` - Get all currently open stores
- `getCheapestStoreForProduct(productId: number): Promise<StoreWithCost | null>` - Get cheapest open store for a product
- `getStoresForProduct(productId: number, onlyOpen?: boolean): Promise<StoreWithCost[]>` - Get all stores that carry a product
- `getStoresWithAllProducts(cartItems: CartItem[]): Promise<Store[]>` - Get stores that have ALL cart items

### `lib/order-planning.ts`

Order planning algorithms:

- `findMinimumStores(cartItems: CartItem[]): Promise<StoreRoute[]>` - Find minimum stores needed
- `planOrder(cartItems, customerPrices): Promise<OrderPlan>` - Full order planning
- `planOrderOptimized(cartItems, customerPrices): Promise<OrderPlan>` - Optimized version (prefers single store)

## Usage Examples

### Example 1: Get Cheapest Store for a Product

```typescript
import { getCheapestStoreForProduct } from "@/lib/store-service";

const cheapest = await getCheapestStoreForProduct(123);
if (cheapest) {
  console.log(`Cheapest store: ${cheapest.name} at €${cheapest.wholesale_price}`);
}
```

### Example 2: Plan an Order

```typescript
import { planOrderOptimized } from "@/lib/order-planning";

const cartItems = [
  { product_id: 1, quantity: 2 },
  { product_id: 3, quantity: 1 }
];

const customerPrices = {
  1: 10.50,
  3: 5.00
};

const plan = await planOrderOptimized(cartItems, customerPrices);
console.log(`Total margin: €${plan.total_margin}`);
console.log(`Stores needed: ${plan.store_route_plan.length}`);
```

### Example 3: Check Store Availability

```typescript
import { isStoreOpen, getOpenStores } from "@/lib/store-service";

const store = { id: 1, name: "Store A", day_open_time: "08:00", day_close_time: "20:00", is_day_store: true };
const isOpen = isStoreOpen(store);

const openStores = await getOpenStores();
console.log(`${openStores.length} stores are currently open`);
```

## Admin Interface

### Adding Products with Wholesale Prices

When adding a product:
1. Select which stores carry the product (checkboxes)
2. For each selected store, enter the wholesale price
3. The system validates that all selected stores have prices

### Editing Products

When editing a product:
1. Existing wholesale prices are loaded automatically
2. You can modify prices for existing stores
3. When adding new stores, you must provide wholesale prices

## Algorithm Details

### Minimum Store Combination (Set Cover)

The algorithm uses a greedy approach:

1. First, check if a single store can fulfill all items
2. If not, repeatedly:
   - Find the store that covers the most remaining items
   - Add that store to the route
   - Mark covered items as fulfilled
   - Continue until all items are covered

This is a greedy approximation of the set cover problem, which is NP-hard. For most practical cases, this provides good results.

### Day/Night Store Logic

- **Day stores**: Operate during normal business hours (e.g., 08:00 - 20:00)
- **Night stores**: Operate during night hours (e.g., 20:00 - 06:00)
- Stores can be both day and night stores
- The system automatically switches to night stores when day stores close

## Performance Considerations

- The system queries the database for each product/store combination
- For large carts, consider caching store availability
- The greedy algorithm is O(n*m) where n = stores, m = products
- For production, consider adding database indexes on:
  - `product_store_links(product_id, store_id)`
  - `product_store_costs(product_id, store_id)`
  - `stores(is_day_store, is_night_store)`

## Future Enhancements

- [ ] Caching layer for store availability
- [ ] Batch queries for multiple products
- [ ] More sophisticated optimization (considering delivery distance)
- [ ] Real-time store status updates
- [ ] Store capacity constraints
- [ ] Historical performance metrics





