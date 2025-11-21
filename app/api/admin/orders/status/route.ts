import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, status, eta_minutes } = body || {};

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    const payload: any = { status };

    if (status === "out_for_delivery") {
      payload.eta_minutes =
        eta_minutes !== undefined && eta_minutes !== null
          ? Number(eta_minutes)
          : null;
      payload.out_for_delivery_at = new Date().toISOString();
    } else {
      payload.eta_minutes = null;
      payload.out_for_delivery_at = null;
    }

    const { error } = await adminSupabase
      .from("orders")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Order status update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
