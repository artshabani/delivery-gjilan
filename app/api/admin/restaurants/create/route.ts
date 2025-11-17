import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const data = await req.json();

  const { error } = await supabase.from("restaurants").insert({
    name: data.name,
    description: data.description || "",
    image_url: data.image_url || "",
    is_active: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
