import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await adminSupabase
    .from("site_status")
    .select("is_closed, transportation_fee")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[admin/site_status] read error:", error);
    return NextResponse.json({ closed: false, transportation_fee: 0 });
  }

  return NextResponse.json({ 
    closed: Boolean(data?.is_closed),
    transportation_fee: Number(data?.transportation_fee || 0)
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const updateData: { is_closed?: boolean; transportation_fee?: number } = {};
  
  if (body?.closed !== undefined) {
    updateData.is_closed = Boolean(body.closed);
  }
  
  if (body?.transportation_fee !== undefined) {
    updateData.transportation_fee = Number(body.transportation_fee);
  }

  const { error } = await adminSupabase
    .from("site_status")
    .upsert({ id: 1, ...updateData }, { onConflict: "id" });

  if (error) {
    console.error("[admin/site_status] write error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...updateData });
}
