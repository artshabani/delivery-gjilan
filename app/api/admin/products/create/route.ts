import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure you are using the service role key for transaction safety
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();

  // 1. Destructure all expected fields, including the new store_ids
  const { name, price, category_id, image_url, store_ids, in_stock = true } = body;

  // 2. Validation: Ensure required fields (including store_ids) are present
  if (!name || !price || !category_id || !store_ids || store_ids.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields (name, price, category_id, store_ids must be provided)" },
      { status: 400 }
    );
  }

  try {
    // 3. INSERT the new product and retrieve its generated ID
    const { data: productData, error: productError } = await supabase
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
    const { error: linksError } = await supabase
      .from("product_store_links")
      .insert(linksPayload);
      
    if (linksError) {
      console.error("Links Insert Error (requires manual cleanup):", linksError);
      return NextResponse.json({ error: "Product created but failed to link to stores." }, { status: 400 });
    }

    // 6. Success
    return NextResponse.json({ success: true, product_id: newProductId });
    
  } catch (e) {
    console.error("Unexpected Error during product creation:", e);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}