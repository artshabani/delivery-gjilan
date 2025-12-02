import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const restaurant_id = searchParams.get("restaurant_id");

    if (!restaurant_id) {
        return NextResponse.json({ error: "Missing restaurant_id" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
        .from("restaurant_sections")
        .select("*")
        .eq("restaurant_id", restaurant_id)
        .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ sections: data });
}
