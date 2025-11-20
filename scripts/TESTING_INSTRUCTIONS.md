# Testing Instructions for Store Selection System

## Step 1: Setup Dummy Data

1. **Get your product IDs:**
   ```sql
   SELECT id, name, price FROM products ORDER BY id LIMIT 10;
   ```

2. **Open `scripts/dummy-data.sql`** and replace `110` with your actual product IDs

3. **Copy the entire SQL file** and paste it into Supabase SQL Editor

4. **Run the script** - it should complete without errors

## Step 2: Verify Data Was Inserted

Run these verification queries in Supabase SQL Editor:

### Query 1: Check Stores
```sql
SELECT id, name, is_open_override, opens_at, closes_at 
FROM stores
ORDER BY name;
```

**Expected Output:**
- Should see 5 stores: Day Store A, Day Store B, Night Store C, 24/7 Store D, Closed Store E
- Day Store A: opens_at = 08:00:00, closes_at = 20:00:00
- Night Store C: opens_at = 20:00:00, closes_at = 06:00:00 (overnight)
- 24/7 Store D: opens_at = 00:00:00, closes_at = 23:59:59

### Query 2: Check Product-Store Links
```sql
SELECT p.id as product_id, p.name as product, s.id as store_id, s.name as store
FROM product_store_links psl
JOIN products p ON p.id = psl.product_id
JOIN stores s ON s.id = psl.store_id
WHERE p.id = 110  -- Replace with your product ID
ORDER BY s.name;
```

**Expected Output:**
- Should see your product linked to: Day Store A, Day Store B, and 24/7 Store D
- Each row shows product_id, product name, store_id, and store name

### Query 3: Check Wholesale Prices
```sql
SELECT p.id as product_id, p.name as product, s.name as store, psc.wholesale_price
FROM product_store_costs psc
JOIN products p ON p.id = psc.product_id
JOIN stores s ON s.id = psc.store_id
WHERE p.id = 110  -- Replace with your product ID
ORDER BY psc.wholesale_price;
```

**Expected Output:**
- Should see 3 rows for product 110:
  - Day Store A: €7.00 (cheapest)
  - 24/7 Store D: €7.50
  - Day Store B: €8.00
- Prices should be ordered from lowest to highest

### Query 4: Check Store Availability (Current Time)
```sql
SELECT 
  id, 
  name, 
  is_open_override,
  opens_at, 
  closes_at,
  CASE 
    WHEN is_open_override = false THEN false
    WHEN opens_at IS NULL OR closes_at IS NULL THEN COALESCE(is_open_override, true)
    WHEN opens_at::time < closes_at::time THEN 
      CURRENT_TIME >= opens_at::time AND CURRENT_TIME < closes_at::time
    ELSE 
      CURRENT_TIME >= opens_at::time OR CURRENT_TIME < closes_at::time
  END as is_currently_open
FROM stores
ORDER BY name;
```

**Expected Output:**
- During day hours (8 AM - 8 PM): Day Store A and B should show `is_currently_open = true`
- During night hours (after 8 PM): Night Store C should show `is_currently_open = true`
- 24/7 Store D should always show `is_currently_open = true`
- Closed Store E should always show `is_currently_open = false`

## Step 3: Test in Dashboard

1. **Go to:** `/admin/store-planning` in your app

2. **Select a product** that you linked to stores (e.g., product 110)

3. **Set quantity** (e.g., 2)

4. **Click "Plan Order"**

## Step 4: Expected Dashboard Output

### If testing during day hours (8 AM - 8 PM):

**Summary:**
- Stores Needed: **1**
- Total Wholesale Cost: **€14.00** (2 × €7.00)
- Total Customer Price: **€[your product price × 2]**
- Total Margin: **€[customer price - 14.00]**

**Cheapest Store Per Item:**
- Your Product Name: **Day Store A (€7.00)**

**Store Routes:**
- **Store: Day Store A (ID: [store_id])**
  - Your Product Name × 2 (€7.00 each)
  - Cost: €14.00

### If testing during night hours (after 8 PM):

**Summary:**
- Stores Needed: **1**
- Total Wholesale Cost: **€15.00** (2 × €7.50) - Uses 24/7 Store D
- Total Customer Price: **€[your product price × 2]**
- Total Margin: **€[customer price - 15.00]**

**Cheapest Store Per Item:**
- Your Product Name: **24/7 Store D (€7.50)** - Day stores are closed

**Store Routes:**
- **Store: 24/7 Store D (ID: [store_id])**
  - Your Product Name × 2 (€7.50 each)
  - Cost: €15.00

## Step 5: Test Multiple Products

1. **Link 2-3 different products** to different stores
2. **Set different wholesale prices** for each product-store combination
3. **Select multiple products** in the dashboard
4. **Verify** the system picks the cheapest store for each product

## Troubleshooting

### Issue: "No stores found" or "No products linked"
- **Check:** Run Query 2 above to verify product-store links exist
- **Fix:** Make sure you replaced product IDs in the SQL script

### Issue: "No wholesale prices"
- **Check:** Run Query 3 above to verify prices exist
- **Fix:** Make sure you inserted prices for all product-store combinations

### Issue: Wrong store selected
- **Check:** Run Query 4 to see which stores are currently open
- **Check:** Verify wholesale prices are correct (Query 3)
- **Note:** System only uses stores that are currently open

### Issue: Dashboard shows error
- **Check browser console** for error messages
- **Check:** Make sure you're logged in as admin
- **Check:** Verify API endpoint `/api/orders/plan` is accessible

## Success Criteria

✅ **System is working correctly if:**
1. Dashboard loads without errors
2. Products appear in the selection list
3. "Plan Order" button works
4. Results show correct store selection
5. Cheapest store is selected for each product
6. Costs and margins are calculated correctly
7. Store routes show correct items and quantities

## Next Steps

Once basic testing works:
1. Add more products with different store combinations
2. Test minimum store combination (products from different stores)
3. Test during different times of day
4. Test with manually closed stores (is_open_override = false)





