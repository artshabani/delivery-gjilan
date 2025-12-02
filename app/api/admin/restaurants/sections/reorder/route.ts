import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    const body = await req.json();
    const { restaurant_id, section_ids } = body;

    if (!restaurant_id || !section_ids || !Array.isArray(section_ids)) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        // Update sort_order for each section
        const promises = section_ids.map((id, index) =>
            adminSupabase
                .from("restaurant_sections")
                .update({ sort_order: index })
                .eq("id", id)
                .eq("restaurant_id", restaurant_id)
        );

        await Promise.all(promises);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
