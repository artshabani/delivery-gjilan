import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await adminSupabase.from("restaurant_items").insert({
    restaurant_id: body.restaurant_id,
    name: body.name,
    price: body.price,
    description: body.description || "",
    image_url: body.image_url || "",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
