import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();

  // 1. Destructure all expected fields, including the new store_ids and store_costs
  const { name, price, category_id, image_url, store_ids, store_costs, in_stock = true } = body;

  // 2. Validation: Ensure required fields (including store_ids) are present
  if (!name || !price || !category_id || !store_ids || store_ids.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields (name, price, category_id, store_ids must be provided)" },
      { status: 400 }
    );
  }

  try {
    // 3. INSERT the new product and retrieve its generated ID
    const { data: productData, error: productError } = await adminSupabase
      .from("products")
      .insert({
        name,
        price,
        category_id,
        image_url,
        in_stock,
      })
      .select("id") // Select the new product's ID for the link table
      .single();

    if (productError || !productData) {
      console.error("Product Insert Error:", productError);
      return NextResponse.json({ error: "Failed to create product." }, { status: 400 });
    }

    const newProductId = productData.id;

    // 4. PREPARE the links payload
    const linksPayload = store_ids.map((storeId: number) => ({
      product_id: newProductId,
      store_id: storeId,
    }));
    
    // 5. INSERT the links into product_store_links
    const { error: linksError } = await adminSupabase
      .from("product_store_links")
      .insert(linksPayload);
      
    if (linksError) {
      console.error("Links Insert Error (requires manual cleanup):", linksError);
      return NextResponse.json({ error: "Product created but failed to link to stores." }, { status: 400 });
    }

    // 6. INSERT wholesale prices into product_store_costs
    if (store_costs && Array.isArray(store_costs) && store_costs.length > 0) {
      const costsPayload = store_costs.map((cost: { store_id: number; wholesale_price: number }) => ({
        product_id: newProductId,
        store_id: cost.store_id,
        wholesale_price: cost.wholesale_price,
      }));

      const { error: costsError } = await adminSupabase
        .from("product_store_costs")
        .insert(costsPayload);

      if (costsError) {
        console.error("Costs Insert Error:", costsError);
        // Don't fail the request, but log the error
        // The product and links are already created
      }
    }

    // 7. Success
    return NextResponse.json({ success: true, product_id: newProductId });
    
  } catch (e) {
    console.error("Unexpected Error during product creation:", e);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}