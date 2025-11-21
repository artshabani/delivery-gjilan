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
