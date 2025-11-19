import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();

  // Destructure product fields, NOW INCLUDING the optional sale_price
  const { id, name, price, category_id, image_url, in_stock, sale_price, store_ids } = body;

  // Validation: Ensure required fields are present (sale_price is optional)
  if (!id || !name || !price || !category_id || !store_ids) {
    return NextResponse.json(
      { error: "Missing required fields (id, name, price, category_id, store_ids must be provided)" },
      { status: 400 }
    );
  }

  try {
    // Determine the final value for sale_price:
    // 1. If it's explicitly passed as empty string or null (to clear the sale), set it to null.
    // 2. Otherwise, use the provided value.
    const final_sale_price = (sale_price === "" || sale_price === null) ? null : sale_price;
    
    // 1. UPDATE the product details in the 'products' table
    const { error: productError } = await adminSupabase
      .from("products")
      .update({
        name,
        price,
        category_id,
        image_url,
        in_stock,
        // --- ADDED SALE PRICE ---
        sale_price: final_sale_price, 
        // ------------------------
      })
      .eq("id", id); // Target the specific product ID

    if (productError) {
      console.error("Product Update Error:", productError);
      return NextResponse.json({ error: "Failed to update product details." }, { status: 400 });
    }
    
    // 2. DELETE existing product-store links
    const { error: deleteError } = await adminSupabase
        .from("product_store_links")
        .delete()
        .eq("product_id", id);
        
    if (deleteError) {
        console.error("Links Delete Error:", deleteError);
        return NextResponse.json({ error: "Failed to clear old store links." }, { status: 400 });
    }

    // 3. PREPARE and INSERT the new product-store links
    const linksPayload = store_ids.map((storeId: number) => ({
      product_id: id,
      store_id: storeId,
    }));
    
    const { error: linksError } = await adminSupabase
      .from("product_store_links")
      .insert(linksPayload);
      
    if (linksError) {
      console.error("Links Insert Error:", linksError);
      return NextResponse.json({ error: "Product updated but failed to set new store links." }, { status: 400 });
    }

    // 4. Success
    return NextResponse.json({ success: true, product_id: id });
    
  } catch (e) {
    console.error("Unexpected Error during product update:", e);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}