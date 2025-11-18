// lib/productFetch.ts

import { supabase } from '@/lib/supabase';
// Assuming your Product type is imported or defined elsewhere
// interface Product { id: number; name: string; ... }

interface ProductLink {
  product: any; // Using 'any' to represent your Product type temporarily
}

/**
 * Fetches products that are available from currently open stores.
 * It uses the 'get_open_store_ids' RPC function to filter by working hours.
 * @returns An array of unique product objects.
 */
export const fetchAvailableProducts = async () => {
  // 1. Call the PostgreSQL function to get the IDs of stores open right now
  const { data: openStoreIds, error: rpcError } = await supabase.rpc('get_open_store_ids');

  if (rpcError) {
    console.error("RPC Error fetching open stores:", rpcError);
    return [];
  }

  // Supabase RPC returns a list of numbers; cast it
  const storeIds: number[] = openStoreIds as number[] || [];

  // If no stores are open, return immediately
  if (storeIds.length === 0) {
    return [];
  }
  
  // 2. Fetch all products linked to the currently open stores
  const { data: links, error: fetchError } = await supabase
    .from('product_store_links')
    // Select the full product details from the 'products' table via the product_id foreign key
    .select('product:products(*)') 
    .in('store_id', storeIds); // Filter links by the open store IDs

  if (fetchError) {
    console.error("Error fetching linked products:", fetchError);
    return [];
  }

  // 3. Flatten and deduplicate the result. 
  // We use a Map to ensure we return only unique product items.
  const uniqueProductsMap = new Map<number, any>();

  links.forEach((link: ProductLink) => {
      if (link.product) {
          // You might need to cast link.product.id to number here if your Product type uses number for id
          uniqueProductsMap.set(link.product.id, link.product);
      }
  });
  
  return Array.from(uniqueProductsMap.values());
};