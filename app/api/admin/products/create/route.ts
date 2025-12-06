import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, image_url, category_id, store_ids, store_costs, is_restaurant_extra, restaurant_price } = body;

    if (!name || !price || !category_id) {
      return NextResponse.json({ error: "Name, price, and category are required" }, { status: 400 });
    }

    // 1. Create Product
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .insert([{
        name,
        price,
        image_url,
        category_id,
        is_restaurant_extra: is_restaurant_extra ?? false,
        restaurant_price
      }])
      .select()
      .single();

    if (productError) throw productError;

    const productId = product.id;

    // 2. Link to Stores (product_store_links)
    if (store_ids && store_ids.length > 0) {
      const links = store_ids.map((storeId: number) => ({
        product_id: productId,
        store_id: storeId
      }));

      const { error: linksError } = await adminSupabase
        .from("product_store_links")
        .insert(links);

      if (linksError) {
        console.error("Error linking stores:", linksError);
        // We don't throw here to avoid failing the whole request if just linking fails, 
        // but ideally we should handle this better (transaction).
      }
    }

    // 3. Add Wholesale Costs (product_store_costs)
    if (store_costs && store_costs.length > 0) {
      const costs = store_costs.map((cost: any) => ({
        product_id: productId,
        store_id: cost.store_id,
        wholesale_price: cost.wholesale_price
      }));

      const { error: costsError } = await adminSupabase
        .from("product_store_costs")
        .insert(costs);

      if (costsError) {
        console.error("Error adding costs:", costsError);
      }
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}