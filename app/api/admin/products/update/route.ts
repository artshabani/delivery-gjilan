import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure you are using the service role key for transaction safety
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();

  // Destructure product fields, including the critical store_ids array
  const { id, name, price, category_id, image_url, in_stock, store_ids } = body;

  // Validation: Ensure required fields are present
  if (!id || !name || !price || !category_id || !store_ids) {
    return NextResponse.json(
      { error: "Missing required fields (id, name, price, category_id, store_ids must be provided)" },
      { status: 400 }
    );
  }

  try {
    // 1. UPDATE the product details in the 'products' table
    const { error: productError } = await supabase
      .from("products")
      .update({
        name,
        price,
        category_id,
        image_url,
        in_stock,
      })
      .eq("id", id); // Target the specific product ID

    if (productError) {
      console.error("Product Update Error:", productError);
      return NextResponse.json({ error: "Failed to update product details." }, { status: 400 });
    }
    
    // 2. DELETE existing product-store links
    const { error: deleteError } = await supabase
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
    
    const { error: linksError } = await supabase
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