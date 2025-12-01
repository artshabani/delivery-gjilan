import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await adminSupabase
    .from("restaurants")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true }); // fallback for items with same sort_order

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ restaurants: data });
}
