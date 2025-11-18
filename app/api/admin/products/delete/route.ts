import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Product ID is required for deletion." },
      { status: 400 }
    );
  }

  try {
    // 0. DELETE ORDER ITEMS (foreign key)
    const { error: orderItemError } = await supabase
      .from("order_items")
      .delete()
      .eq("product_id", id);

    if (orderItemError) {
      console.error("Order Item Deletion Error:", orderItemError);
      return NextResponse.json(
        { error: "Failed to clean related order items." },
        { status: 400 }
      );
    }

    // 1. DELETE STORE LINKS (CORRECTED TABLE NAME)
    const { error: linkError } = await supabase
      .from("product_stores") // <-- FIXED
      .delete()
      .eq("product_id", id);

    if (linkError) {
      console.error("Store Link Deletion Error:", linkError);
      return NextResponse.json(
        { error: "Failed to clean related store links." },
        { status: 400 }
      );
    }

    // 2. DELETE MAIN PRODUCT
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (productError) {
      console.error("Product Deletion Error:", productError);
      return NextResponse.json(
        { error: "Failed to delete product." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Unexpected Error:", e);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
