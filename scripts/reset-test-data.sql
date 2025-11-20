-- ============================================
-- RESET AND CREATE ENHANCED TEST DATA
-- ============================================
-- Run this to delete all test data and create fresh test data with more products

-- STEP 1: Delete all test products and their links
DELETE FROM product_store_costs WHERE product_id IN (
  SELECT id FROM products WHERE name LIKE 'Test Product%'
);
DELETE FROM product_store_links WHERE product_id IN (
  SELECT id FROM products WHERE name LIKE 'Test Product%'
);
DELETE FROM products WHERE name LIKE 'Test Product%';

-- STEP 2: Delete test stores
DELETE FROM stores WHERE name IN (
  'Day Store A', 
  'Day Store B', 
  'Day Store C',
  'Night Store D', 
  '24/7 Store E', 
  'Closed Store E'
);

-- STEP 3: Insert Test Stores (3 day stores, 1 night, 1 24/7)
INSERT INTO stores (name, is_open_override, opens_at, closes_at)
VALUES
  ('Day Store A', true, '08:00:00', '22:30:00'),
  ('Day Store B', true, '08:00:00', '22:30:00'),
  ('Day Store C', true, '08:00:00', '22:30:00'),
  ('Night Store D', true, '20:00:00', '06:00:00'),
  ('24/7 Store E', true, '00:00:00', '23:59:59')
ON CONFLICT DO NOTHING;

-- STEP 4: Create 10 Test Products
INSERT INTO products (name, price, category_id, image_url, in_stock)
SELECT * FROM (VALUES
  ('Milk 1L', 2.50, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Bread White', 1.80, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Eggs 12pcs', 3.20, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Chicken 1kg', 8.50, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Rice 1kg', 2.00, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Pasta 500g', 1.50, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Tomatoes 1kg', 3.00, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Onions 1kg', 1.20, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Potatoes 1kg', 1.50, (SELECT id FROM product_categories LIMIT 1), NULL, true),
  ('Cooking Oil 1L', 4.50, (SELECT id FROM product_categories LIMIT 1), NULL, true)
) AS v(name, price, category_id, image_url, in_stock)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name)
RETURNING id, name;

-- STEP 5: Link Products to Stores

-- Milk: Available in Store A (cheapest), B, C, E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Milk 1L'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Bread: Available in Store A, B (cheapest), C, E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Bread White'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Eggs: Available in Store A, B, C (cheapest), E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Eggs 12pcs'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Chicken: Available in Store A (cheapest), B, C, E (NOT in Store E to force split scenarios)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Chicken 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Rice: Available in Store A, B (cheapest), C, E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Rice 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Pasta: Available in Store A, B, C (cheapest), E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Pasta 500g'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Tomatoes: Available in Store A (cheapest), B, C (NOT in Store E to create split scenarios)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Tomatoes 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Onions: Available in Store A, B (cheapest), C, E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Onions 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Potatoes: Available in Store A, B, C (cheapest), E
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Potatoes 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO NOTHING;

-- Cooking Oil: Available ONLY in Store E (24/7)
INSERT INTO product_store_links (product_id, store_id)
SELECT p.id, s.id 
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Cooking Oil 1L'
  AND s.name = '24/7 Store E'
ON CONFLICT (product_id, store_id) DO NOTHING;

-- STEP 6: Insert Wholesale Prices

-- Milk: Store A cheapest (€1.80), B (€1.90), C (€2.00), E (€2.10)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id, 
  CASE s.name
    WHEN 'Day Store A' THEN 1.80
    WHEN 'Day Store B' THEN 1.90
    WHEN 'Day Store C' THEN 2.00
    WHEN '24/7 Store E' THEN 2.10
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Milk 1L'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Bread: Store A (€1.20), B cheapest (€1.15), C (€1.25), E (€1.30)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 1.20
    WHEN 'Day Store B' THEN 1.15
    WHEN 'Day Store C' THEN 1.25
    WHEN '24/7 Store E' THEN 1.30
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Bread White'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Eggs: Store A (€2.40), B (€2.35), C cheapest (€2.30), E (€2.50)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 2.40
    WHEN 'Day Store B' THEN 2.35
    WHEN 'Day Store C' THEN 2.30
    WHEN '24/7 Store E' THEN 2.50
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Eggs 12pcs'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Chicken: Store A cheapest (€6.50), B (€6.80), C (€6.90)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 6.50
    WHEN 'Day Store B' THEN 6.80
    WHEN 'Day Store C' THEN 6.90
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Chicken 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Rice: Store A (€1.50), B cheapest (€1.40), C (€1.55), E (€1.60)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 1.50
    WHEN 'Day Store B' THEN 1.40
    WHEN 'Day Store C' THEN 1.55
    WHEN '24/7 Store E' THEN 1.60
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Rice 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Pasta: Store A (€1.10), B (€1.05), C cheapest (€1.00), E (€1.15)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 1.10
    WHEN 'Day Store B' THEN 1.05
    WHEN 'Day Store C' THEN 1.00
    WHEN '24/7 Store E' THEN 1.15
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Pasta 500g'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Tomatoes: Store A cheapest (€2.20), B (€2.30), C (€2.40)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 2.20
    WHEN 'Day Store B' THEN 2.30
    WHEN 'Day Store C' THEN 2.40
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Tomatoes 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Onions: Store A (€0.90), B cheapest (€0.85), C (€0.95), E (€1.00)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 0.90
    WHEN 'Day Store B' THEN 0.85
    WHEN 'Day Store C' THEN 0.95
    WHEN '24/7 Store E' THEN 1.00
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Onions 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Potatoes: Store A (€1.10), B (€1.05), C cheapest (€1.00), E (€1.15)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id,
  CASE s.name
    WHEN 'Day Store A' THEN 1.10
    WHEN 'Day Store B' THEN 1.05
    WHEN 'Day Store C' THEN 1.00
    WHEN '24/7 Store E' THEN 1.15
  END
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Potatoes 1kg'
  AND s.name IN ('Day Store A', 'Day Store B', 'Day Store C', '24/7 Store E')
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- Cooking Oil: Only in Store E (€3.20)
INSERT INTO product_store_costs (product_id, store_id, wholesale_price)
SELECT p.id, s.id, 3.20
FROM products p
CROSS JOIN stores s
WHERE p.name = 'Cooking Oil 1L'
  AND s.name = '24/7 Store E'
ON CONFLICT (product_id, store_id) DO UPDATE
SET wholesale_price = EXCLUDED.wholesale_price;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the data was created correctly

SELECT 
  p.name as product,
  s.name as store,
  psc.wholesale_price,
  CASE 
    WHEN psc.wholesale_price = (
      SELECT MIN(psc2.wholesale_price) 
      FROM product_store_costs psc2 
      WHERE psc2.product_id = p.id
    ) THEN '⭐ CHEAPEST'
    ELSE ''
  END as cheapest
FROM products p
JOIN product_store_links psl ON p.id = psl.product_id
JOIN stores s ON psl.store_id = s.id
LEFT JOIN product_store_costs psc ON p.id = psc.product_id AND s.id = psc.store_id
WHERE p.name IN ('Milk 1L', 'Bread White', 'Eggs 12pcs', 'Chicken 1kg', 'Rice 1kg', 'Pasta 500g', 'Tomatoes 1kg', 'Onions 1kg', 'Potatoes 1kg', 'Cooking Oil 1L')
ORDER BY p.name, psc.wholesale_price;

