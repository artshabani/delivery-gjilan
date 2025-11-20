-- ============================================
-- COMPLETE DUMMY DATA FOR STORE SELECTION SYSTEM TESTING
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor

-- STEP 1: Delete existing stores (Meridian and Leari)
DELETE FROM stores WHERE name IN ('Meridian', 'Leari');

-- STEP 2: Get a category_id (required for products)
-- Run this first to get a category ID, then replace CATEGORY_ID below:
-- SELECT id, name FROM product_categories LIMIT 1;
-- If you don't have categories, create one:
-- INSERT INTO product_categories (name, parent_id, sort_order) VALUES ('Test Category', NULL, 1) RETURNING id;

-- STEP 3: Insert Test Stores
INSERT INTO stores (name, is_open_override, opens_at, closes_at)
VALUES
  ('Day Store A', true, '08:00:00', '20:00:00'),
  ('Day Store B', true, '09:00:00', '18:00:00'),
  ('Night Store C', true, '20:00:00', '06:00:00'),  -- Overnight store (8 PM - 6 AM)
  ('24/7 Store D', true, '00:00:00', '23:59:59'),   -- Always open
  ('Closed Store E', false, '08:00:00', '20:00:00') -- Manually closed (override)
ON CONFLICT DO NOTHING;

-- STEP 4: Create Test Products
-- IMPORTANT: Replace CATEGORY_ID with an actual category_id from your database
-- Get one with: SELECT id FROM product_categories LIMIT 1;

-- Create 5 test products with different scenarios
INSERT INTO products (name, price, category_id, image_url, in_stock)
SELECT * FROM (VALUES
  ('Test Product Alpha', 10.00, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Test Product Beta', 15.50, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Test Product Gamma', 8.75, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Test Product Delta', 12.00, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Test Product Epsilon', 20.00, (SELECT id FROM product_categories LIMIT 1), NULL, true)
) AS v(name, price, category_id, image_url, in_stock)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name)
RETURNING id, name;

-- STEP 5: Link Products to Stores (Multiple stores per product for testing)

-- Product Alpha: Available in Store A, B, D (3 stores)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Alpha'
  AND s.name IN ('Day Store A', 'Day Store B', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Product Beta: Available in Store A, C, D (3 stores - includes night store)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Beta'
  AND s.name IN ('Day Store A', 'Night Store C', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Product Gamma: Available in Store B, D (2 stores)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Gamma'
  AND s.name IN ('Day Store B', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Product Delta: Available in ALL stores (A, B, C, D) - 4 stores
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Delta'
  AND s.name IN ('Day Store A', 'Day Store B', 'Night Store C', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Product Epsilon: Available ONLY in Store D (1 store - single source)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Epsilon'
  AND s.name = '24/7 Store D'
ON CONFLICT (product_id, store_id) DO NOTHING;

-- STEP 6: Insert Wholesale Prices (Different prices per store for testing)

-- Product Alpha: Store A cheapest (€7.00), Store B (€8.00), Store D (€7.50)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id, 
  CASE s.name
    WHEN 'Day Store A' THEN 7.00
    WHEN 'Day Store B' THEN 8.00
    WHEN '24/7 Store D' THEN 7.50
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Alpha'
  AND s.name IN ('Day Store A', 'Day Store B', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Product Beta: Store A cheapest (€12.00), Store C (€13.00), Store D (€12.50)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 12.00
    WHEN 'Night Store C' THEN 13.00
    WHEN '24/7 Store D' THEN 12.50
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Beta'
  AND s.name IN ('Day Store A', 'Night Store C', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Product Gamma: Store B cheapest (€6.00), Store D (€6.50)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store B' THEN 6.00
    WHEN '24/7 Store D' THEN 6.50
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Gamma'
  AND s.name IN ('Day Store B', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Product Delta: Store A cheapest (€9.00), Store B (€10.00), Store C (€10.50), Store D (€9.50)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 9.00
    WHEN 'Day Store B' THEN 10.00
    WHEN 'Night Store C' THEN 10.50
    WHEN '24/7 Store D' THEN 9.50
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Delta'
  AND s.name IN ('Day Store A', 'Day Store B', 'Night Store C', '24/7 Store D')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Product Epsilon: Only in Store D (€15.00)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id, 15.00
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Test Product Epsilon'
  AND s.name = '24/7 Store D'
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- ============================================
-- COMPREHENSIVE TEST QUERY
-- ============================================
-- Run this query to verify everything is set up correctly

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
    -- Calculate if store is currently open
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
)
SELECT 
  product_id,
  product_name,
  customer_price,
  store_name,
  wholesale_price,
  margin,
  is_currently_open,
  -- Find cheapest store per product
  CASE 
    WHEN wholesale_price = (
      SELECT MIN(wholesale_price) 
      FROM test_data t2 
      WHERE t2.product_id = test_data.product_id 
        AND t2.is_currently_open = true
    ) THEN '⭐ CHEAPEST'
    ELSE ''
  END as cheapest_indicator
FROM test_data
WHERE is_currently_open = true  -- Only show open stores
ORDER BY product_name, wholesale_price;

-- ============================================
-- EXPECTED OUTPUT FOR TEST QUERY
-- ============================================
-- During DAY hours (8 AM - 8 PM), you should see:

-- Test Product Alpha:
--   - Day Store A: €7.00 (⭐ CHEAPEST) - Margin: €3.00
--   - Day Store B: €8.00 - Margin: €2.00
--   - 24/7 Store D: €7.50 - Margin: €2.50

-- Test Product Beta:
--   - Day Store A: €12.00 (⭐ CHEAPEST) - Margin: €3.50
--   - 24/7 Store D: €12.50 - Margin: €3.00
--   (Night Store C won't show during day)

-- Test Product Gamma:
--   - Day Store B: €6.00 (⭐ CHEAPEST) - Margin: €2.75
--   - 24/7 Store D: €6.50 - Margin: €2.25

-- Test Product Delta:
--   - Day Store A: €9.00 (⭐ CHEAPEST) - Margin: €3.00
--   - Day Store B: €10.00 - Margin: €2.00
--   - 24/7 Store D: €9.50 - Margin: €2.50

-- Test Product Epsilon:
--   - 24/7 Store D: €15.00 (⭐ CHEAPEST) - Margin: €5.00

-- During NIGHT hours (after 8 PM), Night Store C should appear for Beta and Delta

-- ============================================
-- VERIFICATION QUERIES (Run separately if needed)
-- ============================================

-- 1. Check stores
SELECT id, name, is_open_override, opens_at, closes_at 
FROM stores
ORDER BY name;

-- 2. Check products
SELECT id, name, price FROM products WHERE name LIKE 'Test Product%' ORDER BY name;

-- 3. Check product-store links
SELECT p.name as product, s.name as store
FROM product_store_links psl
JOIN products p ON p.id = psl.product_id
JOIN stores s ON s.id = psl.store_id
WHERE p.name LIKE 'Test Product%'
ORDER BY p.name, s.name;

-- 4. Check wholesale prices
SELECT p.name as product, s.name as store, psc.wholesale_price
FROM product_store_costs psc
JOIN products p ON p.id = psc.product_id
JOIN stores s ON s.id = psc.store_id
WHERE p.name LIKE 'Test Product%'
ORDER BY p.name, psc.wholesale_price;
