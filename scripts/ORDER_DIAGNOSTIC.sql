-- Comprehensive Order Diagnostic Query
-- Run this in Supabase SQL Editor to understand the order structure

-- 1. Check order_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 2. Check orders table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 3. Sample order_items with all relationships
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    oi.product_id,
    oi.restaurant_item_id,
    oi.item_type,
    oi.quantity,
    oi.price,
    oi.notes,
    oi.modifiers,
    -- Product data (if grocery)
    p.id as product_table_id,
    p.name as product_name,
    p.image_url as product_image,
    p.price as product_price,
    -- Restaurant item data (if restaurant)
    ri.id as restaurant_item_table_id,
    ri.name as restaurant_item_name,
    ri.image_url as restaurant_item_image,
    ri.price as restaurant_item_price
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN restaurant_items ri ON oi.restaurant_item_id = ri.id
ORDER BY oi.order_id DESC, oi.id
LIMIT 20;

-- 4. Full order with items (what the app should receive)
SELECT 
    o.id as order_id,
    o.created_at,
    o.total,
    o.status,
    o.user_id,
    up.first_name,
    up.last_name,
    up.email,
    -- Order items
    oi.id as order_item_id,
    oi.product_id,
    oi.restaurant_item_id,
    oi.item_type,
    oi.quantity,
    oi.price as item_price,
    oi.notes,
    -- Product info
    p.name as product_name,
    p.image_url as product_image,
    p.price as product_price,
    -- Restaurant item info
    ri.name as restaurant_item_name,
    ri.image_url as restaurant_item_image,
    ri.price as restaurant_item_price
FROM orders o
LEFT JOIN user_profiles up ON o.user_id = up.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'grocery'
LEFT JOIN restaurant_items ri ON oi.restaurant_item_id = ri.id AND oi.item_type = 'restaurant'
ORDER BY o.created_at DESC, oi.id
LIMIT 10;

-- 5. Check for any orphaned order_items (missing products/restaurant_items)
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.restaurant_item_id,
    oi.item_type,
    CASE 
        WHEN oi.item_type = 'grocery' AND oi.product_id IS NOT NULL AND p.id IS NULL THEN 'MISSING PRODUCT'
        WHEN oi.item_type = 'restaurant' AND oi.restaurant_item_id IS NOT NULL AND ri.id IS NULL THEN 'MISSING RESTAURANT ITEM'
        WHEN oi.item_type = 'grocery' AND oi.product_id IS NULL THEN 'NULL PRODUCT_ID'
        WHEN oi.item_type = 'restaurant' AND oi.restaurant_item_id IS NULL THEN 'NULL RESTAURANT_ITEM_ID'
        ELSE 'OK'
    END as status
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN restaurant_items ri ON oi.restaurant_item_id = ri.id
WHERE 
    (oi.item_type = 'grocery' AND (oi.product_id IS NULL OR p.id IS NULL))
    OR 
    (oi.item_type = 'restaurant' AND (oi.restaurant_item_id IS NULL OR ri.id IS NULL));

-- 6. Count orders and items
SELECT 
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(oi.id) as total_order_items,
    COUNT(DISTINCT oi.product_id) as unique_products,
    COUNT(DISTINCT oi.restaurant_item_id) as unique_restaurant_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id;




