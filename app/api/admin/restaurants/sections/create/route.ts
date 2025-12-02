import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    const body = await req.json();
    const { restaurant_id, name, emoji } = body;

    if (!restaurant_id || !name) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get max sort_order
    const { data: maxData } = await adminSupabase
        .from("restaurant_sections")
        .select("sort_order")
        .eq("restaurant_id", restaurant_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxData?.sort_order || 0) + 1;

    const { data, error } = await adminSupabase
        .from("restaurant_sections")
        .insert({
            restaurant_id,
            name,
            emoji: emoji || "🍽️",
            sort_order: nextOrder,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ section: data });
}
