import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("restaurant_id");

  const { data, error } = await supabase
    .from("restaurant_items")
    .select("*")
    .eq("restaurant_id", id)
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data });
}
