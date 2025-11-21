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

    // Get current status before updating
    const { data: currentOrder } = await adminSupabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    const oldStatus = currentOrder?.status || null;

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

    // Log the status change (trigger will also do this, but this is a backup)
    if (oldStatus !== status) {
      await adminSupabase.from("order_status_logs").insert({
        order_id: id,
        old_status: oldStatus,
        new_status: status,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
