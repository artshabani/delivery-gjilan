# Dummy Data Scripts

## Setup Instructions

1. **First, check your existing products:**
   ```sql
   SELECT id, name, price FROM products ORDER BY id;
   ```

2. **Update the SQL script:**
   - Open `scripts/dummy-data.sql`
   - Replace product IDs (1, 2, 3, 4, 5) with your actual product IDs
   - Or create test products first via the admin panel

3. **Run the script in Supabase SQL Editor:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `dummy-data.sql`
   - Adjust product IDs as needed
   - Run the script

4. **Verify the data:**
   - Check stores: `SELECT * FROM stores;`
   - Check links: `SELECT * FROM product_store_links;`
   - Check costs: `SELECT * FROM product_store_costs;`

## Test Scenarios

After running the script, test these scenarios in the Store Planning Test Dashboard:

1. **Single Store Test:**
   - Select products that are all in Store A
   - Should show 1 store needed

2. **Multiple Stores Test:**
   - Select products from different stores
   - Should show minimum number of stores needed

3. **Night Store Test:**
   - Test after 8 PM (if day stores close)
   - Should automatically use night stores

4. **Cheapest Store Test:**
   - Select a product available in multiple stores
   - Should show the cheapest store for that product

## Troubleshooting

- **No stores found:** Make sure you ran the stores INSERT statement
- **No products linked:** Check that product IDs match your actual products
- **No wholesale prices:** Verify product_store_costs inserts completed
- **Stores not showing as open:** Check the `is_open` flag and operating hours





