import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const data = await req.json();

  const { error } = await adminSupabase.from("restaurants").insert({
    name: data.name,
    description: data.description || "",
    image_url: data.image_url || "",
    is_active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
