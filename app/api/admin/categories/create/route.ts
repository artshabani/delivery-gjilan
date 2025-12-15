import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { name, icon_url, parent_id } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Get max sort_order for the same parent level
  const { data: maxOrderData } = await adminSupabase
    .from("product_categories")
    .select("sort_order")
    .eq("parent_id", parent_id || null)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = maxOrderData && maxOrderData.length > 0 
    ? maxOrderData[0].sort_order + 1 
    : 0;

  const { data, error } = await adminSupabase
    .from("product_categories")
    .insert([
      {
        name,
        icon_url: icon_url || null,
        parent_id: parent_id || null,
        sort_order: nextSortOrder,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}
