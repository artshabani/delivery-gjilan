import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json(
      { error: "Missing item id" },
      { status: 400 }
    );
  }

  const itemId = Number(id);
  if (Number.isNaN(itemId)) {
    return NextResponse.json(
      { error: "Invalid item id" },
      { status: 400 }
    );
  }

  // 1. Delete related order items (foreign key constraint)
  const { error: orderItemError } = await adminSupabase
    .from("order_items")
    .delete()
    .eq("restaurant_item_id", itemId);

  if (orderItemError) {
    console.error("ERROR deleting related order items:", orderItemError);
    // We don't return here because sometimes the column might not exist or other issues, 
    // but usually we should. However, if the column name is wrong, this will fail.
    // Let's assume it's correct. If it fails, we return 400.
    return NextResponse.json(
      { error: orderItemError.message || "Failed to clean related order items" },
      { status: 400 }
    );
  }

  // 2. Delete the item itself
  const { error } = await adminSupabase
    .from("restaurant_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("ERROR deleting item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete item" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
