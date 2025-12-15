import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { categories } = await request.json();

  if (!categories || !Array.isArray(categories)) {
    return NextResponse.json({ error: "Categories array is required" }, { status: 400 });
  }

  // Update sort_order for each category
  const updates = categories.map((cat: { id: number; sort_order: number }) =>
    adminSupabase
      .from("product_categories")
      .update({ sort_order: cat.sort_order })
      .eq("id", cat.id)
  );

  const results = await Promise.all(updates);
  
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
