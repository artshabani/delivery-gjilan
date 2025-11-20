-- ============================================
-- COMPREHENSIVE TEST QUERY
-- ============================================
-- Run this AFTER running dummy-data.sql
-- This query tests all algorithms and shows expected behavior

WITH test_data AS (
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.price as customer_price,
    s.id as store_id,
    s.name as store_name,
    s.is_open_override,
    s.opens_at,
    s.closes_at,
    psc.wholesale_price,
    -- Calculate if store is currently open (matches isStoreOpen function)
    CASE 
      WHEN s.is_open_override = false THEN false
      WHEN s.opens_at IS NULL OR s.closes_at IS NULL THEN COALESCE(s.is_open_override, true)
      WHEN s.opens_at::time < s.closes_at::time THEN 
        CURRENT_TIME >= s.opens_at::time AND CURRENT_TIME < s.closes_at::time
      ELSE 
        CURRENT_TIME >= s.opens_at::time OR CURRENT_TIME < s.closes_at::time
    END as is_currently_open,
    -- Calculate margin
    (p.price - COALESCE(psc.wholesale_price, 0)) as margin
  FROM products p
  JOIN product_store_links psl ON p.id = psl.product_id
  JOIN stores s ON psl.store_id = s.id
  LEFT JOIN product_store_costs psc ON p.id = psc.product_id AND s.id = psc.store_id
  WHERE p.name LIKE 'Test Product%'
),
cheapest_per_product AS (
  SELECT 
    product_id,
    MIN(wholesale_price) as min_price
  FROM test_data
  WHERE is_currently_open = true
  GROUP BY product_id
)
SELECT 
  td.product_id,
  td.product_name,
  td.customer_price,
  td.store_name,
  td.wholesale_price,
  td.margin,
  td.is_currently_open,
  CASE 
    WHEN td.wholesale_price = cp.min_price THEN '⭐ CHEAPEST'
    ELSE ''
  END as cheapest_indicator,
  -- Show which stores are available for this product
  (SELECT COUNT(*) FROM test_data t2 
   WHERE t2.product_id = td.product_id AND t2.is_currently_open = true) as open_stores_count
FROM test_data td
LEFT JOIN cheapest_per_product cp ON td.product_id = cp.product_id
WHERE td.is_currently_open = true  -- Only show open stores
ORDER BY td.product_name, td.wholesale_price;

-- ============================================
-- EXPECTED OUTPUT (During DAY hours: 8 AM - 8 PM)
-- ============================================

-- Test Product Alpha:
--   product_id | product_name        | customer_price | store_name   | wholesale_price | margin | is_currently_open | cheapest_indicator | open_stores_count
--   -----------|---------------------|----------------|--------------|-----------------|--------|-------------------|---------------------|------------------
--   X          | Test Product Alpha  | 10.00          | Day Store A  | 7.00            | 3.00   | true              | ⭐ CHEAPEST        | 3
--   X          | Test Product Alpha  | 10.00          | 24/7 Store D | 7.50            | 2.50   | true              |                     | 3
--   X          | Test Product Alpha  | 10.00          | Day Store B  | 8.00            | 2.00   | true              |                     | 3

-- Test Product Beta:
--   X          | Test Product Beta   | 15.50          | Day Store A  | 12.00           | 3.50   | true              | ⭐ CHEAPEST        | 2
--   X          | Test Product Beta   | 15.50          | 24/7 Store D | 12.50           | 3.00   | true              |                     | 2
--   (Night Store C won't show during day)

-- Test Product Gamma:
--   X          | Test Product Gamma  | 8.75           | Day Store B  | 6.00            | 2.75   | true              | ⭐ CHEAPEST        | 2
--   X          | Test Product Gamma  | 8.75           | 24/7 Store D | 6.50            | 2.25   | true              |                     | 2

-- Test Product Delta:
--   X          | Test Product Delta  | 12.00          | Day Store A  | 9.00            | 3.00   | true              | ⭐ CHEAPEST        | 3
--   X          | Test Product Delta  | 12.00          | 24/7 Store D | 9.50            | 2.50   | true              |                     | 3
--   X          | Test Product Delta  | 12.00          | Day Store B  | 10.00           | 2.00   | true              |                     | 3

-- Test Product Epsilon:
--   X          | Test Product Epsilon| 20.00          | 24/7 Store D | 15.00           | 5.00   | true              | ⭐ CHEAPEST        | 1

-- ============================================
-- TEST SCENARIOS TO VERIFY
-- ============================================

-- Scenario 1: Single Product, Multiple Stores
-- Product: Test Product Alpha
-- Expected: Day Store A selected (cheapest at €7.00)

-- Scenario 2: Product Only in One Store
-- Product: Test Product Epsilon
-- Expected: 24/7 Store D selected (only option)

-- Scenario 3: Night Store Availability
-- Time: After 8 PM
-- Product: Test Product Beta
-- Expected: Night Store C or 24/7 Store D (day stores closed)

-- Scenario 4: Multiple Products, Single Store
-- Products: Test Product Alpha + Test Product Beta
-- Expected: Day Store A can fulfill both (cheapest for both)

-- Scenario 5: Multiple Products, Multiple Stores
-- Products: Test Product Alpha + Test Product Gamma
-- Expected: Day Store A for Alpha, Day Store B for Gamma (or Store D for both)

-- ============================================
-- DASHBOARD TEST CHECKLIST
-- ============================================

-- ✅ Test 1: Select "Test Product Alpha" × 2
--    Expected: Day Store A, Total Wholesale: €14.00, Margin: €6.00

-- ✅ Test 2: Select "Test Product Epsilon" × 1
--    Expected: 24/7 Store D, Total Wholesale: €15.00, Margin: €5.00

-- ✅ Test 3: Select "Test Product Alpha" × 1 + "Test Product Beta" × 1
--    Expected: Day Store A for both, Total Wholesale: €19.00, Margin: €6.50

-- ✅ Test 4: Select "Test Product Alpha" × 1 + "Test Product Gamma" × 1
--    Expected: Day Store A for Alpha, Day Store B for Gamma (or Store D for both)
--    Total Wholesale: €13.00 or €14.00 depending on algorithm

-- ✅ Test 5: Test during night hours (after 8 PM)
--    Select "Test Product Beta" × 1
--    Expected: Night Store C or 24/7 Store D (Day Store A should be closed)





