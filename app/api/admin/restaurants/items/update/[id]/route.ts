import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const itemId = Number(id);
  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json();

  const { error } = await adminSupabase
    .from("restaurant_items")
    .update({
      name: body.name,
      price: body.price,
      description: body.description,
      image_url: body.image_url,
    })
    .eq("id", itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
