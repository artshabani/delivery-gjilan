import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if category has subcategories
  const { data: subcategories } = await adminSupabase
    .from("product_categories")
    .select("id")
    .eq("parent_id", id);

  if (subcategories && subcategories.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete category with subcategories. Delete subcategories first." },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase
    .from("product_categories")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
