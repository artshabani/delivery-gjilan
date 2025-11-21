import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await adminSupabase
    .from("site_status")
    .select("is_closed")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[admin/site_status] read error:", error);
    return NextResponse.json({ closed: false });
  }

  return NextResponse.json({ closed: Boolean(data?.is_closed) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const closed = Boolean(body?.closed);

  const { error } = await adminSupabase
    .from("site_status")
    .upsert({ id: 1, is_closed: closed }, { onConflict: "id" });

  if (error) {
    console.error("[admin/site_status] write error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, closed });
}
