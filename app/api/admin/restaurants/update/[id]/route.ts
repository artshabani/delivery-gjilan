import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const restId = Number(id);
  if (Number.isNaN(restId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();

  const { error } = await adminSupabase
    .from("restaurants")
    .update({
      name: body.name,
      description: body.description || "",
      image_url: body.image_url || "",
      category: body.category || null,
      is_active: body.is_active ?? true,
      opens_at: body.opens_at || null,
      closes_at: body.closes_at || null,
      is_open_24_7: body.is_open_24_7 ?? false,
    })
    .eq("id", restId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

