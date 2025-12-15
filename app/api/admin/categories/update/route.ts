import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { id, name, icon_url, parent_id } = await request.json();

  if (!id || !name) {
    return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("product_categories")
    .update({
      name,
      icon_url: icon_url || null,
      parent_id: parent_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ category: data });
}
