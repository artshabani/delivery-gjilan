import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, price, image_url, category_id, store_ids, store_costs } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // 1. Update Product
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .update({
        name,
        price,
        image_url,
        category_id
      })
      .eq("id", id)
      .select()
      .single();

    if (productError) throw productError;

    // 2. Update Store Links
    // First delete existing links
    const { error: deleteLinksError } = await adminSupabase
      .from("product_store_links")
      .delete()
      .eq("product_id", id);

    if (deleteLinksError) {
      console.error("Error deleting old store links:", deleteLinksError);
    } else if (store_ids && store_ids.length > 0) {
      // Insert new links
      const links = store_ids.map((storeId: number) => ({
        product_id: id,
        store_id: storeId
      }));

      const { error: insertLinksError } = await adminSupabase
        .from("product_store_links")
        .insert(links);

      if (insertLinksError) {
        console.error("Error inserting new store links:", insertLinksError);
      }
    }

    // 3. Update Wholesale Costs
    // First delete existing costs
    const { error: deleteCostsError } = await adminSupabase
      .from("product_store_costs")
      .delete()
      .eq("product_id", id);

    if (deleteCostsError) {
      console.error("Error deleting old costs:", deleteCostsError);
    } else if (store_costs && store_costs.length > 0) {
      // Insert new costs
      const costs = store_costs.map((cost: any) => ({
        product_id: id,
        store_id: cost.store_id,
        wholesale_price: cost.wholesale_price
      }));

      const { error: insertCostsError } = await adminSupabase
        .from("product_store_costs")
        .insert(costs);

      if (insertCostsError) {
        console.error("Error inserting new costs:", insertCostsError);
      }
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}