import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("restaurant_id");

  const { data, error } = await adminSupabase
    .from("restaurant_items")
    .select("*")
    .eq("restaurant_id", id)
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data });
}
