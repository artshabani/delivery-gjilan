import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, image_url, category_id, is_available } = body;

    if (!name || !price || !category_id) {
      return NextResponse.json({ error: "Name, price, and category are required" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("products")
      .insert([{
        name,
        description,
        price,
        image_url,
        category_id,
        is_available: is_available ?? true
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ product: data });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}