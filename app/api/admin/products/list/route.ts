import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await adminSupabase
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true }); // fallback

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ products: data });
}
