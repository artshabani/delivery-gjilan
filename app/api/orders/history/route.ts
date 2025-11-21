import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("orders")
        .select(
            `
      id,
      total,
      status,
      created_at,
      eta_minutes,
      out_for_delivery_at,
      order_items (
        id,
        quantity,
        price,
        notes,
        product:products(id,name,image_url),
        restaurant_item:restaurant_items(id,name,image_url)
      )
    `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching order history:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ orders: data });
}
