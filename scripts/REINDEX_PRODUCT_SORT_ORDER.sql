-- Reindex products.sort_order per category starting from 0
-- Run this in Supabase SQL editor or psql once.

WITH ranked AS (
  SELECT
    id,
    category_id,
    ROW_NUMBER() OVER (
      PARTITION BY category_id
      ORDER BY sort_order NULLS LAST, id
    ) - 1 AS new_sort
  FROM products
)
UPDATE products p
SET sort_order = r.new_sort
FROM ranked r
WHERE p.id = r.id;

-- Optional: set uncategorized products (category_id IS NULL) to 0
UPDATE products
SET sort_order = 0
WHERE category_id IS NULL;