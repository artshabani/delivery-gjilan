import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const data = await req.json();

  const { name, description, image_url, category } = data;

  // Basic required fields
  if (!name || !category) {
    return NextResponse.json(
      { error: "Name and category are required" },
      { status: 400 }
    );
  }

  // ⛔ Removed the validCategories validation completely

  const { error } = await adminSupabase.from("restaurants").insert({
    name,
    description: description || "",
    image_url: image_url || "",
    category,
    is_active: true,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
