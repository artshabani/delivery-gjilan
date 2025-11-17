import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabase.from("restaurant_items").insert({
    restaurant_id: body.restaurant_id,
    name: body.name,
    price: body.price,
    description: body.description || "",
    image_url: body.image_url || "",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
