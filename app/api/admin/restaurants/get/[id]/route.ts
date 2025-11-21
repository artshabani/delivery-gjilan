import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const restId = Number(id);
  if (Number.isNaN(restId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("restaurants")
    .select("*")
    .eq("id", restId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ restaurant: data });
}
