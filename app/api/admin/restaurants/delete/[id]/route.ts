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
      { error: "Missing restaurant id" },
      { status: 400 }
    );
  }

  const restId = Number(id);
  if (Number.isNaN(restId)) {
    return NextResponse.json(
      { error: "Invalid restaurant id" },
      { status: 400 }
    );
  }

  // 1. Get all item IDs for this restaurant
  const { data: items, error: itemsFetchError } = await adminSupabase
    .from("restaurant_items")
    .select("id")
    .eq("restaurant_id", restId);

  if (itemsFetchError) {
    console.error("ERROR fetching restaurant items:", itemsFetchError);
    return NextResponse.json(
      { error: "Failed to fetch restaurant items" },
      { status: 400 }
    );
  }

  const itemIds = items?.map((i) => i.id) || [];

  // 2. Delete order items related to these restaurant items
  if (itemIds.length > 0) {
    const { error: orderItemsDeleteError } = await adminSupabase
      .from("order_items")
      .delete()
      .in("restaurant_item_id", itemIds);

    if (orderItemsDeleteError) {
      console.error("ERROR deleting related order items:", orderItemsDeleteError);
      return NextResponse.json(
        { error: orderItemsDeleteError.message || "Failed to clean related order items" },
        { status: 400 }
      );
    }
  }

  // 3. Delete items
  const { error: itemDeleteError } = await adminSupabase
    .from("restaurant_items")
    .delete()
    .eq("restaurant_id", restId);

  if (itemDeleteError) {
    console.error("ERROR deleting restaurant items:", itemDeleteError);
    return NextResponse.json(
      { error: itemDeleteError.message || "Failed to delete items" },
      { status: 400 }
    );
  }

  // Delete restaurant
  const { error: restaurantDeleteError } = await adminSupabase
    .from("restaurants")
    .delete()
    .eq("id", restId);

  if (restaurantDeleteError) {
    console.error("ERROR deleting restaurant:", restaurantDeleteError);
    return NextResponse.json(
      { error: restaurantDeleteError.message || "Failed to delete restaurant" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
