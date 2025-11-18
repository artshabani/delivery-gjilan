import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensure you are using the service role key for transaction safety
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();

  const { id } = body;

  if (!id) {
     return NextResponse.json({ error: "Product ID is required for deletion." }, { status: 400 });
  }
  
  try {
    // 0. IMPORTANT: DELETE related order items from 'order_items' first.
    // This removes the foreign key dependency on the product, which is often the cause of deletion failures.
    const { error: orderItemError } = await supabase
      .from("order_items")
      .delete()
      .eq("product_id", id);

    if (orderItemError) {
      console.error("Order Item Deletion Error:", orderItemError);
      return NextResponse.json({ error: "Failed to clean up related order items." }, { status: 400 });
    }
      
    // 1. DELETE related links from 'product_store_links'
    const { error: linkError } = await supabase
      .from("product_store_links")
      .delete()
      .eq("product_id", id);

    if (linkError) {
      console.error("Link Deletion Error:", linkError);
      return NextResponse.json({ error: "Failed to clean up store links before deleting product." }, { status: 400 });
    }
      
    // 2. DELETE the product itself from the 'products' table
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (productError) {
      console.error("Product Deletion Error:", productError);
      return NextResponse.json({ error: "Failed to delete product." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
    
  } catch (e) {
    console.error("Unexpected Error during product deletion:", e);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}